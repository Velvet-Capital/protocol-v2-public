// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {IStrategy} from "./IStrategy.sol";

interface IVaultBeefy is IERC20Upgradeable {
  function deposit(uint256) external;

  function depositAll() external;

  function withdraw(uint256) external;

  function depositBNB() external payable; //only for mooVenusBNB

  function withdrawBNB(uint256) external; //only for mooVenusBNB

  function withdrawAll() external;

  function getPricePerFullShare() external view returns (uint256);

  function upgradeStrat() external;

  function balance() external view returns (uint256);

  function want() external view returns (IERC20Upgradeable);

  function strategy() external view returns (IStrategy);
}
