// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.16;

library StructLib {
  // Struct of main contract A
  struct UserInfo {
    uint128 amount;
    uint128 factor;
    uint128 rewardDebt;
    uint128 pendingWom;
  }
}

interface IWombat {
  function withdraw(uint256 _pid, uint256 _amount) external returns (uint256, uint256[] memory);

  function getAssetPid(address asset) external view returns (uint256);

  function userInfo(uint256 pid, address owner) external view returns (StructLib.UserInfo memory);

  function deposit(uint256 _pid, uint256 _amount) external;

  //0xE2C07d20AF0Fb50CAE6cDD615CA44AbaAA31F9c8
}
