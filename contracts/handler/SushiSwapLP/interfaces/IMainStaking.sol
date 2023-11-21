// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.16;

interface IMainStaking {
  function deposit(uint256 _pid, uint256 _amount) external;
}
