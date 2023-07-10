// SPDX-License-Identifier: MIT

// Alpaca Official Docs: https://docs.alpacafinance.org/
// Alpaca GitHub: https://github.com/alpaca-finance

/**
 * @title Handler for the Alpaca protocol
 * @author Velvet.Capital
 * @notice This contract is used to deposit and redeem assets
 *      to/from the Alpaca protocol.
 * @dev This contract includes functionalities:
 *      1. Deposit tokens to the Alpaca protocol
 *      2. Redeem tokens from the Alpaca protocol
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity 0.8.16;

import {IHandler} from "../IHandler.sol";

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {IVaultAlpaca} from "./interfaces/IVaultAlpaca.sol";
import {ErrorLibrary} from "./../../library/ErrorLibrary.sol";
import {FunctionParameters} from "../../FunctionParameters.sol";

contract AlpacaHandler is IHandler {
  using SafeMathUpgradeable for uint256;

  event Deposit(uint256 time, address indexed user, address indexed token, uint256 amount, address indexed to);
  event Redeem(
    uint256 time,
    address indexed user,
    address indexed token,
    uint256 amount,
    address indexed to,
    bool isWETH
  );

  /**
   * @notice This function deposits assets to the Alpaca protocol
   * @param _yieldAsset Address of the protocol asset to be deposited
   * @param _amount Amount that is to be deposited
   * @param _lpSlippage LP slippage value passed to the function
   * @param _to Address that would receive the yieldTokens in return
   */
  function deposit(
    address _yieldAsset,
    uint256[] calldata _amount,
    uint256 _lpSlippage,
    address _to,
    address user
  ) public payable override {
    if (_yieldAsset == address(0) || _to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(_yieldAsset)[0]);
    IVaultAlpaca yieldToken = IVaultAlpaca(_yieldAsset);

    if (msg.value == 0) {
      TransferHelper.safeApprove(address(underlyingToken), address(yieldToken), 0);
      TransferHelper.safeApprove(address(underlyingToken), address(yieldToken), _amount[0]);
      yieldToken.deposit(_amount[0]);
    } else {
      if (msg.value < _amount[0]) {
        revert ErrorLibrary.MintAmountMustBeEqualToValue();
      }
      yieldToken.deposit{value: _amount[0]}(_amount[0]);
    }

    if (_to != address(this)) {
      uint256 yBalance = yieldToken.balanceOf(address(this));
      TransferHelper.safeTransfer(_yieldAsset, _to, yBalance);
    }
    emit Deposit(block.timestamp, msg.sender, _yieldAsset, _amount[0], _to);
  }

  /**
   * @notice This function redeems assets from the Alpaca protocol
   */
  function redeem(FunctionParameters.RedeemData calldata inputData) public override {
    if (inputData._yieldAsset == address(0) || inputData._to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IVaultAlpaca yieldToken = IVaultAlpaca(inputData._yieldAsset);

    if (inputData._amount > yieldToken.balanceOf(address(this))) {
      revert ErrorLibrary.NotEnoughBalanceInAlpacaProtocol();
    }

    yieldToken.withdraw(inputData._amount);

    if (inputData._to != address(this)) {
      IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(inputData._yieldAsset)[0]);
      if (inputData.isWETH) {
        (bool success, ) = payable(inputData._to).call{value: address(this).balance}("");
        require(success, "Transfer failed.");
      } else {
        IERC20Upgradeable token = IERC20Upgradeable(underlyingToken);
        uint256 tokenAmount = token.balanceOf(address(this));
        TransferHelper.safeTransfer(address(underlyingToken), inputData._to, tokenAmount);
      }
    }
    emit Redeem(block.timestamp, msg.sender, inputData._yieldAsset, inputData._amount, inputData._to, inputData.isWETH);
  }

  /**
   * @notice This function returns address of the underlying asset
   * @param _alpacaToken Address of the protocol token whose underlying asset is needed
   * @return underlying Address of the underlying asset
   */
  function getUnderlying(address _alpacaToken) public view override returns (address[] memory) {
    if (_alpacaToken == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory underlying = new address[](1);
    IVaultAlpaca alpacaToken = IVaultAlpaca(_alpacaToken);
    underlying[0] = alpacaToken.token();
    return underlying;
  }

  /**
   * @notice This function returns the protocol token balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token balance of the holder
   */
  function getTokenBalance(address _tokenHolder, address t) public view override returns (uint256 tokenBalance) {
    if (t == address(0) || _tokenHolder == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IVaultAlpaca token = IVaultAlpaca(t);
    tokenBalance = token.balanceOf(_tokenHolder);
  }

  /**
   * @notice This function returns the underlying asset balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token's underlying asset balance of the holder
   */
  function getUnderlyingBalance(address _tokenHolder, address t) public view override returns (uint256[] memory) {
    if (t == address(0) || _tokenHolder == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    uint256[] memory tokenBalance = new uint256[](1);
    uint256 yieldTokenBalance = getTokenBalance(_tokenHolder, t);
    tokenBalance[0] = yieldTokenBalance.mul(IVaultAlpaca(t).totalToken()).div(IVaultAlpaca(t).totalSupply());
    return tokenBalance;
  }

  function getFairLpPrice(address _tokenHolder, address t) public view returns (uint) {}

  function encodeData(address t, uint256 _amount) public returns (bytes memory) {}

  function getRouterAddress() public view returns (address) {}

  function getClaimTokenCalldata(address, address) public pure returns (bytes memory, address) {}

  receive() external payable {}
}
