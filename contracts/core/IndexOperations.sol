// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {FunctionParameters} from "../FunctionParameters.sol";

import {IHandler} from "../handler/IHandler.sol";

import {IExchange} from "./IExchange.sol";
import {IIndexSwap} from "./IIndexSwap.sol";
import {ITokenRegistry} from "../registry/ITokenRegistry.sol";
import {IndexSwapLibrary} from "./IndexSwapLibrary.sol";
import {IOffChainIndexSwap} from "./IOffChainIndexSwap.sol";
import {IWETH} from "../interfaces/IWETH.sol";

import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";
import {IndexSwapLibrary} from "./IndexSwapLibrary.sol";

import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";
import {Ownable} from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";
import {SafeMath} from "@openzeppelin/contracts-4.8.2/utils/math/SafeMath.sol";

import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";

contract IndexOperations is Ownable {
  using SafeMath for uint256;

  /**
   * @notice Calculates the swap amount based on the passed params
   */
  function getSwapAmount(
    uint256 _totalSupply,
    uint256 _tokenAmount,
    uint256 _amount,
    uint256 _denorm
  ) internal pure virtual returns (uint256 swapAmount) {
    if (_totalSupply == 0) {
      swapAmount = _tokenAmount.mul(_denorm).div(10_000);
    } else {
      swapAmount = _amount;
    }
  }

  /**
   * @notice Swaps one token to another based on the input
   */
  function _swapTokenToTokens(
    FunctionParameters.SwapTokenToTokensData memory inputData
  ) external payable virtual returns (uint256 investedAmountAfterSlippage) {
    IIndexSwap _index = IIndexSwap(inputData._index);
    address[] memory _tokens = _index.getTokens();
    for (uint256 i = 0; i < _tokens.length; i++) {
      IExchange exchange = IExchange(_index.exchange());
      address vault = _index.vault();
      uint256 swapAmount = getSwapAmount(
        inputData._totalSupply,
        inputData._tokenAmount,
        inputData.amount[i],
        uint256(_index.getRecord(_tokens[i]).denorm)
      );

      IHandler handler = IHandler(ITokenRegistry(_index.tokenRegistry()).getTokenInformation(_tokens[i]).handler);
      address[] memory underlying = handler.getUnderlying(_tokens[i]);
      uint256[] memory swapResult = new uint256[](underlying.length);
      if (ITokenRegistry(_index.tokenRegistry()).WETH() == inputData._inputToken) {
        if (address(this).balance < swapAmount) {
          revert ErrorLibrary.NotEnoughBNB();
        }
        swapResult = exchange._swapETHToToken{value: swapAmount}(
          FunctionParameters.SwapETHToTokenData(
            _tokens[i],
            vault,
            inputData._swapHandler,
            inputData._slippage[i],
            inputData._lpSlippage[i]
          )
        );
      } else if (inputData._inputToken == _tokens[i]) {
        swapResult[0] = swapAmount;
        TransferHelper.safeTransfer(inputData._inputToken, vault, swapAmount);
      } else {
        TransferHelper.safeTransfer(inputData._inputToken, address(exchange), swapAmount);
        swapResult = exchange._swapTokenToToken(
          FunctionParameters.SwapTokenToTokenData(
            inputData._inputToken,
            _tokens[i],
            vault,
            inputData._swapHandler,
            swapAmount,
            inputData._slippage[i],
            inputData._lpSlippage[i],
            true
          )
        );
      }
      for (uint256 j = 0; j < swapResult.length; j++) {
        investedAmountAfterSlippage = investedAmountAfterSlippage.add(
          IndexSwapLibrary._getTokenAmountInUSD(exchange.oracle(), underlying[j], swapResult[j])
        );
      }
    }
  }

  /**
   * @notice The function swaps and calculate the balance in usd and underlyIndex - used in offchainindexswap
   * @return balanceInUSD get balanceInUsd after swap
   * @return underlyingIndex is used to keep track of interations
   */
  function swapOffChainTokens(
    ExchangeData.IndexOperationData memory inputdata
  ) external virtual returns (uint256 balanceInUSD, uint256 underlyingIndex) {
    IndexSwapLibrary._whitelistAndHandlerCheck(inputdata._token, inputdata.inputData._offChainHandler, inputdata.index);

    //Checks if token is non primary
    if (!ITokenRegistry(inputdata.index.tokenRegistry()).getTokenInformation(inputdata._token).primary) {
      address[] memory underlying = inputdata.handler.getUnderlying(inputdata._token);
      uint256[] memory swapResult = new uint256[](underlying.length);
      address weth = ITokenRegistry(inputdata.index.tokenRegistry()).getETH();
      //Loops for underlying token
      for (uint256 j = 0; j < underlying.length; j++) {
        //Checks if sellToken == unserlying(buyToken) and buyToken should not be equal to eth(buyToken != eth)
        if (inputdata.inputData.sellTokenAddress == underlying[j] && underlying[j] != weth) {
          swapResult[j] = inputdata.inputData.buyAmount[inputdata.indexValue];
          inputdata.balance = getBalanceAndTransfer(
            swapResult[j],
            inputdata.balance,
            underlying[j],
            address(inputdata.handler),
            inputdata.index,
            false
          );
        }
        //Checks if sellToken == eth(buyToken) and buyToken == ETH
        else if (underlying[j] == weth && inputdata.inputData.sellTokenAddress == weth) {
          swapResult[j] = inputdata.inputData.buyAmount[inputdata.indexValue];
          inputdata.balance = inputdata.balance.add(
            IndexSwapLibrary._getTokenAmountInUSD(inputdata.index.oracle(), underlying[j], swapResult[j])
          );
          IWETH(underlying[j]).withdraw(swapResult[j]);
        }
        //If non of the above condition satisifes
        else {
          (inputdata.balance, swapResult[j]) = swapAndCalculate(
            inputdata.inputData,
            inputdata.index,
            inputdata.balance,
            address(inputdata.handler),
            inputdata.indexValue,
            inputdata.protocolFee,
            underlying[j] == weth
          );
        }

        balanceInUSD = inputdata.balance;
        inputdata.indexValue = inputdata.indexValue.add(1);
        underlyingIndex = inputdata.indexValue;
      }
      //It deposit tokens and send to vault
      handlerDeposit(
        inputdata.index,
        inputdata.handler,
        inputdata._token,
        inputdata.index.vault(),
        swapResult,
        inputdata._lpSlippage
      );
    }
    //If Token Is Not Primary
    else {
      //If sellToken == buyToken
      if (inputdata.inputData.sellTokenAddress == inputdata._token) {
        balanceInUSD = getBalanceAndTransfer(
          inputdata.inputData.buyAmount[inputdata.indexValue],
          inputdata.balance,
          inputdata._token,
          inputdata.index.vault(),
          inputdata.index,
          false
        );
      }
      //If above condfiton does not satifies or (buyToken != sellToken)
      else {
        (balanceInUSD, ) = swapAndCalculate(
          inputdata.inputData,
          inputdata.index,
          inputdata.balance,
          inputdata.index.vault(),
          inputdata.indexValue,
          inputdata.protocolFee,
          false
        );
      }

      inputdata.indexValue = inputdata.indexValue.add(1);
      underlyingIndex = inputdata.indexValue;
    }
  }

  /**
   * @notice The function swapToken using zeroExHandler and calcualte the swapAmount in USD
   * @return balanceInUSD get balanceInUsd after swap
   * @return swapRes returns the amount obtained after swap
   */
  function swapAndCalculate(
    ExchangeData.ZeroExData memory inputData,
    IIndexSwap _indexAddress,
    uint256 balance,
    address _to,
    uint256 _index,
    uint256 _protocolFee,
    bool isETH
  ) internal virtual returns (uint256 balanceInUSD, uint256 swapRes) {
    uint256 balanceBefore = IERC20Upgradeable(inputData._buyToken[_index]).balanceOf(address(this));
    IndexSwapLibrary._transferAndSwapUsingOffChainHandler(
      inputData.sellTokenAddress,
      inputData._buyToken[_index],
      inputData.buyAmount[_index],
      address(this),
      inputData._buySwapData[_index],
      inputData._offChainHandler,
      _protocolFee
    );
    uint256 balanceAfter = IERC20Upgradeable(inputData._buyToken[_index]).balanceOf(address(this));
    swapRes = balanceAfter.sub(balanceBefore);
    require(swapRes > 0, "Zero Swap Amount");
    balanceInUSD = getBalanceAndTransfer(swapRes, balance, inputData._buyToken[_index], _to, _indexAddress, isETH);
  }

  /**
   * @notice This internal function returns balanceInusd and transfer token to "_to" address
   * @return balanceInUSD get balanceInUsd using oracle and amount to transfer
   */
  function getBalanceAndTransfer(
    uint256 _amount,
    uint256 _balance,
    address _token,
    address _to,
    IIndexSwap _index,
    bool isETH
  ) internal virtual returns (uint256 balanceInUSD) {
    balanceInUSD = _balance.add(IndexSwapLibrary._getTokenAmountInUSD(_index.oracle(), _token, _amount));
    if (isETH) {
      IWETH(_token).withdraw(_amount);
    } else {
      TransferHelper.safeTransfer(_token, _to, _amount);
    }
  }

  /**
   * @notice This internal function deposit tokens to vault using other handlers
   */
  function handlerDeposit(
    IIndexSwap index,
    IHandler handler,
    address _token,
    address _to,
    uint256[] memory swapResult,
    uint256 _lpSlippage
  ) internal virtual {
    if (IExchange(index.exchange()).isWETH(_token, address(handler))) {
      handler.deposit{value: address(this).balance}(_token, swapResult, _lpSlippage, _to);
      //If Not BNB
    } else {
      handler.deposit(_token, swapResult, _lpSlippage, _to);
    }
  }

  receive() external payable {}
}
