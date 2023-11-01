// SPDX-License-Identifier: BSD-3-Clause
pragma solidity 0.8.16;

interface CometMainInterface {
    function balanceOf(address owner) external view returns (uint256);
    
    function supply(address asset, uint amount) external;
    
    function withdraw(address asset, uint amount) external;
    
    function baseToken() external view returns (address);

    function claim(address comet, address src, bool shouldAccrue) external;
}