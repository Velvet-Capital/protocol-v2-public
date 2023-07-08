// SPDX-License-Identifier: MIT

// Beefy Official Docs: https://docs.beefy.finance/
// Beefy GitHub: https://github.com/beefyfinance

/**
 * @title Handler for the Beefy's LP protocol
 * @author Velvet.Capital
 * @notice This contract is used to add and remove liquidity
 *      to/from the Beefy protocol.
 * @dev This contract includes functionalities:
 *      1. Add liquidity to the Beefy protocol
 *      2. Redeem liquidity from the Beefy protocol
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity 0.8.16;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";

import {LPInterface} from "./interfaces/LPInterface.sol";
import {FactoryInterface} from "./interfaces/FactoryInterface.sol";
import {Babylonian} from "@uniswap/lib/contracts/libraries/Babylonian.sol";
import {ISolidlyPair} from "./interfaces/ISolidlyPair.sol";
import {IPriceOracle} from "../../oracle/IPriceOracle.sol";
import {IHandler} from "../IHandler.sol";
import {IVaultBeefy} from "./interfaces/IVaultBeefy.sol";
import {IStrategy} from "./interfaces/IStrategy.sol";

import {FullMath} from "../libraries/FullMath.sol";
import {ErrorLibrary} from "./../../library/ErrorLibrary.sol";
import {FunctionParameters} from "../../FunctionParameters.sol";
import {UniswapV2LPHandler} from "../AbstractLPHandler.sol";

contract BeefyLPHandler is IHandler, UniswapV2LPHandler {
  using SafeMathUpgradeable for uint256;
  uint256 public constant DIVISOR_INT = 10_000;
  address public immutable lpHandlerAddress;
  IPriceOracle public _oracle;

  event Deposit(uint256 time, address indexed user, address indexed token, uint256[] amounts, address indexed to);
  event Redeem(
    uint256 time,
    address indexed user,
    address indexed token,
    uint256 amount,
    address indexed to,
    bool isWETH
  );

  constructor(address _lpHandlerAddress, address _priceOracle) {
    if (_lpHandlerAddress == address(0) && _priceOracle == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    lpHandlerAddress = _lpHandlerAddress;
    _oracle = IPriceOracle(_priceOracle);
  }

  /**
   * @notice This function adds liquidity to the Beefy protocol
   * @param mooLpAsset Address of the protocol asset to be deposited
   * @param _amount Amount that is to be deposited
   * @param _lpSlippage LP slippage value passed to the function
   * @param _to Address that would receive the cTokens in return
   */
  function deposit(
    address mooLpAsset,
    uint256[] memory _amount,
    uint256 _lpSlippage,
    address _to,
    address user
  ) public payable override {
    if (mooLpAsset == address(0) || _to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory underlying = getUnderlying(mooLpAsset);
    address underlyingLpToken = address(IStrategy(address(IVaultBeefy(mooLpAsset).strategy())).want());
    if (msg.value == 0) {
      uint256 tok1bal = IERC20Upgradeable(underlying[0]).balanceOf(address(this));
      uint256 tok2bal = IERC20Upgradeable(underlying[1]).balanceOf(address(this));
      if (tok1bal < _amount[0]) {
        revert ErrorLibrary.InsufficientTokenABalance();
      }
      if (tok2bal < _amount[1]) {
        revert ErrorLibrary.InsufficientTokenBBalance();
      }
      TransferHelper.safeTransfer(underlying[0], lpHandlerAddress, _amount[0]);
      TransferHelper.safeTransfer(underlying[1], lpHandlerAddress, _amount[1]);
      IHandler(lpHandlerAddress).deposit(address(underlyingLpToken), _amount, _lpSlippage, address(this), user);
    } else {
      uint256 amountBNB = address(this).balance;
      uint256 index = underlying[0] == WETH ? 1 : 0;
      uint256 tokbal = IERC20Upgradeable(underlying[index]).balanceOf(address(this));
      TransferHelper.safeTransfer(address(underlying[index]), lpHandlerAddress, tokbal);
      IHandler(lpHandlerAddress).deposit{value: amountBNB}(
        underlyingLpToken,
        _amount,
        _lpSlippage,
        address(this),
        user
      );
    }

    uint256 LPTokens = IERC20Upgradeable(underlyingLpToken).balanceOf(address(this));
    TransferHelper.safeApprove(address(underlyingLpToken), address(mooLpAsset), LPTokens);
    IVaultBeefy(mooLpAsset).deposit(LPTokens);
    if (_to != address(this)) {
      uint256 assetBalance = IERC20Upgradeable(mooLpAsset).balanceOf(address(this));
      TransferHelper.safeTransfer(mooLpAsset, _to, assetBalance);
    }
    emit Deposit(block.timestamp, msg.sender, mooLpAsset, _amount, _to);
  }

  /**
   * @notice This function remove liquidity from the Beefy protocol
   */
  function redeem(FunctionParameters.RedeemData calldata inputData) public override {
    if (inputData._yieldAsset == address(0) || inputData._to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address underlyingLpToken = address(IStrategy(address(IVaultBeefy(inputData._yieldAsset).strategy())).want());
    if (inputData._amount > IVaultBeefy(inputData._yieldAsset).balanceOf(address(this))) {
      revert ErrorLibrary.NotEnoughBalanceInBeefy();
    }
    IVaultBeefy(inputData._yieldAsset).withdraw(inputData._amount);
    uint256 LPTokens = IERC20Upgradeable(underlyingLpToken).balanceOf(address(this));
    TransferHelper.safeTransfer(underlyingLpToken, lpHandlerAddress, LPTokens);

    IHandler(lpHandlerAddress).redeem(
      FunctionParameters.RedeemData(
        inputData._amount,
        inputData._lpSlippage,
        inputData._to,
        underlyingLpToken,
        inputData.isWETH
      )
    );

    emit Redeem(block.timestamp, msg.sender, inputData._yieldAsset, inputData._amount, inputData._to, inputData.isWETH);
  }

  /**
   * @notice This function returns address of the underlying asset
   * @param mooLpAsset Address of the protocol token whose underlying asset is needed
   * @return underlying Address of the underlying asset
   */
  function getUnderlying(address mooLpAsset) public view override returns (address[] memory) {
    require(address(mooLpAsset) != address(0), "zero address passed");
    if (mooLpAsset == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory underlying = new address[](2);
    address underlyingLpToken = address(IStrategy(address(IVaultBeefy(mooLpAsset).strategy())).want());
    ISolidlyPair token = ISolidlyPair(underlyingLpToken);
    underlying[0] = token.token0();
    underlying[1] = token.token1();
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
    tokenBalance = asset.balanceOf(_tokenHolder);
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
    uint256[] memory tokenBalance = new uint256[](2);
    address underlyingLpToken = address(IStrategy(address(IVaultBeefy(t).strategy())).want());
    uint256 balance = getTokenBalance(_tokenHolder, t).mul(IVaultBeefy(t).balance()).div(IVaultBeefy(t).totalSupply());
    (tokenBalance[0], tokenBalance[1]) = _getLiquidityValue(underlyingLpToken, balance);
    return tokenBalance;
  }

  /**
   * @notice This function returns the USD value of the LP asset using Fair LP Price model
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return finalLB value of the lp asset t
   */
  function getFairLpPrice(address _tokenHolder, address t) public view returns (uint) {
    if (t == address(0) || _tokenHolder == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address underlyingLpToken = address(IStrategy(address(IVaultBeefy(t).strategy())).want());
    uint lB = _calculatePrice(underlyingLpToken, address(_oracle));
    uint256 balance = _getTokenBalance(_tokenHolder, t);
    uint finalLB = lB.mul(balance).div(10 ** 18);
    return finalLB;
  }

  function encodeData(address t, uint256 _amount) public returns (bytes memory) {}

  function getRouterAddress() public view returns (address) {}

  function getClaimTokenCalldata(address, address) public pure returns (bytes memory, address) {}

  receive() external payable {}
}
