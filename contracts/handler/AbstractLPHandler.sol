// SPDX-License-Identifier: MIT

import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {RouterInterface} from "./interfaces/RouterInterface.sol";
import {SlippageControl} from "./SlippageControl.sol";
import {DustHandler} from "./DustHandler.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {FunctionParameters} from "../FunctionParameters.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import {LPInterface} from "./interfaces/LPInterface.sol";
import {Babylonian} from "@uniswap/lib/contracts/libraries/Babylonian.sol";
import {FactoryInterface} from "./interfaces/FactoryInterface.sol";
import {FullMath} from "./libraries/FullMath.sol";
import {IPriceOracle} from "../oracle/IPriceOracle.sol";

pragma solidity 0.8.16;

abstract contract UniswapV2LPHandler is SlippageControl, DustHandler {
  event VELVET_ADDED_LIQUIDITY(uint256[] amountProvided, uint256 minAmountA, uint256 minAmountB, uint256 liquidity);
  event VELVET_REMOVE_LIQUIDITY(uint256 liquidityProvided, uint256 amountA, uint256 amountB);
  uint256 public amountA;
  uint256 public amountB;
  uint256 public liquidity;

  function _approveAndDeposit(
    address[] memory underlying,
    address _router,
    uint256[] memory _amount,
    address _to
  ) internal {
    TransferHelper.safeApprove(address(underlying[0]), _router, 0);
    TransferHelper.safeApprove(address(underlying[0]), _router, _amount[0]);
    TransferHelper.safeApprove(address(underlying[1]), _router, 0);
    TransferHelper.safeApprove(address(underlying[1]), _router, _amount[1]);

    (amountA, amountB, liquidity) = RouterInterface(_router).addLiquidity(
      address(underlying[0]),
      address(underlying[1]),
      _amount[0],
      _amount[1],
      1,
      1,
      _to,
      block.timestamp
    );
  }

  function _approveAndDepositETH(
    address[] memory underlying,
    address _router,
    uint256[] memory _amount,
    address _to
  ) internal {
    RouterInterface router = RouterInterface(_router);
    uint256 i = underlying[0] == router.WETH() ? 1 : 0;
    TransferHelper.safeApprove(address(underlying[i]), _router, 0);
    TransferHelper.safeApprove(address(underlying[i]), _router, _amount[i]);
    (amountA, amountB, liquidity) = router.addLiquidityETH{value: msg.value}(
      underlying[i],
      _amount[i],
      1,
      1,
      _to,
      block.timestamp
    );
  }

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
    address _oracle,
    uint priceA,
    uint priceB
  ) internal returns (uint256 _mintedAmount) {
    if (_lpAsset == address(0) || _to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory underlying = _getUnderlyingTokens(_lpAsset);
    if (msg.value == 0) {
      _approveAndDeposit(underlying, routerAddress, _amount, _to);
    } else {
      _approveAndDepositETH(underlying, routerAddress, _amount, _to);
    }
    validateLPSlippage(underlying, amountA, amountB, priceA, priceB, _lpSlippage);

    _returnDust(
      underlying[0],
      user // we need to pass user from exchange
    );
    _returnDust(
      underlying[1],
      user // we need to pass user from exchange
    );
    emit VELVET_ADDED_LIQUIDITY(_amount, amountA, amountB, liquidity);

    _mintedAmount = _calculatePriceForBalance(_lpAsset, _oracle, liquidity);
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
    }
    validateLPSlippage(underlying, amountA, amountB, priceA, priceB, inputData._lpSlippage);
    emit VELVET_REMOVE_LIQUIDITY(inputData._amount, amountA, amountB);
  }

  function _calculatePriceForBalance(
    address _token,
    address _oracle,
    uint256 _balance
  ) internal view returns (uint256 finalLPPrice) {
    if (_token == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    uint fairLPPrice = IPriceOracle(_oracle).getPriceForOneTokenInUSD(_token);

    uint256 _tokenDecimal = IERC20Metadata(_token).decimals();
    finalLPPrice = (fairLPPrice * _balance) / (10 ** _tokenDecimal);
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
   * @notice This function returns the protocol token balance of the passed address
   * @param _amountA Amount of token A from the LP
   * @param _amountA Amount of token A from the LP
   * @param _priceA Price of token A from the oracle
   * @param _priceB Price of token B from the oracle
   * @param _lpSlippage LP slippage sent by the user
   */

  function validateLPSlippage(
    address[] memory _underlying,
    uint _amountA,
    uint _amountB,
    uint _priceA,
    uint _priceB,
    uint _lpSlippage
  ) internal view {
    uint decimalFixedAmountA = (_amountA * (10 ** 18)) / (10 ** IERC20Metadata(_underlying[0]).decimals());
    uint decimalFixedAmountB = (_amountB * (10 ** 18)) / (10 ** IERC20Metadata(_underlying[1]).decimals());
    _validateLPSlippage(decimalFixedAmountA, decimalFixedAmountB, _priceA, _priceB, _lpSlippage);
  }
}
