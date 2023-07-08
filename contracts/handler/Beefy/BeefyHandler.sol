// SPDX-License-Identifier: MIT

// Beefy Official Docs: https://docs.beefy.finance/
// Beefy GitHub: https://github.com/beefyfinance

/**
 * @title Handler for the Beefy's lending protocol
 * @author Velvet.Capital
 * @notice This contract is used to deposit and redeem assets
 *      to/from the Beefy protocol.
 * @dev This contract includes functionalities:
 *      1. Deposit tokens to the Beefy protocol
 *      2. Redeem tokens from the Beefy protocol
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity 0.8.16;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";
import {Ownable} from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";
import {IHandler} from "../IHandler.sol";
import {IVaultBeefy} from "./interfaces/IVaultBeefy.sol";
import {ErrorLibrary} from "./../../library/ErrorLibrary.sol";
import {FunctionParameters} from "../../FunctionParameters.sol";

contract BeefyHandler is IHandler, Ownable {
  using SafeMathUpgradeable for uint256;
  event Deposit(uint256 time, address indexed user, address indexed token, uint256[] amounts, address indexed to);
  event Redeem(
    uint256 time,
    address indexed user,
    address indexed token,
    uint256 amount,
    address indexed to,
    bool isWETH
  );

  address public constant WETH = address(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c);
  address public constant MOO_VENUS_BNB = address(0x6BE4741AB0aD233e4315a10bc783a7B923386b71);

  /**
   * @notice This function deposits assets to the Beefy protocol
   * @param _mooAsset Address of the protocol asset to be deposited
   * @param _amount Amount that is to be deposited
   * @param _lpSlippage LP slippage value passed to the function
   * @param _to Address that would receive the cTokens in return
   */
  function deposit(
    address _mooAsset,
    uint256[] calldata _amount,
    uint256 _lpSlippage,
    address _to,
    address user
  ) public payable override {
    if (_mooAsset == address(0) || _to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IVaultBeefy asset = IVaultBeefy(_mooAsset);
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(_mooAsset)[0]);
    if (msg.value == 0) {
      TransferHelper.safeApprove(address(underlyingToken), address(_mooAsset), 0);
      TransferHelper.safeApprove(address(underlyingToken), address(_mooAsset), _amount[0]);
      asset.deposit(_amount[0]);
      if (_to != address(this)) {
        uint256 assetBalance = IERC20Upgradeable(_mooAsset).balanceOf(address(this));
        TransferHelper.safeTransfer(_mooAsset, _to, assetBalance);
      }
    } else {
      if (_mooAsset != MOO_VENUS_BNB) {
        revert ErrorLibrary.PleaseDepositUnderlyingToken();
      }

      asset.depositBNB{value: msg.value}();
      if (_to != address(this)) {
        uint256 assetBalance = IERC20Upgradeable(_mooAsset).balanceOf(address(this));
        TransferHelper.safeTransfer(_mooAsset, _to, assetBalance);
      }
    }
    emit Deposit(block.timestamp, msg.sender, _mooAsset, _amount, _to);
  }

  /**
   * @notice This function redeems assets from the Beefy protocol
   */
  function redeem(FunctionParameters.RedeemData calldata inputData) public override {
    if (inputData._yieldAsset == address(0) || inputData._to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IVaultBeefy asset = IVaultBeefy(inputData._yieldAsset);
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(inputData._yieldAsset)[0]);
    if (inputData._amount > asset.balanceOf(address(this))) {
      revert ErrorLibrary.NotEnoughBalanceInBeefyProtocol();
    }
    if (inputData.isWETH) {
      asset.withdrawBNB(inputData._amount);
    } else {
      asset.withdraw(inputData._amount);
    }
    if (inputData._to != address(this)) {
      if (inputData.isWETH) {
        (bool success, ) = payable(inputData._to).call{value: address(this).balance}("");
        require(success, "Transfer failed.");
      } else {
        uint256 tokenAmount = underlyingToken.balanceOf(address(this));
        TransferHelper.safeTransfer(address(underlyingToken), inputData._to, tokenAmount);
      }
    }
    emit Redeem(block.timestamp, msg.sender, inputData._yieldAsset, inputData._amount, inputData._to, inputData.isWETH);
  }

  /**
   * @notice This function returns address of the underlying asset
   * @param _mooAsset Address of the protocol token whose underlying asset is needed
   * @return underlying Address of the underlying asset
   */
  function getUnderlying(address _mooAsset) public view override returns (address[] memory) {
    require(address(_mooAsset) != address(0), "zero address passed");
    if (_mooAsset == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory underlying = new address[](1);
    IVaultBeefy token = IVaultBeefy(_mooAsset);
    if (_mooAsset == MOO_VENUS_BNB) {
      underlying[0] = WETH;
    } else {
      underlying[0] = address(token.want());
    }
    return underlying;
  }

  /**
   * @notice This function returns the protocol token balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token balance of the holder
   */
  function getTokenBalance(address _tokenHolder, address t) public view override returns (uint256 tokenBalance) {
    if (_tokenHolder == address(0) || t == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IVaultBeefy asset = IVaultBeefy(t);
    tokenBalance = IERC20Upgradeable(asset).balanceOf(_tokenHolder);
  }

  /**
   * @notice This function returns the underlying asset balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param _t Address of the protocol token
   * @return tokenBalance t token's underlying asset balance of the holder
   */
  function getUnderlyingBalance(address _tokenHolder, address _t) public view override returns (uint256[] memory) {
    if (_t == address(0) || _tokenHolder == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    uint256[] memory tokenBalance = new uint256[](1);
    uint256 yieldTokenBalance = getTokenBalance(_tokenHolder, _t);
    tokenBalance[0] = yieldTokenBalance.mul(IVaultBeefy(_t).balance()).div(IVaultBeefy(_t).totalSupply());
    return tokenBalance;
  }

  function getFairLpPrice(address _tokenHolder, address t) public view returns (uint) {}

  function encodeData(address t, uint256 _amount) public returns (bytes memory) {}

  function getRouterAddress() public view returns (address) {}

  function getClaimTokenCalldata(address, address) public pure returns (bytes memory, address) {}

  receive() external payable {}
}
