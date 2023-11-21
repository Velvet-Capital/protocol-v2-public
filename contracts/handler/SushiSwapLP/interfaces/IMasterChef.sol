// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.16;

interface IMasterChef {
  function lpTokens(uint256 _pid) external view returns (address);

  function deposit(uint256 _pid, uint256 _amount) external;

  function withdraw(uint256 _pid, uint256 _amount) external;

  function userInfo(uint256 _pid, address _user) external view returns (uint256, uint256);
}
