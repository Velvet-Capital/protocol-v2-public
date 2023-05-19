// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

interface IRewardDistributorV3 {
  function claimAllReward(address[] memory _holders) external;

  function claimRewards(
    address[] memory _holders,
    address[] memory _suppliediTokens,
    address[] memory _borrowediTokens
  ) external;

  function claimReward(address[] memory _holders, address[] memory _iTokens)
    external;
}
