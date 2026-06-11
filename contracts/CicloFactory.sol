// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Ciclo.sol";

/// @title CicloFactory — crea un contrato Ciclo propio por cada ciclo
/// @notice Cada ciclo creado despliega su propio contrato que custodia los
///         depositos de sus miembros. El id es el indice en `cycles`.
contract CicloFactory {
    address[] public cycles;

    event CycleCreated(uint256 indexed id, address indexed cycle, address indexed admin);

    function createCycle(
        string calldata name,
        address token,
        uint256 amount,
        Ciclo.Frequency frequency,
        Ciclo.OrderMode orderMode,
        uint8 size
    ) external returns (uint256 id, address addr) {
        Ciclo c = new Ciclo(msg.sender, name, token, amount, frequency, orderMode, size);
        cycles.push(address(c));
        id = cycles.length - 1;
        addr = address(c);
        emit CycleCreated(id, addr, msg.sender);
    }

    function cyclesCount() external view returns (uint256) {
        return cycles.length;
    }
}
