// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

/**
  ∩~~~~∩ 
  ξ ･×･ ξ 
  ξ　~　ξ 
  ξ　　 ξ 
  ξ　　 “~～~～〇 
  ξ　　　　　　 ξ 
  ξ ξ ξ~～~ξ ξ ξ 
　 ξ_ξξ_ξ　ξ_ξξ_ξ
Alpaca Fin Corporation
*/

interface IVaultAlpaca {
    /// @notice Return the total ERC20 entitled to the token holders. Be careful of unaccrued interests.
    function totalToken() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    /// @notice Add more ERC20 to the bank. Hope to get some good returns.
    function deposit(uint256 amountToken) external payable;

    /// @notice Withdraw ERC20 from the bank by burning the share tokens.
    function withdraw(uint256 share) external;

    /// @notice Underlying token address
    function token() external view returns (address);

    function totalSupply() external view returns (uint256);
}
