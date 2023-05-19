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

import {IIndexSwap} from "./IIndexSwap.sol";
import {IWETH} from "../interfaces/IWETH.sol";
import {IPriceOracle} from "../oracle/IPriceOracle.sol";

import {IndexSwapLibrary} from "../core/IndexSwapLibrary.sol";

import {AccessController} from "../access/AccessController.sol";
import {IVault} from "../vault/IVault.sol";

import {ISwapHandler} from "../handler/ISwapHandler.sol";

import {IExchange} from "./IExchange.sol";
import {IHandler} from "../handler/IHandler.sol";
import {ITokenRegistry} from "../registry/ITokenRegistry.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import {FunctionParameters} from "../FunctionParameters.sol";

contract Exchange is Initializable, UUPSUpgradeable {
  AccessController public accessController;
  IVault internal safe;
  IPriceOracle public oracle;
  ITokenRegistry public tokenRegistry;

  constructor() {}

  using SafeMathUpgradeable for uint256;

  event TokensClaimed(uint256 indexed time, address indexed _index, address[] _tokens);

  event RewardTokensDistributed(address _index, address _rewardToken, uint256 diff);

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
    require(
      _accessController != address(0) && _module != address(0) && _oracle != address(0) && _tokenRegistry != address(0),
      "zero address check failed"
    );
    accessController = AccessController(_accessController);
    safe = IVault(_module);
    oracle = IPriceOracle(_oracle);
    tokenRegistry = ITokenRegistry(_tokenRegistry);
  }

  /**
   * @notice This function checks if a token is WETH (BNB)
   * @param _token Address of the token to be checked
   * @param _protocol Address of the protocol in question
   */
  function isWETH(address _token, address _protocol)
    public
    view
    virtual
    returns (bool)
  {
    IHandler protocol = IHandler(_protocol);
    address[] memory underlying = protocol.getUnderlying(_token);
    address ethAddress = tokenRegistry.getETH();
    if (underlying.length == 1) {
      return underlying[0] == ethAddress;
    }
    return (underlying[0] == ethAddress || underlying[1] == ethAddress);
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
  function claimTokens(IIndexSwap _index, address[] calldata _tokens) public onlyIndexManager {
    for (uint256 i = 0; i < _tokens.length; i++) {
      IHandler handler = IHandler(tokenRegistry.getTokenInformation(_tokens[i]).handler);

      (bytes memory callData, address callAddress) = handler.getClaimTokenCalldata(_tokens[i], _index.vault());

      if (callAddress != address(0)) {
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
  function _pullFromVault(address token, uint256 amount, address to) public onlyIndexManager {
    IHandler handler = IHandler(tokenRegistry.getTokenInformation(token).handler);

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
     bytes memory inputData = abi.encodeWithSelector(
      IERC20Upgradeable.transfer.selector,
      to,
      amount
    );

    safe.executeWallet(token, inputData);

  }

  /**
   * @notice Transfer tokens from vault to a specific address
   */
  function _pullFromVaultRewards(address token, uint256 amount, address to) public onlyIndexManager {
    _safeTokenTransfer(token,  amount,  to);
  }

  /**
   * @notice The function swaps ETH to a specific token
   * @param inputData includes the input parmas
   * @return swapResult The outcome amount of the specific token afer swapping
   */
  function _swapETHToToken(
    FunctionParameters.SwapETHToTokenData memory inputData
  ) public payable onlyIndexManager returns (uint256[] memory) {
    IHandler handler = IHandler(tokenRegistry.getTokenInformation(inputData._token).handler);
    ISwapHandler swapHandler = ISwapHandler(inputData._swapHandler);
    if (!(tokenRegistry.isSwapHandlerEnabled(address(swapHandler)))) {
      revert ErrorLibrary.SwapHandlerNotEnabled();
    }
    address[] memory underlying = handler.getUnderlying(inputData._token);
    uint256[] memory swapResult = new uint256[](underlying.length);
    uint256 swapValue = underlying.length > 1 ? msg.value.div(2) : msg.value;

    if (isWETH(inputData._token, address(handler))) {
      for (uint256 i = 0; i < underlying.length; i++) {
        swapResult[i] = swapValue;
      }

      if (tokenRegistry.getTokenInformation(inputData._token).primary) {
        IWETH(inputData._token).deposit{value: swapValue}();
        if (inputData._to != address(this)) {
          IWETH(inputData._token).transfer(inputData._to, swapValue);
        }
      } else {
        if (underlying.length > 1) {
          uint256 t = underlying[0] == swapHandler.getETH() ? 1 : 0;
          swapResult[t] = swapHandler.swapETHToTokens{value: swapValue}(
            inputData._slippage,
            underlying[t],
            address(handler)
          );
        }
        handler.deposit{value: swapValue}(inputData._token, swapResult, inputData._lpSlippage, inputData._to);
      }
    } else {
      address _toAddress = inputData._to;
      if (!tokenRegistry.getTokenInformation(inputData._token).primary) {
        _toAddress = address(handler);
      }
      for (uint256 i = 0; i < underlying.length; i++) {
        swapResult[i] = swapHandler.swapETHToTokens{value: swapValue}(inputData._slippage, underlying[i], _toAddress);
      }
      if (!tokenRegistry.getTokenInformation(inputData._token).primary) {
        handler.deposit(inputData._token, swapResult, inputData._lpSlippage, inputData._to);
      }
    }
    return swapResult;
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
    IHandler handler = IHandler(tokenRegistry.getTokenInformation(inputData._token).handler);
    ISwapHandler swapHandler = ISwapHandler(inputData._swapHandler);
    if (!(tokenRegistry.isSwapHandlerEnabled(address(swapHandler)))) {
      revert ErrorLibrary.SwapHandlerNotEnabled();
    }
    address[] memory underlying = handler.getUnderlying(inputData._token);
    uint256[] memory swapResult = new uint256[](underlying.length);

    if (!tokenRegistry.getTokenInformation(inputData._token).primary) {
      TransferHelper.safeTransfer(inputData._token, address(handler), swapAmount);
      handler.redeem(
        FunctionParameters.RedeemData(
          swapAmount,
          inputData._lpSlippage,
          address(this),
          inputData._token,
          isWETH(inputData._token, address(handler))
        )
      );
    }
    for (uint256 i = 0; i < underlying.length; i++) {
      if (underlying[i] == swapHandler.getETH()) {
        if (tokenRegistry.getTokenInformation(inputData._token).primary) {
          IWETH(inputData._token).withdraw(swapAmount);
        }
        swapResult[i] = address(this).balance;
        if (swapResult[i] == 0) {
          revert ErrorLibrary.ZeroBalanceAmount();
        }
        (bool success, ) = payable(inputData._to).call{value: swapResult[i]}("");
        require(success, "Transfer failed.");
      } else {
        IERC20Upgradeable token = IERC20Upgradeable(underlying[i]);
        swapAmount = token.balanceOf(address(this));
        if (swapAmount == 0) {
          revert ErrorLibrary.ZeroBalanceAmount();
        }
        swapResult[i] = IndexSwapLibrary.transferAndSwapTokenToETH(
          underlying[i],
          swapHandler,
          swapAmount,
          inputData._slippage,
          inputData._to
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
    if (
      !tokenRegistry.getTokenInformation(inputData._tokenIn).primary ||
      !tokenRegistry.getTokenInformation(inputData._tokenOut).primary
    ) {
      if (inputData._isInvesting) {
        swapResult = _swapTokenToTokenInvest(inputData);
      } else {
        swapResult = _swapTokenToTokenWithdraw(inputData);
      }
    } else {
      IHandler handler = IHandler(tokenRegistry.getTokenInformation(inputData._tokenOut).handler);
      swapResult = new uint256[](1);
      if (isWETH(inputData._tokenOut, address(handler))) {
        address to = inputData._to;
        if (inputData._isInvesting == true) {
          to = address(this);
        }
        _swapTokenToETH(
          FunctionParameters.SwapTokenToETHData(
            inputData._tokenIn,
            to,
            inputData._swapHandler,
            inputData._swapAmount,
            inputData._slippage,
            inputData._lpSlippage
          )
        );
        if (inputData._isInvesting == true) {
          uint256 balance = address(this).balance;
          IWETH(inputData._tokenOut).deposit{value: balance}();
          if (inputData._to != address(this)) {
            IWETH(inputData._tokenOut).transfer(inputData._to, balance);
          }
        }
      } else {
        swapResult[0] = IndexSwapLibrary.transferAndSwapTokenToToken(
          inputData._tokenIn,
          swapHandler,
          inputData._swapAmount,
          inputData._slippage,
          inputData._tokenOut,
          inputData._to
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
    FunctionParameters.SwapTokenToTokenData memory inputData
  ) internal returns (uint256[] memory) {
    IHandler handler = IHandler(tokenRegistry.getTokenInformation(inputData._tokenOut).handler);
    ISwapHandler swapHandler = ISwapHandler(inputData._swapHandler);
    address[] memory underlying = handler.getUnderlying(inputData._tokenOut);
    uint256[] memory swapResult = new uint256[](underlying.length);
    if (IERC20Upgradeable(inputData._tokenIn).balanceOf(address(this)) == 0) {
      revert ErrorLibrary.ZeroBalanceAmount();
    }
    if (IERC20Upgradeable(inputData._tokenIn).balanceOf(address(this)) < inputData._swapAmount) {
      revert ErrorLibrary.InvalidAmount();
    }
    uint256 swapValue = underlying.length > 1 ? inputData._swapAmount.div(2) : inputData._swapAmount;

    for (uint256 i = 0; i < underlying.length; i++) {
      if (inputData._tokenIn == underlying[i]) {
        swapResult[i] = swapValue;
        if (underlying[i] != swapHandler.getETH()) {
          TransferHelper.safeTransfer(address(inputData._tokenIn), address(handler), swapValue);
        }
      } else if (underlying[i] == swapHandler.getETH()) {
        swapResult[i] = IndexSwapLibrary.transferAndSwapTokenToETH(
          inputData._tokenIn,
          swapHandler,
          swapValue,
          inputData._slippage,
          address(this)
        );
      } else {
        swapResult[i] = IndexSwapLibrary.transferAndSwapTokenToToken(
          inputData._tokenIn,
          swapHandler,
          swapValue,
          inputData._slippage,
          underlying[i],
          address(handler)
        );
      }
    }
    if (isWETH(inputData._tokenOut, address(handler))) {
      handler.deposit{value: address(this).balance}(
        inputData._tokenOut,
        swapResult,
        inputData._lpSlippage,
        inputData._to
      );
    } else {
      handler.deposit(inputData._tokenOut, swapResult, inputData._lpSlippage, inputData._to);
    }
    return swapResult;
  }

  /**
   * @notice This function swaps one token to another while withdraw
   * @param inputData Includes the input params 
   * @return swapResult Final amount after swap
   */
  function _swapTokenToTokenWithdraw(
    FunctionParameters.SwapTokenToTokenData memory inputData
  ) internal returns (uint256[] memory) {
    IHandler handler = IHandler(tokenRegistry.getTokenInformation(inputData._tokenIn).handler);
    ISwapHandler swapHandler = ISwapHandler(inputData._swapHandler);
    address[] memory underlying = handler.getUnderlying(inputData._tokenIn);
    uint256[] memory swapResult = new uint256[](underlying.length);

    if (inputData._tokenOut == swapHandler.getETH()) {
      swapResult = _swapTokenToETH(
        FunctionParameters.SwapTokenToETHData(
          inputData._tokenIn,
          inputData._to,
          inputData._swapHandler,
          inputData._swapAmount,
          inputData._slippage,
          inputData._lpSlippage
        )
      );
    } else {
      TransferHelper.safeTransfer(inputData._tokenIn, address(handler), inputData._swapAmount);
      handler.redeem(
        FunctionParameters.RedeemData(
          inputData._swapAmount,
          inputData._lpSlippage,
          address(this),
          inputData._tokenIn,
          isWETH(inputData._tokenIn, address(handler))
        )
      );
      for (uint256 i = 0; i < underlying.length; i++) {
        IERC20Upgradeable token = IERC20Upgradeable(underlying[i]);
        uint256 swapAmount = token.balanceOf(address(this));
        if (underlying[i] == inputData._tokenOut) {
          if (swapAmount == 0) {
            revert ErrorLibrary.ZeroBalanceAmount();
          }
          TransferHelper.safeTransfer(underlying[i], inputData._to, swapAmount);
        } else if (underlying[i] == swapHandler.getETH()) {
          swapAmount = address(this).balance;
          if (swapAmount == 0) {
            revert ErrorLibrary.ZeroBalanceAmount();
          }
          swapResult[i] = swapHandler.swapETHToTokens{value: swapAmount}(
            inputData._slippage,
            inputData._tokenOut,
            inputData._to
          );
        } else {
          if (swapAmount == 0) {
            revert ErrorLibrary.ZeroBalanceAmount();
          }
          swapResult[i] = IndexSwapLibrary.transferAndSwapTokenToToken(
            underlying[i],
            swapHandler,
            swapAmount,
            inputData._slippage,
            inputData._tokenOut,
            inputData._to
          );
        }
      }
    }
    return swapResult;
  }


  // important to receive ETH
  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation)
    internal
    virtual
    override
  {}
}
