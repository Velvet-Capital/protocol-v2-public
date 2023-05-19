// SPDX-License-Identifier: MIT

/**
 * @title AccessController for the Index
 * @author Velvet.Capital
 * @notice You can use this contract to specify and grant different roles
 * @dev This contract includes functionalities:
 *      1. Checks if an address has role
 *      2. Grant different roles to addresses
 */

pragma solidity 0.8.16;

import {FunctionParameters} from "../FunctionParameters.sol";

interface IAccessController {
  function setupRole(bytes32 role, address account) external;

  function hasRole(bytes32 role, address account) external view returns (bool);

  function setUpRoles(FunctionParameters.AccessSetup memory) external;
}
