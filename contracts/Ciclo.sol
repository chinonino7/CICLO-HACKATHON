// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title CICLO — un ahorro comunitario rotativo (ROSCA) con contrato propio
/// @notice Cada ciclo es SU PROPIO contrato: custodia los depositos de sus
///         miembros y los distribuye por turnos en las fechas de corte.
///         Se despliega via CicloFactory al crear el ciclo.
contract Ciclo {
    uint8 public constant MAX_MEMBERS = 12;

    enum Frequency { Biweekly, Monthly }
    enum OrderMode { AdminDefined, Random }

    address public admin;
    string public name;
    address public token; // cUSD (USDm) o cCOP (COPm) — fijo por ciclo
    uint256 public amount; // aporte fijo por turno
    Frequency public frequency;
    OrderMode public orderMode;
    uint8 public size; // cupos del ciclo (2..12)
    uint8 public round; // ronda actual (0..N-1)
    uint64 public roundStart; // inicio de la ronda; el pozo se libera en el corte de calendario
    bool public started;

    address[] private members;
    uint8[] private payoutOrder;
    mapping(uint8 => mapping(address => bool)) public paid; // round => member => pago
    mapping(address => bool) private isMember;

    event Joined(address indexed member);
    event OrderSet();
    event Started();
    event Contributed(uint8 indexed round, address indexed member, uint256 amount);
    event PotClaimed(uint8 indexed round, address indexed beneficiary, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    constructor(
        address admin_,
        string memory name_,
        address token_,
        uint256 amount_,
        Frequency frequency_,
        OrderMode orderMode_,
        uint8 size_
    ) {
        require(admin_ != address(0), "admin=0");
        require(amount_ > 0, "amount=0");
        require(token_ != address(0), "token=0");
        require(size_ >= 2 && size_ <= MAX_MEMBERS, "size 2..12");

        admin = admin_;
        name = name_;
        token = token_;
        amount = amount_;
        frequency = frequency_;
        orderMode = orderMode_;
        size = size_;

        members.push(admin_);
        isMember[admin_] = true;
        emit Joined(admin_);
    }

    function join() external {
        require(!started, "started");
        require(members.length < size, "full");
        require(!isMember[msg.sender], "already member");

        members.push(msg.sender);
        isMember[msg.sender] = true;
        emit Joined(msg.sender);
    }

    /// @notice Admin fija el orden de cobro (solo modo AdminDefined, antes de iniciar).
    function setOrder(uint8[] calldata order) external onlyAdmin {
        require(!started, "started");
        require(orderMode == OrderMode.AdminDefined, "not admin mode");
        uint256 n = members.length;
        require(order.length == n, "bad length");

        bool[] memory seen = new bool[](n);
        for (uint256 i = 0; i < n; i++) {
            uint8 p = order[i];
            require(p < n, "index oob");
            require(!seen[p], "dup index");
            seen[p] = true;
        }
        payoutOrder = order;
        emit OrderSet();
    }

    function start() external onlyAdmin {
        require(!started, "started");
        uint256 n = members.length;
        require(n >= 2, "need >=2");

        if (orderMode == OrderMode.Random) {
            // Aleatoriedad pseudo: block.prevrandao. Suficiente para MVP/demo,
            // NO para produccion con dinero real (manipulable por validadores).
            uint8[] memory order = new uint8[](n);
            for (uint8 i = 0; i < n; i++) order[i] = i;
            for (uint256 i = n - 1; i > 0; i--) {
                uint256 j = uint256(keccak256(abi.encodePacked(block.prevrandao, address(this), i))) % (i + 1);
                (order[i], order[j]) = (order[j], order[i]);
            }
            payoutOrder = order;
        } else {
            require(payoutOrder.length == n, "order not set");
        }

        started = true;
        roundStart = uint64(block.timestamp);
        emit Started();
    }

    function contribute() external {
        require(started, "not started");
        require(isMember[msg.sender], "not member");
        require(!paid[round][msg.sender], "already paid");

        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "transfer failed");
        paid[round][msg.sender] = true;
        emit Contributed(round, msg.sender, amount);
    }

    /// @notice Libera el pozo al beneficiario de la ronda. Solo a partir de la fecha
    ///         de corte (dia 15 / fin de mes, UTC) y con la ronda completamente fondeada.
    ///         Cualquier miembro puede disparar el pago; los fondos siempre van al beneficiario.
    function claimPot() external {
        require(started, "not started");
        require(isMember[msg.sender], "not member");
        require(block.timestamp >= roundDeadline(), "aun no es fecha de pago");

        uint8 r = round;
        require(r < members.length, "ciclo terminado");

        address beneficiary = members[payoutOrder[r]];

        // Verifica que la ronda este completamente fondeada
        for (uint256 i = 0; i < members.length; i++) {
            require(paid[r][members[i]], "ronda incompleta");
        }

        uint256 pot = amount * members.length;
        round = r + 1;
        roundStart = uint64(block.timestamp);

        require(IERC20(token).transfer(beneficiary, pot), "transfer failed");
        emit PotClaimed(r, beneficiary, pot);
    }

    // ---- Fechas de corte (calendario, UTC) ----
    // Quincenal: dia 15 y ultimo dia del mes. Mensual: ultimo dia del mes.
    // El corte es a las 23:59:59 UTC del dia correspondiente.

    /// @notice Fecha (timestamp UTC) en la que se libera el pozo de la ronda actual.
    function roundDeadline() public view returns (uint256) {
        require(started, "not started");
        return _nextBoundary(uint256(roundStart), frequency == Frequency.Biweekly);
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
        address[] members;
        uint8[] payoutOrder;
    }

    /// @notice Todo el estado del ciclo en una sola llamada RPC.
    function getInfo() external view returns (Info memory) {
        return Info(
            admin,
            name,
            token,
            amount,
            uint8(frequency),
            uint8(orderMode),
            size,
            round,
            roundStart,
            started,
            members,
            payoutOrder
        );
    }

    function getMembers() external view returns (address[] memory) {
        return members;
    }

    function getPayoutOrder() external view returns (uint8[] memory) {
        return payoutOrder;
    }

    function hasPaid(uint8 round_, address member) external view returns (bool) {
        return paid[round_][member];
    }

    function currentBeneficiary() external view returns (address) {
        if (!started || round >= members.length) return address(0);
        return members[payoutOrder[round]];
    }
}
