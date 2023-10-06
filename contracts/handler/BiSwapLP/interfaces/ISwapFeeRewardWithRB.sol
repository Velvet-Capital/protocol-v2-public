// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.16;

interface ISwapFeeRewardWithRB {
  function pairOfPid(address) external view returns (uint256);
}
