// SPDX-License-Identifier: BUSL-1.1
/**
 * @title AccessController for the Index
 * @author Velvet.Capital
 * @notice Interface to specify and grant different roles
 * @dev Functionalities included:
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
