// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title CICLO — ahorro comunitario rotativo (ROSCA) en Celo
/// @notice Cada ronda un miembro recibe el pozo completo. Soporta cUSD o cCOP por grupo.
///         Registro unico: un solo deploy gestiona muchos ciclos (gas minimo).
contract Ciclo {
    uint8 public constant MAX_MEMBERS = 12;

    enum Frequency { Weekly, Monthly }
    enum OrderMode { AdminDefined, Random }

    struct Group {
        address admin;
        string name;
        address token; // cUSD (USDm) o cCOP (COPm) — fijo por grupo
        uint256 amount; // aporte fijo por turno
        Frequency frequency;
        OrderMode orderMode;
        uint8 round; // ronda actual (0..N-1)
        uint64 roundStart; // timestamp (proyeccion/UX)
        bool started;
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

    modifier onlyAdmin(uint256 id) {
        require(msg.sender == groups[id].admin, "not admin");
        _;
    }

    function createGroup(
        string calldata name,
        address token,
        uint256 amount,
        Frequency frequency,
        OrderMode orderMode
    ) external returns (uint256 id) {
        require(amount > 0, "amount=0");
        require(token != address(0), "token=0");

        groups.push(Group(msg.sender, name, token, amount, frequency, orderMode, 0, 0, false));
        id = groups.length - 1;

        members[id].push(msg.sender);
        isMember[id][msg.sender] = true;

        emit GroupCreated(id, msg.sender, token, amount);
        emit Joined(id, msg.sender);
    }

    function join(uint256 id) external {
        Group storage g = groups[id];
        require(!g.started, "started");
        require(members[id].length < MAX_MEMBERS, "full");
        require(!isMember[id][msg.sender], "already member");

        members[id].push(msg.sender);
        isMember[id][msg.sender] = true;
        emit Joined(id, msg.sender);
    }

    /// @notice Admin fija el orden de cobro (solo modo AdminDefined, antes de iniciar).
    function setOrder(uint256 id, uint8[] calldata order) external onlyAdmin(id) {
        Group storage g = groups[id];
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
        require(g.started, "not started");
        require(isMember[id][msg.sender], "not member");
        require(!paid[id][g.round][msg.sender], "already paid");

        require(IERC20(g.token).transferFrom(msg.sender, address(this), g.amount), "transfer failed");
        paid[id][g.round][msg.sender] = true;
        emit Contributed(id, g.round, msg.sender, g.amount);
    }

    /// @notice El beneficiario de la ronda retira el pozo una vez todos aportaron.
    function claimPot(uint256 id) external {
        Group storage g = groups[id];
        require(g.started, "not started");

        address[] storage mem = members[id];
        uint8 round = g.round;
        require(round < mem.length, "ciclo terminado");

        address beneficiary = mem[payoutOrder[id][round]];
        require(msg.sender == beneficiary, "no es tu turno");

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

    // ---- Vistas ----

    function groupsCount() external view returns (uint256) {
        return groups.length;
    }

    function getGroup(uint256 id) external view returns (Group memory) {
        return groups[id];
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
        if (!g.started || g.round >= members[id].length) return address(0);
        return members[id][payoutOrder[id][g.round]];
    }
}
