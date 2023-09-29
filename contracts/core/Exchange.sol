// SPDX-License-Identifier: BUSL-1.1


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
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";
import {IIndexSwap} from "./IIndexSwap.sol";
import {IWETH} from "../interfaces/IWETH.sol";
import {IPriceOracle} from "../oracle/IPriceOracle.sol";

import {IndexSwapLibrary} from "../core/IndexSwapLibrary.sol";

import {IAccessController} from "../access/IAccessController.sol";
import {IVelvetSafeModule} from "../vault/IVelvetSafeModule.sol";

import {ISwapHandler} from "../handler/ISwapHandler.sol";
import {IExternalSwapHandler} from "../handler/IExternalSwapHandler.sol";
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

  constructor() {
    _disableInitializers();
  }

  event TokensClaimed(address indexed _index, address[] _tokens);
  event returnedUninvestedFunds(address indexed _to, address _token, uint256 indexed _balance);

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
    __ReentrancyGuard_init();
    if (
      _accessController == address(0) || _module == address(0) || _oracle == address(0) || _tokenRegistry == address(0)
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
    address[] memory underlying = getUnderlying(protocol, _token);
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

      (bytes memory callData, address callAddress) = handler.getClaimTokenCalldata(_token, getVault(_index));

      if (callAddress != address(0)) {
        safe.executeWallet(callAddress, callData);
      }
    }

    emit TokensClaimed(address(_index), _tokens);
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

    (, bytes memory data) = safe.executeWallet(token, inputData);

    // bool returned by executeWallet is already checked
    if (!(data.length == 0 || abi.decode(data, (bool)))) revert ErrorLibrary.TransferFailed();
  }

  /**
   * @notice Transfer tokens from vault to a specific address
   * @param token The address of the token being transferred
   * @param amount Amount of the token to be transferred
   * @param to The address to be transferred to
   */
  function _pullFromVaultRewards(address token, uint256 amount, address to) external onlyIndexManager {
    _safeTokenTransfer(token, amount, to);
  }

  /**
   * @notice The function is called from the `swapETHToToken` function and is used to swap ETH to a specific token
   * @param inputData Contains the input params for the function
   */
  function _swapETHToToken(
    FunctionParameters.SwapETHToTokenData memory inputData
  ) internal returns (uint256 _mintedAmount) {
    address token = inputData._token;
    ITokenRegistry.TokenRecord memory tokenInfo = getTokenInfo(token);
    IHandler handler = IHandler(tokenInfo.handler);
    ISwapHandler swapHandler = ISwapHandler(inputData._swapHandler);
    if (!(tokenRegistry.isSwapHandlerEnabled(address(swapHandler)))) {
      revert ErrorLibrary.SwapHandlerNotEnabled();
    }
    address user = inputData._toUser;
    address[] memory underlying = getUnderlying(handler, token);
    uint256[] memory swapResult = new uint256[](underlying.length);
    uint256[] memory swapValue = getSwapValue(underlying.length, inputData._swapAmount);
    address to = inputData._to;

    if (isWETH(token, address(handler))) {
      for (uint256 i = 0; i < underlying.length; i++) {
        swapResult[i] = swapValue[i];
      }

      if (tokenInfo.primary) {
        IWETH(token).deposit{value: swapValue[0]}();
        if (to != address(this)) {
          IWETH(token).transfer(to, swapValue[0]);
        }
        _mintedAmount = getPriceTokenUSD18Decimals(WETH, swapValue[0]);
      } else {
        if (underlying.length > 1) {
          uint256 t = underlying[0] == WETH ? 1 : 0;
          swapResult[t] = swapHandler.swapETHToTokens{value: swapValue[t]}(
            inputData._slippage,
            underlying[t],
            address(handler)
          );
        }

        if (underlying[0] == WETH) {
          _mintedAmount = handler.deposit{value: swapValue[0]}(token, swapResult, inputData._lpSlippage, to, user);
        } else {
          _mintedAmount = handler.deposit{value: swapValue[1]}(token, swapResult, inputData._lpSlippage, to, user);
        }
      }
    } else {
      address _toAddress = to;
      if (!tokenInfo.primary) {
        _toAddress = address(handler);
      }
      for (uint256 i = 0; i < underlying.length; i++) {
        swapResult[i] = swapHandler.swapETHToTokens{value: swapValue[i]}(
          inputData._slippage,
          underlying[i],
          _toAddress
        );
      }
      _mintedAmount = handler.deposit(token, swapResult, inputData._lpSlippage, to, user);
    }
  }

  /**
   * @notice The function swaps ETH to a specific token
   * @param inputData includes the input parmas
   */
  function swapETHToToken(
    FunctionParameters.SwapETHToTokenPublicData memory inputData
  ) external payable onlyIndexManager returns (uint256) {
    return
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
    address[] memory underlying = getUnderlying(handler, _token);
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
          swapAmount = getBalance(underlyingToken, address(this));
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
   * @return _mintedAmount The amount swapped and deposited into the third party protocols
   */
  function _swapTokenToToken(
    FunctionParameters.SwapTokenToTokenData memory inputData
  ) public onlyIndexManager returns (uint256 _mintedAmount) {
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
        _mintedAmount = _swapTokenToTokenInvest(inputData, tokenInfoIn.enabled);
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
        swapResult = _swapTokenToETH(
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

      _mintedAmount = getPriceTokenUSD18Decimals(tokenOut, swapResult[0]);
    }
  }

  /**
   * @notice This function swaps one token to another while investing
   * @param inputData Includes the input params
   * @return _mintedAmount Final amount after swap and depositing into third party protocols
   */
  function _swapTokenToTokenInvest(
    FunctionParameters.SwapTokenToTokenData memory inputData,
    bool isEnabled
  ) internal returns (uint256 _mintedAmount) {
    IHandler handler = IHandler(getTokenInfo(inputData._tokenOut).handler);
    ISwapHandler swapHandler = ISwapHandler(inputData._swapHandler);
    address[] memory underlying = getUnderlying(handler, inputData._tokenOut);
    uint256[] memory swapResult = new uint256[](underlying.length);
    if (getBalance(inputData._tokenIn, address(this)) < inputData._swapAmount) {
      revert ErrorLibrary.InvalidAmount();
    }
    uint256[] memory swapValue = getSwapValue(underlying.length, inputData._swapAmount);
    for (uint256 i = 0; i < underlying.length; i++) {
      if (inputData._tokenIn == underlying[i] && inputData._tokenIn != WETH) {
        swapResult[i] = swapValue[i];
        TransferHelper.safeTransfer(inputData._tokenIn, address(handler), swapValue[i]);
      } else if (underlying[i] == WETH) {
        swapResult[i] = IndexSwapLibrary.transferAndSwapTokenToETH(
          inputData._tokenIn,
          swapHandler,
          swapValue[i],
          inputData._slippage,
          address(this),
          isEnabled
        );
      } else {
        swapResult[i] = IndexSwapLibrary.transferAndSwapTokenToToken(
          inputData._tokenIn,
          swapHandler,
          swapValue[i],
          inputData._slippage,
          underlying[i],
          address(handler),
          isEnabled
        );
      }
    }
    if (isWETH(inputData._tokenOut, address(handler))) {
      _mintedAmount = handler.deposit{value: address(this).balance}(
        inputData._tokenOut,
        swapResult,
        inputData._lpSlippage,
        inputData._to,
        inputData._toUser
      );
    } else {
      _mintedAmount = handler.deposit(
        inputData._tokenOut,
        swapResult,
        inputData._lpSlippage,
        inputData._to,
        inputData._toUser
      );
    }
  }

  /**
   * @notice This function is used to determine the swap amount while investing, as per the underlying length
   * @param len Lenght of the underlying token array
   * @param amount Swap amount that is to be tweaked as per the underlying length
   */
  function getSwapValue(uint256 len, uint256 amount) internal pure returns (uint256[] memory) {
    uint256[] memory swapValue = new uint256[](len);
    if (len > 1) {
      swapValue[0] = amount / 2;
      swapValue[1] = amount - swapValue[0];
    } else {
      swapValue[0] = amount;
    }
    return swapValue;
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
    address[] memory underlying = getUnderlying(handler, tokenIn);
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
        uint256 swapAmount = getBalance(underlyingToken, address(this));
        if (underlyingToken == tokenOut) {
          if (swapAmount == 0) {
            revert ErrorLibrary.ZeroBalanceAmount();
          }
          swapResult[i] = swapAmount;
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
   * @notice This function is used to calculate the swap amount based on the passed params
   * @param _totalSupply Total supply of the index
   * @param _tokenAmount Token amount which will be used to calculate the swap amount
   * @param _amount The swap amount (in case totalSupply != 0) value calculated from the IndexSwapLibrary
   * @param _denorm The weight (denorm) of the passed token
   * @return swapAmount The final swap amount
   */
  function getSwapAmount(
    uint256 _totalSupply,
    uint256 _tokenAmount,
    uint256 _amount,
    uint256 _denorm
  ) internal pure virtual returns (uint256 swapAmount) {
    if (_totalSupply == 0) {
      swapAmount = (_tokenAmount * _denorm) / 10_000;
    } else {
      swapAmount = _amount;
    }
  }

  /**
   * @notice Swaps one token to another based on the input
   * @param inputData Includes the input params
   * @return investedAmountAfterSlippage Final invested amount after slippage
   */
  function _swapTokenToTokens(
    FunctionParameters.SwapTokenToTokensData memory inputData,
    uint256 balanceBefore
  ) external payable virtual onlyIndexManager returns (uint256 investedAmountAfterSlippage) {
    IIndexSwap _index = IIndexSwap(inputData._index);
    address[] memory _tokens = _index.getTokens();
    address vault = getVault(_index);
    for (uint256 i = 0; i < _tokens.length; i++) {
      address _token = _tokens[i];
      uint256 swapAmount = getSwapAmount(
        inputData._totalSupply,
        inputData._tokenAmount,
        inputData.amount[i],
        uint256(_index.getRecord(_token).denorm)
      );

      if (WETH == inputData._inputToken) {
        if (address(this).balance < swapAmount) {
          revert ErrorLibrary.NotEnoughBNB();
        }
        investedAmountAfterSlippage =
          investedAmountAfterSlippage +
          _swapETHToToken(
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
        investedAmountAfterSlippage = investedAmountAfterSlippage + getPriceTokenUSD18Decimals(_token, swapAmount);
        TransferHelper.safeTransfer(inputData._inputToken, vault, swapAmount);
      } else {
        investedAmountAfterSlippage =
          investedAmountAfterSlippage +
          _swapTokenToToken(
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
    }

    // Refund any leftover ETH/Investment token from Exchange handler back to the User
    uint256 balanceAfter = IndexSwapLibrary.checkBalance(inputData._inputToken, address(this), WETH);
    returnUninvestedFunds(inputData._inputToken, inputData._toUser, balanceAfter - balanceBefore);
  }

  /**
   * @notice Performs off-chain investment using the ZeroEx protocol
   * @param inputData The ZeroExData struct containing the off-chain investment details:
   *   - _buyToken: The array of tokens to be bought during the off-chain investment
   *   - _tokens: The array of tokens involved in the off-chain investment
   *   - _offChainHandler: The address of the off-chain handler contract
   *   - _buyAmount: The array of buy amounts for each token during the off-chain investment
   *   - _buySwapData: The array of buy swap data for each token during the off-chain investment
   * @param _lpSlippage The array of slippage percentages for each token during the off-chain investment
   * @return investedAmountAfterSlippage The resulting balance in USD after the off-chain investment and after depositing into third party protocols
   */
  function _swapTokenToTokensOffChain(
    ExchangeData.InputData memory inputData,
    IIndexSwap index,
    uint256[] calldata _lpSlippage,
    address[] memory _tokens,
    uint256[] calldata _buyAmount,
    uint256 balanceBefore,
    address _toUser
  ) external virtual onlyIndexManager returns (uint256 investedAmountAfterSlippage) {
    uint256 underlyingIndex;
    uint256 _mintedAmount;
    for (uint256 i = 0; i < _tokens.length; i++) {
      // Get the handler contract for the current token
      // Perform off-chain token swap using the exchange contract
      (_mintedAmount, underlyingIndex) = _swapOffChainTokens(
        ExchangeData.IndexOperationData(
          inputData,
          index,
          underlyingIndex,
          _lpSlippage[i],
          _buyAmount[i],
          _tokens[i],
          _toUser
        )
      );
      investedAmountAfterSlippage = investedAmountAfterSlippage + _mintedAmount;
    }

    // Refund any leftover ETH/Investment token from Exchange handler back to the User
    uint256 balanceAfter = IndexSwapLibrary.checkBalance(inputData.sellTokenAddress, address(this), WETH);
    returnUninvestedFunds(inputData.sellTokenAddress, _toUser, balanceAfter - balanceBefore);
  }

  /**
   * @notice The function is helper function of swapOffChainTokens
   * @return _mintedAmount get balanceInUsd after swap and after deposit
   * @return underlyingIndex is used to keep track of interations
   */
  function _swapOffChainTokens(
    ExchangeData.IndexOperationData memory inputdata
  ) internal returns (uint256 _mintedAmount, uint256) {
    address vault = getVault(inputdata.index);
    //Checks if token is non primary
    IHandler handler = IHandler(getTokenInfo(inputdata._token).handler);
    if (!getTokenInfo(inputdata._token).primary) {
      address[] memory underlying = getUnderlying(handler, inputdata._token);
      uint256[] memory swapResult = new uint256[](underlying.length);
      uint256 ethBalance;
      //Loops for underlying token
      for (uint256 j = 0; j < underlying.length; j++) {
        address _underlying = underlying[j];
        uint256 _amount = inputdata.inputData.buyAmount[inputdata.indexValue];
        bool _isweth = _underlying == WETH;
        validateAmount(inputdata._buyAmount, _amount, underlying.length);
        //Checks if sellToken == underlying(buyToken) and buyToken should not be equal to eth (buyToken != eth)
        if (inputdata.inputData.sellTokenAddress == _underlying && _underlying != WETH) {
          swapResult[j] = _amount;
          withdrawOrTransfer(_amount, _underlying, address(handler), false);
        }
        //Checks if sellToken == eth(buyToken) and buyToken == ETH
        else if (_isweth && inputdata.inputData.sellTokenAddress == WETH) {
          swapResult[j] = _amount;
          ethBalance = _amount;
          IWETH(_underlying).withdraw(ethBalance);
        }
        //If non of the above condition satisifes
        else {
          swapResult[j] = swapAndCalculate(
            inputdata.inputData,
            address(handler),
            inputdata.indexValue,
            _isweth,
            _underlying
          );
        }

        inputdata.indexValue = inputdata.indexValue + 1;
        if (_isweth) {
          ethBalance = swapResult[j];
        }
      }
      //It deposit tokens and send to vault
      _mintedAmount = handlerDeposit(
        handler,
        inputdata._token,
        vault,
        swapResult,
        inputdata._lpSlippage,
        ethBalance,
        inputdata._toUser
      );
      return (_mintedAmount, inputdata.indexValue);
    }
    //If Token Is Primary
    else {
      uint256 _amount = inputdata.inputData.buyAmount[inputdata.indexValue];
      validateAmount(inputdata._buyAmount, _amount, 1);

      //If sellToken == buyToken
      if (inputdata.inputData.sellTokenAddress == inputdata._token) {
        withdrawOrTransfer(_amount, inputdata._token, vault, false);
        _mintedAmount = getPriceTokenUSD18Decimals(inputdata._token, _amount);
      }
      //If above conditon does not satifies or (buyToken != sellToken)
      else {
        uint256 _swapResult = swapAndCalculate(
          inputdata.inputData,
          vault,
          inputdata.indexValue,
          false,
          inputdata._token
        );
        _mintedAmount = getPriceTokenUSD18Decimals(inputdata._token, _swapResult);
      }

      inputdata.indexValue = inputdata.indexValue + 1;
      return (_mintedAmount, inputdata.indexValue);
    }
  }

  /**
   * @notice The function swaps and calculate the balance in usd and underlyIndex - used in offchainindexswap
   * @return _mintedAmount get balanceInUsd after swap and after deposit
   * @return underlyingIndex is used to keep track of interations
   */
  function swapOffChainTokens(
    ExchangeData.IndexOperationData memory inputdata
  ) external virtual onlyIndexManager returns (uint256, uint256) {
    return _swapOffChainTokens(inputdata);
  }

  /**
   * @notice This function validates the buy amount value during off-chain swap of tokens.
   * (Due to market conditions, the value returned by the function when called from frontend and via contract may differ.
   * Hence we represent it as percentage value)
   * @param expectedAmount Buy amount passed
   * @param userAmount Amount of the token passed to be validated
   * @param underlyingLen Lenght of the underlying token array
   */
  function validateAmount(uint256 expectedAmount, uint256 userAmount, uint256 underlyingLen) internal view {
    uint256 exceptedRangeDecimal = tokenRegistry.exceptedRangeDecimal();
    uint256[] memory diff = new uint256[](underlyingLen);

    if (underlyingLen > 1) {
      uint amount0 = expectedAmount / underlyingLen;
      uint amount1 = expectedAmount - amount0;

      diff[0] = getdiff(userAmount, amount0, exceptedRangeDecimal);

      diff[1] = getdiff(userAmount, amount1, exceptedRangeDecimal);
    } else {
      diff[0] = getdiff(userAmount, expectedAmount, exceptedRangeDecimal);
    }
    for (uint256 j = 0; j < underlyingLen; j++) {
      if (diff[j] > exceptedRangeDecimal) {
        revert ErrorLibrary.InvalidBuyValues();
      }
    }
  }

  /**
   * @notice This function is used to return any uninvested funds left in the Exchange handler during OffChain/Onchain investment
   * @param _token Address of the deposit token whose undeposited dust is left stuck in the contract
   * @param _to Address where the uninvested funds have to be sent
   */
  function returnUninvestedFunds(address _token, address _to, uint256 _balance) internal {
    if (_token != WETH) {
      TransferHelper.safeTransfer(_token, _to, _balance);
    } else {
      (bool success, ) = payable(_to).call{value: _balance, gas: 5000}("");
      if (!success) {
        revert ErrorLibrary.ETHTransferFailed();
      }
    }
    emit returnedUninvestedFunds(_to, _token, _balance);
  }

  /**
   * @notice This function calculates the difference between user's amount and
   * @param _userAmount Amount of the token passed to be validated
   * @param _calcAmount calculated amount to check for diff
   * @param _exceptedRangeDecimal Accepted range of check value
   */
  function getdiff(uint _userAmount, uint _calcAmount, uint _exceptedRangeDecimal) internal pure returns (uint) {
    return
      _userAmount > _calcAmount
        ? (_userAmount * _exceptedRangeDecimal) / _calcAmount
        : (_calcAmount * _exceptedRangeDecimal) / _userAmount;
  }

  /**
   * @notice The function swapToken using zeroExHandler and calcualte the swapAmount in USD
   * @param inputData Input parameters passed as a struct
   * @param _to Address to which the token is transferred to after balance calculation
   * @param _index Index of array, need to be accessed for swapping
   * @param isETH Boolean parameter for if the token is ETH (native) or not
   * @param _token Address of the token
   * @return swapRes returns the amount obtained after swap
   */
  function swapAndCalculate(
    ExchangeData.InputData memory inputData,
    address _to,
    uint256 _index,
    bool isETH,
    address _token
  ) internal virtual returns (uint256 swapRes) {
    uint256 balanceBefore = getBalance(_token, address(this));
    uint256 amount = inputData.buyAmount[_index];
    address sellToken = inputData.sellTokenAddress;
    TransferHelper.safeTransfer(sellToken, inputData._offChainHandler, amount);
    IExternalSwapHandler(inputData._offChainHandler).swap(
      sellToken,
      _token,
      amount,
      inputData._buySwapData[_index],
      address(this)
    );
    uint256 balanceAfter = getBalance(_token, address(this));
    swapRes = balanceAfter - balanceBefore;
    if (swapRes <= 0) {
      revert ErrorLibrary.InvalidAmount();
    }
    withdrawOrTransfer(swapRes, _token, _to, isETH);
  }

  /**
   * @notice This internal function either withdraws wETH or transfers _token
   * @param _amount Amount of the token to be transferred
   * @param _token Address of the token
   * @param _to Address to which the token is to be transferred
   * @param isETH Boolean parameter for if the token is ETH (native) or not
   */
  function withdrawOrTransfer(uint256 _amount, address _token, address _to, bool isETH) internal virtual {
    if (isETH) {
      IWETH(_token).withdraw(_amount);
    } else {
      TransferHelper.safeTransfer(_token, _to, _amount);
    }
  }

  /**
   * @notice This internal function deposit tokens to vault using other handlers
   * @param handler Instance of the handler associated with the token
   * @param _token Address of the token
   * @param _to Vault address (where the tokens have to be deposited)
   * @param swapResult Amount to be deposited after swap
   * @param _lpSlippage The lp slippage value passed for the deposit
   * @param ethBalance The native token value passed during the call (if any)
   * @param user User's address that would receive the index tokens
   */
  function handlerDeposit(
    IHandler handler,
    address _token,
    address _to,
    uint256[] memory swapResult,
    uint256 _lpSlippage,
    uint256 ethBalance,
    address user
  ) internal virtual returns (uint256 _mintedAmount) {
    if (isWETH(_token, address(handler))) {
      _mintedAmount = handler.deposit{value: ethBalance}(_token, swapResult, _lpSlippage, _to, user);
      //If Not BNB
    } else {
      _mintedAmount = handler.deposit(_token, swapResult, _lpSlippage, _to, user);
    }
  }

  /**
   * @notice This internal returns token information
   * @param _token Address of the token whose info is required
   * @return TokenRecord instance of the information associated with the token
   */
  function getTokenInfo(address _token) internal view returns (ITokenRegistry.TokenRecord memory) {
    return tokenRegistry.getTokenInformation(_token);
  }

  /**
   * @notice This internal function returns balance of token
   * @param _token Address of the token
   * @param _of Address whose balance of the token is required
   * @return Token balance of the address passed
   */
  function getBalance(address _token, address _of) internal view returns (uint256) {
    return IERC20Upgradeable(_token).balanceOf(_of);
  }

  /**
   * @notice This internal function returns address of vault
   * @param _index Instance of the current IndexSwap
   * @return Address of the vault associated with the the current index
   */
  function getVault(IIndexSwap _index) internal view returns (address) {
    return _index.vault();
  }

  /**
   * @notice This internal function returns price of token in usd
   * @param _token Address of the token whose price in USD is required
   * @param _amount The amount of the token passed
   * @return Final price of the token in USD and expressed in 18 decimals
   */
  function getPriceTokenUSD18Decimals(address _token, uint256 _amount) internal view returns (uint256) {
    return oracle.getPriceTokenUSD18Decimals(_token, _amount);
  }

  /**
   * @notice This internal function returns underlying address of token
   */
  function getUnderlying(IHandler handler, address token) internal view returns (address[] memory) {
    return handler.getUnderlying(token);
  }

  // important to receive ETH
  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}