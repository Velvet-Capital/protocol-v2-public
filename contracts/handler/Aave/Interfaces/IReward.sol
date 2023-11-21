// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

interface IReward {
  function claimAllRewardsToSelf(address[] memory) external;

  function claimAllRewards(address[] memory assets, address to) external;
}
