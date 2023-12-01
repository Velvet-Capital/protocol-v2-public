// SPDX-License-Identifier: BUSL-1.1

// HOP Official Docs: https://docs.hop.exchange/v/developer-docs/
// HOP GitHub: https://github.com/hop-protocol

/**
 * @title Handler for the Hop protocol
 * @author Velvet.Capital
 * @notice This contract is used to deposit and redeem assets
 *      to/from the Hop protocol.
 * @dev This contract includes functionalities:
 *      1. Deposit tokens to the Hop protocol
 *      2. Redeem tokens from the Hop protocol
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity 0.8.16;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import {ISwap} from "./interfaces/ISwap.sol";
import {IHOPELP} from "./interfaces/IHOPELP.sol";
import {IWETH} from "../../interfaces/IWETH.sol";

import {IHandler} from "../IHandler.sol";
import {ErrorLibrary} from "./../../library/ErrorLibrary.sol";
import {FunctionParameters} from "contracts/FunctionParameters.sol";
import {IPriceOracle} from "../../oracle/IPriceOracle.sol";

contract HopHandler is IHandler {
  IPriceOracle internal _oracle;

  event Deposit(address indexed user, address indexed token, uint256[] amounts, address indexed to);
  event Redeem(address indexed user, address indexed token, uint256 amount, address indexed to, bool isWETH);

  /**
   * @param _priceOracle address of price oracle
   */
  constructor(address _priceOracle) {
    if (_priceOracle == address(0)) revert ErrorLibrary.InvalidAddress();
    _oracle = IPriceOracle(_priceOracle);
  }

  /**
   * @notice This function deposits assets to the Venus protocol
   * @param _hopeLP Address of the protocol asset to be deposited
   * @param _amount Amount that is to be deposited
   * @param _lpSlippage LP slippage value passed to the function
   * @param _to Address that would receive the vTokens in return
   */
  function deposit(
    address _hopeLP,
    uint256[] calldata _amount,
    uint256 _lpSlippage,
    address _to,
    address user
  ) public payable override returns (uint256 _mintedAmount) {
    if (_hopeLP == address(0) || _to == address(0) || user == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(_hopeLP)[0]);

    IHOPELP hopeLP = IHOPELP(_hopeLP);
    address pool = hopeLP.swap();

    if (msg.value > 0) {
      if (address(underlyingToken) != _oracle.WETH()) revert ErrorLibrary.TokenNotETH();
      if (msg.value != _amount[0]) revert ErrorLibrary.WrongNativeValuePassed();
      IWETH(address(underlyingToken)).deposit{value: msg.value}();
    }
    TransferHelper.safeApprove(address(underlyingToken), pool, 0);
    TransferHelper.safeApprove(address(underlyingToken), pool, _amount[0]);
    uint256 mintAmount = getSlippage(_hopeLP, _amount[0], true, _lpSlippage, _to);
    uint256[] memory inputAmount = new uint256[](2);
    inputAmount[0] = _amount[0];
    inputAmount[1] = 0;
    uint256 liquidity = ISwap(pool).addLiquidity(inputAmount, mintAmount, block.timestamp);
    if (liquidity == 0) {
      revert ErrorLibrary.ZeroBalanceAmount();
    }
    TransferHelper.safeTransfer(_hopeLP, _to, liquidity);
    emit Deposit(msg.sender, _hopeLP, _amount, _to);
    _mintedAmount = (ISwap(pool).getVirtualPrice() * liquidity) / (10 ** hopeLP.decimals());
  }

  /**
   * @notice This function redeems assets from the Venus protocol
   */
  function redeem(FunctionParameters.RedeemData calldata inputData) public override {
    if (inputData._yieldAsset == address(0) || inputData._to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IHOPELP hopeLP = IHOPELP(inputData._yieldAsset);
    if (inputData._amount > hopeLP.balanceOf(address(this))) {
      revert ErrorLibrary.InsufficientBalance();
    }

    address pool = hopeLP.swap();
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(inputData._yieldAsset)[0]);

    TransferHelper.safeApprove(inputData._yieldAsset, pool, 0);
    TransferHelper.safeApprove(inputData._yieldAsset, pool, inputData._amount);
    uint256 underlyingAmount = ISwap(pool).removeLiquidityOneToken(
      inputData._amount,
      0,
      getSlippage(inputData._yieldAsset, inputData._amount, false, inputData._lpSlippage, inputData._to),
      block.timestamp
    );

    TransferHelper.safeTransfer(address(underlyingToken), inputData._to, underlyingAmount);
    emit Redeem(msg.sender, inputData._yieldAsset, inputData._amount, inputData._to, inputData.isWETH);
  }

  /**
   * @notice This function returns address of the underlying asset
   * @param _hopeLP Address of the protocol token whose underlying asset is needed
   * @return underlying Address of the underlying asset
   */
  function getUnderlying(address _hopeLP) public view override returns (address[] memory) {
    if (_hopeLP == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory underlying = new address[](1);
    //Here we are considering only one token as underlying, because hop lp has two token one is base token and other is derivative
    underlying[0] = address(ISwap(IHOPELP(_hopeLP).swap()).getToken(0));
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

    tokenBalance = IERC20Upgradeable(t).balanceOf(_tokenHolder);
  }

  /**
   * @notice This function returns the underlying asset balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param _token Address of the protocol token
   * @return tokenBalance t token's underlying asset balance of the holder
   */
  function getUnderlyingBalance(address _tokenHolder, address _token) public view override returns (uint256[] memory) {
    if (_token == address(0) || _tokenHolder == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }

    uint256[] memory expectedAmount = new uint256[](1);
    uint256 tokenBalance = getTokenBalance(_tokenHolder, _token);
    if (tokenBalance != 0) {
      expectedAmount[0] = getUnderlyingAmount(_tokenHolder, tokenBalance, _token);
    }

    return expectedAmount;
  }

  /**
   * @notice This function returns the underlying asset balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param _amount Amount of lp token
   * @param token address of lp token
   * @return underlyingAmount underlying amount in one token
   */
  function getUnderlyingAmount(address _tokenHolder, uint256 _amount, address token) public view returns (uint256) {
    //Here getting underlying token amount in one token
    if (_tokenHolder == address(0) || token == address(0)) revert ErrorLibrary.InvalidAddress();
    return ISwap(IHOPELP(token).swap()).calculateRemoveLiquidityOneToken(_tokenHolder, _amount, 0);
  }

  /**
   * @notice This function returns the USD value of the asset
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param _token Address of the protocol token
   */
  function getTokenBalanceUSD(address _tokenHolder, address _token) public view override returns (uint256) {
    if (_token == address(0) || _tokenHolder == address(0)) revert ErrorLibrary.InvalidAddress();
    uint[] memory underlyingBalance = getUnderlyingBalance(_tokenHolder, _token);
    address[] memory underlyingToken = getUnderlying(_token);

    uint balanceUSD = _oracle.getPriceTokenUSD18Decimals(underlyingToken[0], underlyingBalance[0]);
    return balanceUSD;
  }

  /**
   * @notice This function is helper function for deposit and redeem
   * @param _hopeLP address of token
   * @param tokenAmount amount of token for slippage
   * @param _deposit boolean value to check whether deposit or redeem
   * @param _lpSlippage value of lpslippage input by user
   * @param _to address to sent token
   * @return slippage value of slippage to consider
   */
  function getSlippage(
    address _hopeLP,
    uint256 tokenAmount,
    bool _deposit,
    uint256 _lpSlippage,
    address _to
  ) internal view returns (uint256) {
    uint256 expectedAmount;
    if (_deposit) {
      uint256[] memory _amount = new uint256[](2);
      _amount[0] = tokenAmount;
      _amount[1] = 0;
      expectedAmount = ISwap(IHOPELP(_hopeLP).swap()).calculateTokenAmount(_to, _amount, true);
    } else {
      expectedAmount = ISwap(IHOPELP(_hopeLP).swap()).calculateRemoveLiquidityOneToken(_to, tokenAmount, 0);
    }
    return expectedAmount - ((expectedAmount * _lpSlippage) / 10000);
  }

  function getFairLpPrice(address _tokenHolder, address _token) public view returns (uint) {}

  function encodeData(address _token, uint256 _amount) public returns (bytes memory) {}

  function getRouterAddress() public view returns (address) {}

  function getClaimTokenCalldata(address _venusToken, address _holder) public pure returns (bytes memory, address) {}

  receive() external payable {}
}
