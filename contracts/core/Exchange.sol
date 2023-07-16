// SPDX-License-Identifier: MIT

/**
 * @title IndexManager for a particular Index
 * @author Velvet.Capital
 * @notice This contract is used for transferring funds form vault to contract and vice versa 
           and swap tokens to and fro from BNB
 * @dev This contract includes functionalities:
 *      1. Deposit tokens to vault
 *      2. Withdraw tokens from vault
 *      3. Swap BNB for tokens
 *      4. Swap tokens for BNB
 */

pragma solidity 0.8.16;

import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {UUPSUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";
import {IIndexSwap} from "./IIndexSwap.sol";
import {IWETH} from "../interfaces/IWETH.sol";
import {IPriceOracle} from "../oracle/IPriceOracle.sol";

import {IndexSwapLibrary} from "../core/IndexSwapLibrary.sol";

import {IAccessController} from "../access/IAccessController.sol";
import {IVelvetSafeModule} from "../vault/IVelvetSafeModule.sol";

import {ISwapHandler} from "../handler/ISwapHandler.sol";

import {IExchange} from "./IExchange.sol";
import {IHandler} from "../handler/IHandler.sol";
import {ITokenRegistry} from "../registry/ITokenRegistry.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import {FunctionParameters} from "../FunctionParameters.sol";
import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";

contract Exchange is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable, OwnableUpgradeable {
  IAccessController internal accessController;
  IVelvetSafeModule internal safe;
  IPriceOracle internal oracle;
  ITokenRegistry internal tokenRegistry;
  address internal WETH;
  address internal zeroAddress;

  constructor() {
    _disableInitializers();
  }

  using SafeMathUpgradeable for uint256;

  event TokensClaimed(uint256 indexed time, address indexed _index, address[] _tokens);

  event RewardTokensDistributed(address indexed _index, address indexed _rewardToken, uint256 indexed diff);

  /**
   * @notice This function is used to init the Exchange while deployment
   * @param _accessController Address of the access controller
   * @param _module Address of the safe module attached to the index
   * @param _oracle Address of the price oracle being used
   * @param _tokenRegistry Address of the token registry
   */
  function init(
    address _accessController,
    address _module,
    address _oracle,
    address _tokenRegistry
  ) external initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();
    zeroAddress = address(0);
    if (
      _accessController == zeroAddress ||
      _module == zeroAddress ||
      _oracle == zeroAddress ||
      _tokenRegistry == zeroAddress
    ) {
      revert ErrorLibrary.InvalidAddress();
    }
    accessController = IAccessController(_accessController);
    safe = IVelvetSafeModule(_module);
    oracle = IPriceOracle(_oracle);
    tokenRegistry = ITokenRegistry(_tokenRegistry);
    WETH = tokenRegistry.getETH();
  }

  /**
   * @notice This function checks if a token is WETH (BNB)
   * @param _token Address of the token to be checked
   * @param _protocol Address of the protocol in question
   */
  function isWETH(address _token, address _protocol) public view virtual returns (bool) {
    IHandler protocol = IHandler(_protocol);
    address[] memory underlying = protocol.getUnderlying(_token);
    address _token1 = underlying[0];
    if (underlying.length == 1) {
      return _token1 == WETH;
    }
    return (_token1 == WETH || underlying[1] == WETH);
  }

  modifier onlyIndexManager() {
    if (!(accessController.hasRole(keccak256("INDEX_MANAGER_ROLE"), msg.sender))) {
      revert ErrorLibrary.CallerNotIndexManager();
    }
    _;
  }

  /**
   * @notice The function claims additional reward tokens
   * @dev Requires the tokens to be send to this contract address before swapping
   * @param _index The index to claim for
   * @param _tokens The derivative tokens to claim for
   */
  function claimTokens(IIndexSwap _index, address[] calldata _tokens) external onlyIndexManager {
    for (uint256 i = 0; i < _tokens.length; i++) {
      address _token = _tokens[i];
      IHandler handler = IHandler(getTokenInfo(_token).handler);

      (bytes memory callData, address callAddress) = handler.getClaimTokenCalldata(_token, _index.vault());

      if (callAddress != zeroAddress) {
        safe.executeWallet(callAddress, callData);
      }
    }

    emit TokensClaimed(block.timestamp, address(_index), _tokens);
  }

  /**
   * @notice Transfer tokens from vault to a specific address
   * @param token Address of the token to be pulled
   * @param amount Amount of the token to be pulled
   * @param to Address where the pulled token has to be sent
   */
  function _pullFromVault(address token, uint256 amount, address to) external nonReentrant onlyIndexManager {
    IHandler handler = IHandler(getTokenInfo(token).handler);

    if (tokenRegistry.checkNonDerivative(address(handler))) {
      safe.executeWallet(handler.getRouterAddress(), handler.encodeData(token, amount));
    }

    _safeTokenTransfer(token, amount, to);
  }

  /**
   * @notice Internal function to transfer tokens from vault to a specific address
   * @param token Address of the token to be pulled
   * @param amount Amount of the token to be pulled
   * @param to Address where the pulled token has to be sent
   */

  function _safeTokenTransfer(address token, uint256 amount, address to) internal {
    bytes memory inputData = abi.encodeWithSelector(IERC20Upgradeable.transfer.selector, to, amount);

    safe.executeWallet(token, inputData);
  }

  /**
   * @notice Transfer tokens from vault to a specific address
   */
  function _pullFromVaultRewards(address token, uint256 amount, address to) external onlyIndexManager {
    _safeTokenTransfer(token, amount, to);
  }

  /**
   * @notice The function is called from the `swapETHToToken` function and is used to swap ETH to a specific token
   * @param inputData Contains the input params for the function
   */
  function _swapETHToToken(FunctionParameters.SwapETHToTokenData memory inputData) internal returns (uint256[] memory) {
    address token = inputData._token;
    ITokenRegistry.TokenRecord memory tokenInfo = getTokenInfo(token);
    IHandler handler = IHandler(tokenInfo.handler);
    ISwapHandler swapHandler = ISwapHandler(inputData._swapHandler);
    if (!(tokenRegistry.isSwapHandlerEnabled(address(swapHandler)))) {
      revert ErrorLibrary.SwapHandlerNotEnabled();
    }
    address user = inputData._toUser;
    address[] memory underlying = handler.getUnderlying(token);
    uint256[] memory swapResult = new uint256[](underlying.length);
    uint256 swapValue = underlying.length > 1 ? inputData._swapAmount.div(2) : inputData._swapAmount;
    address to = inputData._to;

    if (isWETH(token, address(handler))) {
      for (uint256 i = 0; i < underlying.length; i++) {
        swapResult[i] = swapValue;
      }

      if (tokenInfo.primary) {
        IWETH(token).deposit{value: swapValue}();
        if (to != address(this)) {
          IWETH(token).transfer(to, swapValue);
        }
      } else {
        if (underlying.length > 1) {
          uint256 t = underlying[0] == WETH ? 1 : 0;
          swapResult[t] = swapHandler.swapETHToTokens{value: swapValue}(
            inputData._slippage,
            underlying[t],
            address(handler)
          );
        }
        handler.deposit{value: swapValue}(token, swapResult, inputData._lpSlippage, to, user);
      }
    } else {
      address _toAddress = to;
      if (!tokenInfo.primary) {
        _toAddress = address(handler);
      }
      for (uint256 i = 0; i < underlying.length; i++) {
        swapResult[i] = swapHandler.swapETHToTokens{value: swapValue}(inputData._slippage, underlying[i], _toAddress);
      }
      if (!tokenInfo.primary) {
        handler.deposit(token, swapResult, inputData._lpSlippage, to, user);
      }
    }
    return swapResult;
  }

  /**
   * @notice The function swaps ETH to a specific token
   * @param inputData includes the input parmas
   */
  function swapETHToToken(
    FunctionParameters.SwapETHToTokenPublicData memory inputData
  ) external payable onlyIndexManager {
    _swapETHToToken(
      FunctionParameters.SwapETHToTokenData(
        inputData._token,
        inputData._to,
        inputData._swapHandler,
        inputData._toUser,
        inputData._slippage,
        inputData._lpSlippage,
        msg.value
      )
    );
  }

  /**
   * @notice The function swaps a specific token to ETH
   * @dev Requires the tokens to be send to this contract address before swapping
   * @param inputData includes the input parmas
   * @return swapResult The outcome amount in ETH afer swapping
   */
  function _swapTokenToETH(
    FunctionParameters.SwapTokenToETHData memory inputData
  ) public onlyIndexManager returns (uint256[] memory) {
    uint256 swapAmount = inputData._swapAmount;
    address _token = inputData._token;
    ITokenRegistry.TokenRecord memory tokenInfo = getTokenInfo(_token);
    IHandler handler = IHandler(tokenInfo.handler);
    ISwapHandler swapHandler = ISwapHandler(inputData._swapHandler);
    if (!(tokenRegistry.isSwapHandlerEnabled(address(swapHandler)))) {
      revert ErrorLibrary.SwapHandlerNotEnabled();
    }
    address[] memory underlying = handler.getUnderlying(_token);
    uint256[] memory swapResult = new uint256[](underlying.length);

    if (!tokenInfo.primary) {
      TransferHelper.safeTransfer(_token, address(handler), swapAmount);
      handler.redeem(
        FunctionParameters.RedeemData(
          swapAmount,
          inputData._lpSlippage,
          address(this),
          _token,
          isWETH(_token, address(handler))
        )
      );
    }
    for (uint256 i = 0; i < underlying.length; i++) {
      address underlyingToken = underlying[i];
      address to = inputData._to;
      uint256 slippage = inputData._slippage;
      if (underlyingToken == WETH) {
        if (tokenInfo.primary) {
          IWETH(_token).withdraw(swapAmount);
        }
        swapResult[i] = address(this).balance;
        if (swapResult[i] == 0) {
          revert ErrorLibrary.ZeroBalanceAmount();
        }
        (bool success, ) = payable(to).call{value: swapResult[i]}("");
        require(success, "Transfer failed.");
      } else {
        if (!tokenInfo.primary) {
          IERC20Upgradeable token = IERC20Upgradeable(underlyingToken);
          swapAmount = token.balanceOf(address(this));
        }
        if (swapAmount == 0) {
          revert ErrorLibrary.ZeroBalanceAmount();
        }
        swapResult[i] = IndexSwapLibrary.transferAndSwapTokenToETH(
          underlyingToken,
          swapHandler,
          swapAmount,
          slippage,
          to,
          tokenInfo.enabled
        );
      }
    }
    return swapResult;
  }

  /**
   * @notice This function swaps one token to another
   * @param inputData Includes the input params
   * @return swapResult Final outcome after swap
   */
  function _swapTokenToToken(
    FunctionParameters.SwapTokenToTokenData memory inputData
  ) public onlyIndexManager returns (uint256[] memory) {
    ISwapHandler swapHandler = ISwapHandler(inputData._swapHandler);
    if (!(tokenRegistry.isSwapHandlerEnabled(address(swapHandler)))) {
      revert ErrorLibrary.SwapHandlerNotEnabled();
    }
    uint256[] memory swapResult;
    address tokenIn = inputData._tokenIn;
    address tokenOut = inputData._tokenOut;
    ITokenRegistry.TokenRecord memory tokenInfoIn = getTokenInfo(tokenIn);
    ITokenRegistry.TokenRecord memory tokenInfoOut = getTokenInfo(tokenOut);
    if (!tokenInfoIn.primary || !tokenInfoOut.primary) {
      if (inputData._isInvesting) {
        swapResult = _swapTokenToTokenInvest(inputData, tokenInfoIn.enabled);
      } else {
        swapResult = _swapTokenToTokenWithdraw(inputData);
      }
    } else {
      IHandler handler = IHandler(tokenInfoOut.handler);
      swapResult = new uint256[](1);
      if (isWETH(tokenOut, address(handler))) {
        address to = inputData._to;
        if (inputData._isInvesting) {
          to = address(this);
        }
        _swapTokenToETH(
          FunctionParameters.SwapTokenToETHData(
            tokenIn,
            to,
            inputData._swapHandler,
            inputData._swapAmount,
            inputData._slippage,
            inputData._lpSlippage
          )
        );
        if (inputData._isInvesting) {
          uint256 balance = address(this).balance;
          IWETH(tokenOut).deposit{value: balance}();
          if (inputData._to != address(this)) {
            IWETH(tokenOut).transfer(inputData._to, balance);
          }
        }
      } else {
        swapResult[0] = IndexSwapLibrary.transferAndSwapTokenToToken(
          tokenIn,
          swapHandler,
          inputData._swapAmount,
          inputData._slippage,
          tokenOut,
          inputData._to,
          tokenInfoIn.enabled
        );
      }
    }
    return swapResult;
  }

  /**
   * @notice This function swaps one token to another while investing
   * @param inputData Includes the input params
   * @return swapResult Final amount after swap
   */
  function _swapTokenToTokenInvest(
    FunctionParameters.SwapTokenToTokenData memory inputData,
    bool isEnabled
  ) internal returns (uint256[] memory) {
    IHandler handler = IHandler(getTokenInfo(inputData._tokenOut).handler);
    ISwapHandler swapHandler = ISwapHandler(inputData._swapHandler);
    address[] memory underlying = handler.getUnderlying(inputData._tokenOut);
    uint256[] memory swapResult = new uint256[](underlying.length);
    if (IERC20Upgradeable(inputData._tokenIn).balanceOf(address(this)) < inputData._swapAmount) {
      revert ErrorLibrary.InvalidAmount();
    }
    uint256 swapValue = getSwapVaule(underlying.length, inputData._swapAmount);
    for (uint256 i = 0; i < underlying.length; i++) {
      if (inputData._tokenIn == underlying[i] && inputData._tokenIn != WETH) {
        swapResult[i] = swapValue;
        TransferHelper.safeTransfer(inputData._tokenIn, address(handler), swapValue);
      } else if (underlying[i] == WETH) {
        swapResult[i] = IndexSwapLibrary.transferAndSwapTokenToETH(
          inputData._tokenIn,
          swapHandler,
          swapValue,
          inputData._slippage,
          address(this),
          isEnabled
        );
      } else {
        swapResult[i] = IndexSwapLibrary.transferAndSwapTokenToToken(
          inputData._tokenIn,
          swapHandler,
          swapValue,
          inputData._slippage,
          underlying[i],
          address(handler),
          isEnabled
        );
      }
    }
    if (isWETH(inputData._tokenOut, address(handler))) {
      handler.deposit{value: address(this).balance}(
        inputData._tokenOut,
        swapResult,
        inputData._lpSlippage,
        inputData._to,
        inputData._toUser
      );
    } else {
      handler.deposit(inputData._tokenOut, swapResult, inputData._lpSlippage, inputData._to, inputData._toUser);
    }
    return swapResult;
  }

  function getSwapVaule(uint256 len, uint256 amount) internal pure returns (uint256) {
    return (len > 1 ? amount.div(2) : amount);
  }

  /**
   * @notice This function swaps one token to another while withdraw
   * @param inputData Includes the input params
   * @return swapResult Final amount after swap
   */
  function _swapTokenToTokenWithdraw(
    FunctionParameters.SwapTokenToTokenData memory inputData
  ) internal returns (uint256[] memory) {
    address tokenIn = inputData._tokenIn;
    uint256 slippage = inputData._slippage;
    IHandler handler = IHandler(getTokenInfo(tokenIn).handler);
    ISwapHandler swapHandler = ISwapHandler(inputData._swapHandler);
    address[] memory underlying = handler.getUnderlying(tokenIn);
    uint256[] memory swapResult = new uint256[](underlying.length);
    address tokenOut = inputData._tokenOut;
    address to = inputData._to;
    if (tokenOut == WETH) {
      swapResult = _swapTokenToETH(
        FunctionParameters.SwapTokenToETHData(
          tokenIn,
          to,
          inputData._swapHandler,
          inputData._swapAmount,
          slippage,
          inputData._lpSlippage
        )
      );
    } else {
      TransferHelper.safeTransfer(tokenIn, address(handler), inputData._swapAmount);
      handler.redeem(
        FunctionParameters.RedeemData(
          inputData._swapAmount,
          inputData._lpSlippage,
          address(this),
          tokenIn,
          isWETH(tokenIn, address(handler))
        )
      );
      for (uint256 i = 0; i < underlying.length; i++) {
        address underlyingToken = underlying[i];
        IERC20Upgradeable token = IERC20Upgradeable(underlyingToken);
        uint256 swapAmount = token.balanceOf(address(this));
        if (underlyingToken == tokenOut) {
          if (swapAmount == 0) {
            revert ErrorLibrary.ZeroBalanceAmount();
          }
          TransferHelper.safeTransfer(underlyingToken, to, swapAmount);
        } else if (underlyingToken == WETH) {
          swapAmount = address(this).balance;
          if (swapAmount == 0) {
            revert ErrorLibrary.ZeroBalanceAmount();
          }
          swapResult[i] = swapHandler.swapETHToTokens{value: swapAmount}(slippage, tokenOut, to);
        } else {
          if (swapAmount == 0) {
            revert ErrorLibrary.ZeroBalanceAmount();
          }
          swapResult[i] = IndexSwapLibrary.transferAndSwapTokenToToken(
            underlyingToken,
            swapHandler,
            swapAmount,
            slippage,
            tokenOut,
            to,
            true
          );
        }
      }
    }
    return swapResult;
  }

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
  ) external payable virtual onlyIndexManager returns (uint256 investedAmountAfterSlippage) {
    IIndexSwap _index = IIndexSwap(inputData._index);
    address[] memory _tokens = _index.getTokens();
    for (uint256 i = 0; i < _tokens.length; i++) {
      address vault = _index.vault();
      address _token = _tokens[i];
      uint256 swapAmount = getSwapAmount(
        inputData._totalSupply,
        inputData._tokenAmount,
        inputData.amount[i],
        uint256(_index.getRecord(_token).denorm)
      );

      IHandler handler = IHandler(getTokenInfo(_token).handler);
      address[] memory underlying = handler.getUnderlying(_token);
      uint256[] memory swapResult = new uint256[](underlying.length);
      if (WETH == inputData._inputToken) {
        if (address(this).balance < swapAmount) {
          revert ErrorLibrary.NotEnoughBNB();
        }
        swapResult = _swapETHToToken(
          FunctionParameters.SwapETHToTokenData(
            _token,
            vault,
            inputData._swapHandler,
            inputData._toUser,
            inputData._slippage[i],
            inputData._lpSlippage[i],
            swapAmount
          )
        );
      } else if (inputData._inputToken == _token) {
        swapResult[0] = swapAmount;
        TransferHelper.safeTransfer(inputData._inputToken, vault, swapAmount);
      } else {
        swapResult = _swapTokenToToken(
          FunctionParameters.SwapTokenToTokenData(
            inputData._inputToken,
            _token,
            vault,
            inputData._swapHandler,
            inputData._toUser,
            swapAmount,
            inputData._slippage[i],
            inputData._lpSlippage[i],
            true
          )
        );
      }
      for (uint256 j = 0; j < swapResult.length; j++) {
        investedAmountAfterSlippage = investedAmountAfterSlippage.add(
          oracle.getPriceTokenUSD18Decimals(underlying[j], swapResult[j])
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
  ) external virtual onlyIndexManager returns (uint256, uint256) {
    IndexSwapLibrary._whitelistAndHandlerCheck(inputdata._token, inputdata.inputData._offChainHandler, inputdata.index);
    address vault = inputdata.index.vault();
    //Checks if token is non primary
    IHandler handler = IHandler(getTokenInfo(inputdata._token).handler);
    if (!getTokenInfo(inputdata._token).primary) {
      address[] memory underlying = handler.getUnderlying(inputdata._token);
      uint256[] memory swapResult = new uint256[](underlying.length);
      uint256 ethBalance = 0;
      //Loops for underlying token
      for (uint256 j = 0; j < underlying.length; j++) {
        address _underlying = underlying[j];
        uint256 _amount = inputdata.inputData.buyAmount[inputdata.indexValue];
        validateAmount(inputdata._buyAmount, _amount, underlying.length);
        //Checks if sellToken == unserlying(buyToken) and buyToken should not be equal to eth(buyToken != eth)
        if (inputdata.inputData.sellTokenAddress == _underlying && _underlying != WETH) {
          swapResult[j] = _amount;
          inputdata.balance = getBalanceAndTransfer(
            swapResult[j],
            inputdata.balance,
            _underlying,
            address(handler),
            false
          );
        }
        //Checks if sellToken == eth(buyToken) and buyToken == ETH
        else if (_underlying == WETH && inputdata.inputData.sellTokenAddress == WETH) {
          swapResult[j] = _amount;
          ethBalance = _amount;
          inputdata.balance = inputdata.balance.add(oracle.getPriceTokenUSD18Decimals(_underlying, ethBalance));
          IWETH(_underlying).withdraw(ethBalance);
        }
        //If non of the above condition satisifes
        else {
          (inputdata.balance, swapResult[j]) = swapAndCalculate(
            inputdata.inputData,
            inputdata.balance,
            address(handler),
            inputdata.indexValue,
            inputdata.protocolFee,
            _underlying == WETH,
            _underlying
          );
        }

        inputdata.indexValue = inputdata.indexValue.add(1);
        if (_underlying == WETH) {
          ethBalance = swapResult[j];
        }
      }
      //It deposit tokens and send to vault
      handlerDeposit(
        handler,
        inputdata._token,
        vault,
        swapResult,
        inputdata._lpSlippage,
        ethBalance,
        inputdata._toUser
      );
      return (inputdata.balance, inputdata.indexValue);
    }
    //If Token Is Not Primary
    else {
      //If sellToken == buyToken
      uint256 balanceInUSD;
      uint256 _amount = inputdata.inputData.buyAmount[inputdata.indexValue];
      validateAmount(inputdata._buyAmount, _amount, 1);
      if (inputdata.inputData.sellTokenAddress == inputdata._token) {
        balanceInUSD = getBalanceAndTransfer(_amount, inputdata.balance, inputdata._token, vault, false);
      }
      //If above condfiton does not satifies or (buyToken != sellToken)
      else {
        (balanceInUSD, ) = swapAndCalculate(
          inputdata.inputData,
          inputdata.balance,
          vault,
          inputdata.indexValue,
          inputdata.protocolFee,
          false,
          inputdata._token
        );
      }

      inputdata.indexValue = inputdata.indexValue.add(1);
      return (balanceInUSD, inputdata.indexValue);
    }
  }

  /**
   * @notice This function validates the buy amount value during off-chain swap of tokens.
   * (Due to market conditions, the value returned by the function when called from frontend and via contract may differ.
   * Hence we represent it as percentage value)
   */
  function validateAmount(uint256 expectedAmount, uint256 userAmount, uint256 len) internal pure {
    uint256 PERCENTIn18Decimal = 10 ** 22;
    uint256 diff = expectedAmount.div(len).mul(PERCENTIn18Decimal).div(userAmount);
    uint256 diffPercentage = diff < PERCENTIn18Decimal ? PERCENTIn18Decimal.sub(diff) : diff.sub(PERCENTIn18Decimal);
    if (diffPercentage > PERCENTIn18Decimal) {
      revert ErrorLibrary.InvalidBuyValues();
    }
  }

  /**
   * @notice The function swapToken using zeroExHandler and calcualte the swapAmount in USD
   * @return balanceInUSD get balanceInUsd after swap
   * @return swapRes returns the amount obtained after swap
   */
  function swapAndCalculate(
    ExchangeData.InputData memory inputData,
    uint256 balance,
    address _to,
    uint256 _index,
    uint256 _protocolFee,
    bool isETH,
    address _token
  ) internal virtual returns (uint256 balanceInUSD, uint256 swapRes) {
    uint256 balanceBefore = IERC20Upgradeable(_token).balanceOf(address(this));
    IndexSwapLibrary._transferAndSwapUsingOffChainHandler(
      inputData.sellTokenAddress,
      _token,
      inputData.buyAmount[_index],
      address(this),
      inputData._buySwapData[_index],
      inputData._offChainHandler,
      _protocolFee
    );
    uint256 balanceAfter = IERC20Upgradeable(_token).balanceOf(address(this));
    swapRes = balanceAfter.sub(balanceBefore);
    if (swapRes <= 0) {
      revert ErrorLibrary.InvalidAmount();
    }
    balanceInUSD = getBalanceAndTransfer(swapRes, balance, _token, _to, isETH);
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
    bool isETH
  ) internal virtual returns (uint256 balanceInUSD) {
    balanceInUSD = _balance.add(oracle.getPriceTokenUSD18Decimals(_token, _amount));
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
    IHandler handler,
    address _token,
    address _to,
    uint256[] memory swapResult,
    uint256 _lpSlippage,
    uint256 ethBalance,
    address user
  ) internal virtual {
    if (isWETH(_token, address(handler))) {
      handler.deposit{value: ethBalance}(_token, swapResult, _lpSlippage, _to, user);
      //If Not BNB
    } else {
      handler.deposit(_token, swapResult, _lpSlippage, _to, user);
    }
  }

  /**
   * @notice This internal returns token information
   */
  function getTokenInfo(address _token) internal view returns (ITokenRegistry.TokenRecord memory) {
    return tokenRegistry.getTokenInformation(_token);
  }

  // important to receive ETH
  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
