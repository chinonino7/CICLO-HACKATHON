// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title CICLO — ahorro comunitario rotativo (ROSCA) en Celo
/// @notice Registro unico: un solo contrato custodia el dinero de todos los
///         ciclos. Cada ronda un miembro recibe el pozo completo en la fecha
///         de corte. El creador puede cancelar un ciclo que no avanza y los
///         aportes de la ronda en curso se devuelven.
contract Ciclo {
    uint8 public constant MAX_MEMBERS = 12;

    enum Frequency { Biweekly, Monthly }
    enum OrderMode { AdminDefined, Random }

    struct Group {
        address admin;
        string name;
        address token; // cUSD (USDm) o cCOP (COPm) — fijo por grupo
        uint256 amount; // aporte fijo por turno
        Frequency frequency;
        OrderMode orderMode;
        uint8 size; // cupos del ciclo (2..12)
        uint8 round; // ronda actual (0..N-1)
        uint64 roundStart; // inicio de la ronda; el pozo se libera en el corte de calendario
        bool started;
        bool cancelled;
    }

    Group[] private groups;

    // Estado auxiliar (mappings anidados no caben en structs en arrays)
    mapping(uint256 => address[]) private members; // groupId => miembros (<= 12)
    mapping(uint256 => uint8[]) private payoutOrder; // groupId => orden de cobro
    mapping(uint256 => mapping(uint8 => mapping(address => bool))) public paid; // group => round => member => pago
    mapping(uint256 => mapping(address => bool)) private isMember;

    event GroupCreated(uint256 indexed id, address indexed admin, address token, uint256 amount);
    event Joined(uint256 indexed id, address indexed member);
    event OrderSet(uint256 indexed id);
    event Started(uint256 indexed id);
    event Contributed(uint256 indexed id, uint8 indexed round, address indexed member, uint256 amount);
    event PotClaimed(uint256 indexed id, uint8 indexed round, address indexed beneficiary, uint256 amount);
    event Cancelled(uint256 indexed id, uint8 refunds);

    modifier onlyAdmin(uint256 id) {
        require(msg.sender == groups[id].admin, "not admin");
        _;
    }

    function createGroup(
        string calldata name,
        address token,
        uint256 amount,
        Frequency frequency,
        OrderMode orderMode,
        uint8 size
    ) external returns (uint256 id) {
        require(amount > 0, "amount=0");
        require(token != address(0), "token=0");
        require(size >= 2 && size <= MAX_MEMBERS, "size 2..12");

        groups.push(Group(msg.sender, name, token, amount, frequency, orderMode, size, 0, 0, false, false));
        id = groups.length - 1;

        members[id].push(msg.sender);
        isMember[id][msg.sender] = true;

        emit GroupCreated(id, msg.sender, token, amount);
        emit Joined(id, msg.sender);
    }

    function join(uint256 id) external {
        Group storage g = groups[id];
        require(!g.cancelled, "cancelled");
        require(!g.started, "started");
        require(members[id].length < g.size, "full");
        require(!isMember[id][msg.sender], "already member");

        members[id].push(msg.sender);
        isMember[id][msg.sender] = true;
        emit Joined(id, msg.sender);
    }

    /// @notice Admin fija el orden de cobro (solo modo AdminDefined, antes de iniciar).
    function setOrder(uint256 id, uint8[] calldata order) external onlyAdmin(id) {
        Group storage g = groups[id];
        require(!g.cancelled, "cancelled");
        require(!g.started, "started");
        require(g.orderMode == OrderMode.AdminDefined, "not admin mode");
        uint256 n = members[id].length;
        require(order.length == n, "bad length");

        bool[] memory seen = new bool[](n);
        for (uint256 i = 0; i < n; i++) {
            uint8 p = order[i];
            require(p < n, "index oob");
            require(!seen[p], "dup index");
            seen[p] = true;
        }
        payoutOrder[id] = order;
        emit OrderSet(id);
    }

    function start(uint256 id) external onlyAdmin(id) {
        Group storage g = groups[id];
        require(!g.cancelled, "cancelled");
        require(!g.started, "started");
        uint256 n = members[id].length;
        require(n >= 2, "need >=2");

        if (g.orderMode == OrderMode.Random) {
            // Aleatoriedad pseudo: block.prevrandao. Suficiente para MVP/demo,
            // NO para produccion con dinero real (manipulable por validadores).
            uint8[] memory order = new uint8[](n);
            for (uint8 i = 0; i < n; i++) order[i] = i;
            for (uint256 i = n - 1; i > 0; i--) {
                uint256 j = uint256(keccak256(abi.encodePacked(block.prevrandao, id, i))) % (i + 1);
                (order[i], order[j]) = (order[j], order[i]);
            }
            payoutOrder[id] = order;
        } else {
            require(payoutOrder[id].length == n, "order not set");
        }

        g.started = true;
        g.roundStart = uint64(block.timestamp);
        emit Started(id);
    }

    function contribute(uint256 id) external {
        Group storage g = groups[id];
        require(!g.cancelled, "cancelled");
        require(g.started, "not started");
        require(isMember[id][msg.sender], "not member");
        require(!paid[id][g.round][msg.sender], "already paid");

        require(IERC20(g.token).transferFrom(msg.sender, address(this), g.amount), "transfer failed");
        paid[id][g.round][msg.sender] = true;
        emit Contributed(id, g.round, msg.sender, g.amount);
    }

    /// @notice Libera el pozo al beneficiario de la ronda. Solo a partir de la fecha
    ///         de corte (dia 15 / fin de mes, UTC) y con la ronda completamente fondeada.
    ///         Cualquier miembro puede disparar el pago; los fondos siempre van al beneficiario.
    function claimPot(uint256 id) external {
        Group storage g = groups[id];
        require(!g.cancelled, "cancelled");
        require(g.started, "not started");
        require(isMember[id][msg.sender], "not member");
        require(block.timestamp >= roundDeadline(id), "aun no es fecha de pago");

        address[] storage mem = members[id];
        uint8 round = g.round;
        require(round < mem.length, "ciclo terminado");

        address beneficiary = mem[payoutOrder[id][round]];

        // Verifica que la ronda este completamente fondeada
        for (uint256 i = 0; i < mem.length; i++) {
            require(paid[id][round][mem[i]], "ronda incompleta");
        }

        uint256 pot = g.amount * mem.length;
        g.round = round + 1;
        g.roundStart = uint64(block.timestamp);

        require(IERC20(g.token).transfer(beneficiary, pot), "transfer failed");
        emit PotClaimed(id, round, beneficiary, pot);
    }

    /// @notice El creador cancela un ciclo que no se llenó o que quedó trabado.
    ///         Antes de iniciar: solo se marca cancelado (aún no hay depósitos).
    ///         Iniciado con ronda incompleta: se devuelve el aporte de la ronda
    ///         en curso a quienes ya habían depositado. Las rondas pasadas ya
    ///         fueron distribuidas completas, no se tocan.
    function cancel(uint256 id) external onlyAdmin(id) {
        Group storage g = groups[id];
        require(!g.cancelled, "cancelled");

        uint8 refunds = 0;
        if (g.started) {
            address[] storage mem = members[id];
            require(g.round < mem.length, "ciclo terminado");

            // Si la ronda esta completa, el pozo le pertenece al beneficiario:
            // debe retirarse con claimPot, no cancelarse.
            bool full = true;
            for (uint256 i = 0; i < mem.length; i++) {
                if (!paid[id][g.round][mem[i]]) { full = false; break; }
            }
            require(!full, "ronda completa");

            for (uint256 i = 0; i < mem.length; i++) {
                if (paid[id][g.round][mem[i]]) {
                    paid[id][g.round][mem[i]] = false;
                    require(IERC20(g.token).transfer(mem[i], g.amount), "refund failed");
                    refunds++;
                }
            }
        }

        g.cancelled = true;
        emit Cancelled(id, refunds);
    }

    // ---- Fechas de corte (calendario, UTC) ----
    // Quincenal: dia 15 y ultimo dia del mes. Mensual: ultimo dia del mes.
    // El corte es a las 23:59:59 UTC del dia correspondiente.

    /// @notice Fecha (timestamp UTC) en la que se libera el pozo de la ronda actual.
    function roundDeadline(uint256 id) public view returns (uint256) {
        Group storage g = groups[id];
        require(g.started, "not started");
        return _nextBoundary(uint256(g.roundStart), g.frequency == Frequency.Biweekly);
    }

    /// @dev Proximo corte estrictamente despues de `ts`.
    function _nextBoundary(uint256 ts, bool biweekly) internal pure returns (uint256) {
        (uint256 y, uint256 m, uint256 d) = _civilFromDays(ts / 86400);
        uint256 last = _daysInMonth(y, m);
        uint256 by = y;
        uint256 bm = m;
        uint256 bd;
        if (biweekly) {
            if (d < 15) {
                bd = 15;
            } else if (d < last) {
                bd = last;
            } else {
                if (m == 12) { by = y + 1; bm = 1; } else { bm = m + 1; }
                bd = 15;
            }
        } else {
            if (d < last) {
                bd = last;
            } else {
                if (m == 12) { by = y + 1; bm = 1; } else { bm = m + 1; }
                bd = _daysInMonth(by, bm);
            }
        }
        return _daysFromCivil(by, bm, bd) * 86400 + 86399; // 23:59:59 UTC
    }

    /// @dev Algoritmo de Howard Hinnant (dias desde epoch -> fecha civil).
    function _civilFromDays(uint256 z) internal pure returns (uint256 y, uint256 m, uint256 d) {
        z += 719468;
        uint256 era = z / 146097;
        uint256 doe = z - era * 146097;
        uint256 yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        uint256 mp = (5 * doy + 2) / 153;
        d = doy - (153 * mp + 2) / 5 + 1;
        m = mp < 10 ? mp + 3 : mp - 9;
        y = yoe + era * 400 + (m <= 2 ? 1 : 0);
    }

    /// @dev Fecha civil -> dias desde epoch.
    function _daysFromCivil(uint256 y, uint256 m, uint256 d) internal pure returns (uint256) {
        if (m <= 2) y -= 1;
        uint256 era = y / 400;
        uint256 yoe = y - era * 400;
        uint256 mp = m > 2 ? m - 3 : m + 9;
        uint256 doy = (153 * mp + 2) / 5 + d - 1;
        uint256 doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
        return era * 146097 + doe - 719468;
    }

    function _daysInMonth(uint256 y, uint256 m) internal pure returns (uint256) {
        if (m == 2) return _isLeap(y) ? 29 : 28;
        if (m == 4 || m == 6 || m == 9 || m == 11) return 30;
        return 31;
    }

    function _isLeap(uint256 y) internal pure returns (bool) {
        return (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
    }

    // ---- Vistas ----

    struct Info {
        address admin;
        string name;
        address token;
        uint256 amount;
        uint8 frequency;
        uint8 orderMode;
        uint8 size;
        uint8 round;
        uint64 roundStart;
        bool started;
        bool cancelled;
        address[] members;
        uint8[] payoutOrder;
    }

    /// @notice Todo el estado de un ciclo en una sola llamada RPC.
    function getInfo(uint256 id) external view returns (Info memory) {
        Group storage g = groups[id];
        return Info(
            g.admin,
            g.name,
            g.token,
            g.amount,
            uint8(g.frequency),
            uint8(g.orderMode),
            g.size,
            g.round,
            g.roundStart,
            g.started,
            g.cancelled,
            members[id],
            payoutOrder[id]
        );
    }

    function groupsCount() external view returns (uint256) {
        return groups.length;
    }

    function getMembers(uint256 id) external view returns (address[] memory) {
        return members[id];
    }

    function getPayoutOrder(uint256 id) external view returns (uint8[] memory) {
        return payoutOrder[id];
    }

    function hasPaid(uint256 id, uint8 round, address member) external view returns (bool) {
        return paid[id][round][member];
    }

    function currentBeneficiary(uint256 id) external view returns (address) {
        Group storage g = groups[id];
        if (!g.started || g.cancelled || g.round >= members[id].length) return address(0);
        return members[id][payoutOrder[id][g.round]];
    }
}
