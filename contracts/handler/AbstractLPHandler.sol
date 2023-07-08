// SPDX-License-Identifier: MIT

import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {RouterInterface} from "./interfaces/RouterInterface.sol";
import {SlippageControl} from "./SlippageControl.sol";
import {DustHandler} from "./DustHandler.sol";

import {FunctionParameters} from "../FunctionParameters.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import {LPInterface} from "./interfaces/LPInterface.sol";
import {Babylonian} from "@uniswap/lib/contracts/libraries/Babylonian.sol";
import {FactoryInterface} from "./interfaces/FactoryInterface.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";
import {FullMath} from "./libraries/FullMath.sol";
import {IPriceOracle} from "../oracle/IPriceOracle.sol";
pragma solidity 0.8.16;

abstract contract UniswapV2LPHandler is SlippageControl, DustHandler {
  using SafeMathUpgradeable for uint;
  event VELVET_ADDED_LIQUIDITY(uint256[] amountProvided, uint256 minAmountA, uint256 minAmountB, uint256 liquidity);
  event VELVET_REMOVE_LIQUIDITY(uint256 liquidityProvided, uint256 amountA, uint256 amountB);
  uint256 public amountA;
  uint256 public amountB;
  uint256 public liquidity;

  uint256 internal constant ONE_ETH = 1000000000000000000;

  /**
   * @notice This function adds liquidity to the BiSwap protocol
   * @param _lpAsset Address of the protocol asset to be deposited
   * @param _amount Amount that is to be deposited
   * @param _lpSlippage LP slippage value passed to the function
   * @param _to Address that would receive the cTokens in return
   * @param routerAddress Address of the protocol called
   */
  function _deposit(
    address _lpAsset,
    uint256[] memory _amount,
    uint256 _lpSlippage,
    address _to,
    address routerAddress,
    address user,
    uint priceA,
    uint priceB
  ) internal {
    if (_lpAsset == address(0) || _to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory underlying = _getUnderlyingTokens(_lpAsset);
    RouterInterface router = RouterInterface(routerAddress);
    if (msg.value == 0) {
      TransferHelper.safeApprove(address(underlying[0]), address(router), 0);
      TransferHelper.safeApprove(address(underlying[0]), address(router), _amount[0]);
      TransferHelper.safeApprove(address(underlying[1]), address(router), 0);
      TransferHelper.safeApprove(address(underlying[1]), address(router), _amount[1]);

      (amountA, amountB, liquidity) = router.addLiquidity(
        address(underlying[0]),
        address(underlying[1]),
        _amount[0],
        _amount[1],
        1,
        1,
        _to,
        block.timestamp
      );

      _returnDust(
        underlying[0],
        user // we need to pass user from exchange
      );
      _returnDust(
        underlying[1],
        user // we need to pass user from exchange
      );

      _validateLPSlippage(amountA, amountB, priceA, priceB, _lpSlippage);
    } else {
      uint256 i = underlying[0] == router.WETH() ? 1 : 0;
      TransferHelper.safeApprove(address(underlying[i]), address(router), 0);
      TransferHelper.safeApprove(address(underlying[i]), address(router), _amount[i]);
      (amountA, amountB, liquidity) = router.addLiquidityETH{value: msg.value}(
        underlying[i],
        _amount[i],
        1,
        1,
        _to,
        block.timestamp
      );

      _returnDust(
        router.WETH(),
        user // we need to pass user from exchange
      );
      _returnDust(
        underlying[i],
        user // we need to pass user from exchange
      );

      _validateLPSlippage(amountA, amountB, priceA, priceB, _lpSlippage);
    }
    emit VELVET_ADDED_LIQUIDITY(_amount, amountA, amountB, liquidity);
  }

  /**
   * @notice This function remove liquidity from the called protocol
   */
  function _redeem(
    FunctionParameters.RedeemData calldata inputData,
    address routerAddress,
    uint priceA,
    uint priceB
  ) internal {
    if (inputData._yieldAsset == address(0) || inputData._to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    LPInterface token = LPInterface(inputData._yieldAsset);
    if (inputData._amount > token.balanceOf(address(this))) {
      revert ErrorLibrary.NotEnoughBalanceInPancakeProtocol();
    }
    address[] memory underlying = _getUnderlyingTokens(inputData._yieldAsset);
    RouterInterface router = RouterInterface(routerAddress);
    if (inputData.isWETH) {
      uint256 indexi = 0;
      uint256 indexj = 1;
      if (underlying[0] == router.WETH()) {
        indexi = 1;
        indexj = 0;
      }
      TransferHelper.safeApprove(address(token), address(router), 0);
      TransferHelper.safeApprove(address(token), address(router), inputData._amount);
      (amountA, amountB) = router.removeLiquidityETH(
        underlying[indexi],
        inputData._amount,
        1,
        1,
        inputData._to,
        block.timestamp
      );
      _validateLPSlippage(amountA, amountB, priceA, priceB, inputData._lpSlippage);
    } else {
      TransferHelper.safeApprove(address(token), address(router), 0);
      TransferHelper.safeApprove(address(token), address(router), inputData._amount);
      (amountA, amountB) = router.removeLiquidity(
        underlying[0],
        underlying[1],
        inputData._amount,
        1,
        1,
        inputData._to,
        block.timestamp
      );
      _validateLPSlippage(amountA, amountB, priceA, priceB, inputData._lpSlippage);
    }
    emit VELVET_REMOVE_LIQUIDITY(inputData._amount, amountA, amountB);
  }

  /**
   * @notice This function is used to fetch liquidty amount for given lp asset
   */
  function _getLiquidityValue(
    address lpToken,
    uint256 liquidityAmount
  ) internal view returns (uint256 tokenAAmount, uint256 tokenBAmount) {
    if (lpToken == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    (uint256 reservesA, uint256 reservesB, ) = LPInterface(lpToken).getReserves();
    LPInterface pair = LPInterface(lpToken);
    bool feeOn = FactoryInterface(pair.factory()).feeTo() != address(0);
    uint256 kLast = feeOn ? pair.kLast() : 0;
    uint256 totalSupply = pair.totalSupply();
    return _computeLiquidityValue(reservesA, reservesB, totalSupply, liquidityAmount, feeOn, kLast);
  }

  /**
   * @notice This function is used to compute liquidty for various operations.
   */
  function _computeLiquidityValue(
    uint256 reservesA,
    uint256 reservesB,
    uint256 totalSupply,
    uint256 liquidityAmount,
    bool feeOn,
    uint256 kLast
  ) internal pure returns (uint256 tokenAAmount, uint256 tokenBAmount) {
    if (feeOn && kLast > 0) {
      uint256 rootK = Babylonian.sqrt(reservesA.mul(reservesB));
      uint256 rootKLast = Babylonian.sqrt(kLast);
      if (rootK > rootKLast) {
        uint256 numerator1 = totalSupply;
        uint256 numerator2 = rootK.sub(rootKLast);
        uint256 denominator = rootK.mul(5).add(rootKLast);
        uint256 feeLiquidity = FullMath.mulDiv(numerator1, numerator2, denominator);
        totalSupply = totalSupply.add(feeLiquidity);
      }
    }
    return (reservesA.mul(liquidityAmount) / totalSupply, reservesB.mul(liquidityAmount) / totalSupply);
  }

  /**
   * @notice This function is used to liquidty fair value price
   */
  function _calculatePrice(address t, address priceOracle) internal view returns (uint256) {
    address[] memory underlying = _getUnderlyingTokens(t);
    LPInterface _asset = LPInterface(t);
    (uint reserve0, uint reserve1, ) = _asset.getReserves();
    uint totalSupply = _asset.totalSupply();
    uint price0 = IPriceOracle(priceOracle).getPriceTokenUSD18Decimals(underlying[0], ONE_ETH);
    uint price1 = IPriceOracle(priceOracle).getPriceTokenUSD18Decimals(underlying[1], ONE_ETH);

    uint256 sqrtReserve = Babylonian.sqrt(reserve0.mul(reserve1));
    uint256 sqrtPrice = Babylonian.sqrt(price0.mul(price1));
    uint256 price = sqrtReserve.mul(sqrtPrice).mul(2).div(totalSupply);
    return price;
  }

  /**
   * @notice This function returns address of the underlying asset
   * @param _lpToken Address of the protocol token whose underlying asset is needed
   * @return underlying Address of the underlying asset
   */
  function _getUnderlyingTokens(address _lpToken) internal view virtual returns (address[] memory) {
    if (_lpToken == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory underlying = new address[](2);
    LPInterface token = LPInterface(_lpToken);
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
  function _getTokenBalance(address _tokenHolder, address t) internal view returns (uint256 tokenBalance) {
    if (_tokenHolder == address(0) || t == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    LPInterface token = LPInterface(t);
    tokenBalance = token.balanceOf(_tokenHolder);
  }

  /**
   * @notice This function returns the underlying asset balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token's underlying asset balance of the holder
   */
  function _getUnderlyingBalance(address _tokenHolder, address t) internal view returns (uint256[] memory) {
    if (_tokenHolder == address(0) || t == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    uint256[] memory tokenBalance = new uint256[](2);
    uint256 balance = _getTokenBalance(_tokenHolder, t);
    (tokenBalance[0], tokenBalance[1]) = _getLiquidityValue(t, balance);
    return tokenBalance;
  }
}
