// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;
interface IHOPELP {

    function swap() external view returns(address);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    function decimals() external returns(uint256);
}