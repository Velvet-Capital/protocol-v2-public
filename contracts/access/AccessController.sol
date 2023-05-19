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

import {AccessControl} from "@openzeppelin/contracts-4.8.2/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";

import {ITokenRegistry} from "../registry/ITokenRegistry.sol";

import {FunctionParameters} from "../FunctionParameters.sol";

contract AccessController is AccessControl, Ownable {
  bytes32 public constant HANDLER_CONTRACT = keccak256("HANDLER_CONTRACT");
  bytes32 public constant INDEX_MANAGER_ROLE = keccak256("INDEX_MANAGER_ROLE");
  bytes32 public constant SUPER_ADMIN = keccak256("SUPER_ADMIN");
  bytes32 public constant WHITELIST_MANAGER_ADMIN = keccak256("WHITELIST_MANAGER_ADMIN");
  bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");
  bytes32 public constant WHITELIST_MANAGER = keccak256("WHITELIST_MANAGER");
  bytes32 public constant ASSET_MANAGER_ADMIN = keccak256("ASSET_MANAGER_ADMIN");
  bytes32 public constant REBALANCER_CONTRACT = keccak256("REBALANCER_CONTRACT");
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  constructor() {
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
  }

  function setupRole(bytes32 role, address account) public onlyOwner {
    _setupRole(role, account);
  }

  function setRoleAdmin(bytes32 role, bytes32 adminRole) public onlyOwner {
    _setRoleAdmin(role, adminRole);
  }

  function setUpRoles(FunctionParameters.AccessSetup memory setupData) public onlyOwner {
    _setupRole(HANDLER_CONTRACT, setupData._exchangeHandler);

    _setupRole(INDEX_MANAGER_ROLE, setupData._index);

    _setupRole(INDEX_MANAGER_ROLE, address(ITokenRegistry(setupData._tokenRegistry).IndexOperationHandler()));

    _setupRole(INDEX_MANAGER_ROLE, setupData._offChainIndexSwap);

    _setupRole(SUPER_ADMIN, setupData._portfolioCreator);

    _setRoleAdmin(WHITELIST_MANAGER_ADMIN, SUPER_ADMIN);

    _setRoleAdmin(ASSET_MANAGER_ADMIN, SUPER_ADMIN);

    _setRoleAdmin(ASSET_MANAGER_ROLE, ASSET_MANAGER_ADMIN);

    _setRoleAdmin(WHITELIST_MANAGER, WHITELIST_MANAGER_ADMIN);

    _setupRole(WHITELIST_MANAGER_ADMIN, setupData._portfolioCreator);
    _setupRole(WHITELIST_MANAGER, setupData._portfolioCreator);

    _setupRole(ASSET_MANAGER_ADMIN, setupData._portfolioCreator);
    _setupRole(ASSET_MANAGER_ROLE, setupData._portfolioCreator);

    _setupRole(INDEX_MANAGER_ROLE, setupData._rebalancing);
    _setupRole(REBALANCER_CONTRACT, setupData._rebalancing);

    _setupRole(INDEX_MANAGER_ROLE, setupData._offChainRebalancing);
    _setupRole(REBALANCER_CONTRACT, setupData._offChainRebalancing);
    _setupRole(HANDLER_CONTRACT, setupData._offChainRebalancing);

    _setupRole(INDEX_MANAGER_ROLE, setupData._rebalanceAggregator);
    _setupRole(REBALANCER_CONTRACT, setupData._rebalanceAggregator);

    _setupRole(MINTER_ROLE, setupData._feeModule);
    _setupRole(MINTER_ROLE, setupData._offChainIndexSwap);
  }
}
