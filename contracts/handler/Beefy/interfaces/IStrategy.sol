// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.16;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";

interface IStrategy {
  function vault() external view returns (address);

  function want() external view returns (IERC20Upgradeable);

  function beforeDeposit() external;

  function deposit() external;

  function withdraw(uint256) external;

  function balanceOf() external view returns (uint256);

  function balanceOfWant() external view returns (uint256);

  function balanceOfPool() external view returns (uint256);

  function harvest() external;

  function retireStrat() external;

  function panic() external;

  function pause() external;

  function unpause() external;

  function paused() external view returns (bool);

  function unirouter() external view returns (address);

  function stable() external view returns (bool);
}
