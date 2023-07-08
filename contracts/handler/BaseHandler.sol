// SPDX-License-Identifier: MIT

/**
 * @title Handler for the base tokens
 * @author Velvet.Capital
 * @notice This contract is used to deposit and redeem assets
 *      to/from base tokens.
 * @dev This contract includes functionalities:
 *      1. Deposit assets to base tokens
 *      2. Redeem assets deposited in the base tokens
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity 0.8.16;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {IHandler} from "./IHandler.sol";
import {FunctionParameters} from "../FunctionParameters.sol";
import {Ownable} from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";
contract BaseHandler is IHandler, Ownable {
  /**
   * @notice This function deposits assets to the base tokens
   * @param _vAsset Address of the protocol asset to be deposited
   * @param _amount Amount that is to be deposited
   * @param _lpSlippage LP slippage value passed to the function
   * @param _to Address that would receive the yieldTokens in return
   */
  function deposit(
    address _vAsset,
    uint256[] memory _amount,
    uint256 _lpSlippage,
    address _to,
    address user
  ) public payable override {}

  /**
   * @notice This function redeems assets deposited into the base tokens
   */
  function redeem(FunctionParameters.RedeemData calldata inputData) public override {}

  /**
   * @notice This function returns address of the underlying asset
   * @param _vToken Address of the protocol token whose underlying asset is needed
   * @return underlying Address of the underlying asset
   */
  function getUnderlying(address _vToken) public pure override returns (address[] memory) {
    address[] memory underlying = new address[](1);
    underlying[0] = _vToken;
    return underlying;
  }

  /**
   * @notice This function returns the protocol token balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token balance of the holder
   */
  function getTokenBalance(address _tokenHolder, address t) public view override returns (uint256 tokenBalance) {
    IERC20Upgradeable token = IERC20Upgradeable(t);
    tokenBalance = token.balanceOf(_tokenHolder);
  }

  /**
   * @notice This function returns the underlying asset balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token's underlying asset balance of the holder
   */
  function getUnderlyingBalance(address _tokenHolder, address t) public view override returns (uint256[] memory) {
    uint256[] memory tokenBalance = new uint256[](1);
    IERC20Upgradeable token = IERC20Upgradeable(t);
    tokenBalance[0] = token.balanceOf(_tokenHolder);
    return tokenBalance;
  }

  function encodeData(address t, uint256 _amount) public returns (bytes memory) {}

  function getFairLpPrice(address _tokenHolder, address t) public view returns (uint) {}

  function getRouterAddress() public view returns (address) {}

  function getClaimTokenCalldata(address, address) public pure returns (bytes memory, address) {
    return ("", address(0));
  }

  receive() external payable {}
}
