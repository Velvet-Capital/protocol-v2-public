// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IHandler} from "../handler/IHandler.sol";
import {IPriceOracle} from "../oracle/IPriceOracle.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";

contract TokenRegistry is Initializable, OwnableUpgradeable, UUPSUpgradeable {
  struct TokenRecord {
    bool primary;
    bool enabled;
    address handler;
    address[] rewardTokens;
  }

  mapping(address => TokenRecord) public tokenInformation;
  mapping(address => bool) public _swapHandler;
  mapping(address => bool) public _offChainHandler;

  mapping(address => bool) public nonDerivativeToken;

  mapping(address => bool) public externalSwapHandler;

  mapping(address => bool) public isRewardToken;

  mapping(address => bool) internal _permittedToken;

  address public velvetTreasury;

  uint256 public maxManagementFee;
  uint256 public maxPerformanceFee;
  uint256 public maxEntryFee;
  uint256 public maxExitFee;

  // Percentage of fee we're taking off of the management fee
  uint256 public protocolFee;
  uint256 public protocolFeeBottomConstraint;

  uint256 public MAX_VELVET_INVESTMENTAMOUNT;
  uint256 public MIN_VELVET_INVESTMENTAMOUNT;

  bool public protocolPause;

  uint256 public COOLDOWN_PERIOD;

  address internal WETH;
  event EnableToken(
    uint256 time,
    address[] _oracle,
    address[] _token,
    address[] _handler,
    address[][] _rewardTokens,
    bool[] _primary
  );
  event EnableExternalSwapHandler(uint256 time, address swapHandler);
  event DisableExternalSwapHandler(uint256 time, address indexed swapHandler);
  event EnablePermittedTokens(uint256 time, address[] newTokens);
  event DisablePermittedTokens(uint256 time, address[] newTokens);
  event EnableSwapHandlers(uint256 time, address[] handler);
  event DisableSwapHandlers(uint256 time, address[] handler);
  event AddNonDerivative(uint256 time, address handler);
  event AddRewardToken(uint256 time, address token);
  event RemoveRewardToken(uint256 time, address token);
  event ChangedIndexOperation(uint256 time, address newIndexOperation);
  event DisableToken(uint256 time, address token);

  /**
   * @notice This function is used to init the Token Registry while deployment
   */
  function initialize(
    uint256 _protocolFee,
    uint256 _protocolFeeBottomConstraint,
    uint256 _maxAssetManagerFee,
    uint256 _maxPerformanceFee,
    uint256 _maxEntryFee,
    uint256 _maxExitFee,
    uint256 _minVelvetInvestmentAmount,
    uint256 _maxVelvetInvestmentAmount,
    address _velvetTreasury,
    address _weth,
    uint256 coolDownPeriod
  ) external initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();
    if (_velvetTreasury == address(0)) {
      revert ErrorLibrary.ZeroAddresstreasury();
    }
    if (!(_maxAssetManagerFee > 0 && _maxPerformanceFee > 0)) {
      revert ErrorLibrary.ZeroFee();
    }

    protocolFee = _protocolFee;
    protocolFeeBottomConstraint = _protocolFeeBottomConstraint;
    maxManagementFee = _maxAssetManagerFee;
    maxPerformanceFee = _maxPerformanceFee;
    maxEntryFee = _maxEntryFee;
    maxExitFee = _maxExitFee;

    MIN_VELVET_INVESTMENTAMOUNT = _minVelvetInvestmentAmount;
    MAX_VELVET_INVESTMENTAMOUNT = _maxVelvetInvestmentAmount;

    velvetTreasury = _velvetTreasury;

    WETH = _weth;
    COOLDOWN_PERIOD = coolDownPeriod;
  }

  /**
   * @notice This function return the record of the given token
   */
  function getTokenInformation(address _token) public view virtual returns (TokenRecord memory) {
    return tokenInformation[_token];
  }

  /**
   * @notice This function updates a list of token along with it's handler and and primary bool and enables it
   */
  function enableToken(
    address[] memory _oracle,
    address[] memory _token,
    address[] memory _handler,
    address[][] memory _rewardTokens,
    bool[] memory _primary
  ) public virtual onlyOwner {
    for (uint256 i = 0; i < _token.length; i++) {
      if (_oracle[i] == address(0)) {
        revert ErrorLibrary.InvalidOracleAddress();
      }
      if (_token[i] == address(0)) {
        revert ErrorLibrary.InvalidTokenAddress();
      }
      if (_handler[i] == address(0)) {
        revert ErrorLibrary.InvalidHandlerAddress();
      }
      IPriceOracle oracle = IPriceOracle(_oracle[i]);
      address[] memory underlying = IHandler(_handler[i]).getUnderlying(_token[i]);
      for (uint256 j = 0; j < underlying.length; j++) {
        if (!(oracle.getPriceTokenUSD18Decimals(underlying[j], 1 ether) > 0)) {
          revert ErrorLibrary.TokenNotInPriceOracle();
        }
      }
      tokenInformation[_token[i]].primary = _primary[i];
      tokenInformation[_token[i]].handler = _handler[i];
      tokenInformation[_token[i]].enabled = true;
      tokenInformation[_token[i]].rewardTokens = _rewardTokens[i];
    }
    emit EnableToken(block.timestamp, _oracle, _token, _handler, _rewardTokens, _primary);
  }

  /**
   * @notice This function is used to add a particular token as a reward token
   */
  function addRewardToken(address _token) public onlyOwner {
    isRewardToken[_token] = true;
    emit AddRewardToken(block.timestamp, _token);
  }

  /**
   * @notice This function is used to remove a particular token as a reward token
   */
  function removeRewardToken(address _token) public onlyOwner {
    delete isRewardToken[_token];
    emit RemoveRewardToken(block.timestamp, _token);
  }

  /**
   * @notice This function updates a list of swapHandlers and enables it
   */
  function enableSwapHandlers(address[] memory _handler) public virtual onlyOwner {
    if (_handler.length == 0) {
      revert ErrorLibrary.InvalidLength();
    }
    for (uint256 i = 0; i < _handler.length; i++) {
      if (_swapHandler[_handler[i]] == true) {
        revert ErrorLibrary.HandlerAlreadyEnabled();
      }
      _swapHandler[_handler[i]] = true;
    }
    emit EnableSwapHandlers(block.timestamp, _handler);
  }

  /**
   * @notice This function disables the given swapHandler
   */
  function disableSwapHandlers(address[] memory _handler) public virtual onlyOwner {
    if (_handler.length == 0) {
      revert ErrorLibrary.InvalidLength();
    }
    for (uint256 i = 0; i < _handler.length; i++) {
      if (_swapHandler[_handler[i]] == false) {
        revert ErrorLibrary.HandlerAlreadyDisabled();
      }
      _swapHandler[_handler[i]] = false;
    }
    emit DisableSwapHandlers(block.timestamp, _handler);
  }

  /**
   * @notice This function returns if the swap handler is enabled in the registry or not
   */
  function isSwapHandlerEnabled(address swapHandler) public view virtual returns (bool) {
    return _swapHandler[swapHandler];
  }

  /**
   * @notice This function returns a bool according to given offChainHandler address
   */
  function isOffChainHandlerEnabled(address offChainHandler) public view virtual returns (bool) {
    return _offChainHandler[offChainHandler];
  }

  // todo updatetoken?? -> then require mapping doesn't already exist

  /**
   * @notice This function adds non derivative handler address to record
   */
  function addNonDerivative(address handler) public virtual onlyOwner {
    nonDerivativeToken[handler] = true;
    emit AddNonDerivative(block.timestamp, handler);
  }

  /**
   * @notice This function returns a bool according to whether the given input is non derivative or not
   */
  function checkNonDerivative(address handler) public view virtual returns (bool) {
    return nonDerivativeToken[handler];
  }

  /**
   * @notice This function returns a bool according to whether the given input token is enabled or not
   */
  function isEnabled(address _token) public view virtual returns (bool) {
    return tokenInformation[_token].enabled;
  }

  /**
   * @notice This function disables the given input token
   */
  function disableToken(address _token) public virtual onlyOwner {
    tokenInformation[_token].enabled = false;
    emit DisableToken(block.timestamp, _token);
  }

  /**
   * @notice This function updates a list of externalSwapHandlers and enables it
   */
  function enableExternalSwapHandler(address swapHandler) public virtual onlyOwner {
    externalSwapHandler[swapHandler] = true;
    emit EnableExternalSwapHandler(block.timestamp, swapHandler);
  }

  /**
   * @notice This function disables the externalSwapHandler input
   */
  function disableExternalSwapHandler(address swapHandler) public virtual onlyOwner {
    externalSwapHandler[swapHandler] = false;
    emit DisableExternalSwapHandler(block.timestamp, swapHandler);
  }

  /**
   * @notice This function returns a bool according to given input is an externalSwapHandler or not
   */
  function isExternalSwapHandler(address swapHandler) public view virtual returns (bool) {
    return externalSwapHandler[swapHandler];
  }

  /**
   * @notice This function updates the velvetTreasuryAddress with the given input
   */
  function updateVelvetTreasury(address _newVelvetTreasury) public virtual onlyOwner {
    velvetTreasury = _newVelvetTreasury;
  }

  /**
   * @notice This function allows to update the WETH value from the registry
   */
  function updateWETH(address _newWETH) public virtual onlyOwner {
    WETH = _newWETH;
  }

  /**
   * @notice This function sets a list of tokens that are permitted from the registry level to be used in the index
   */
  function enablePermittedTokens(address[] calldata _newTokens, address[] calldata _oracle) external virtual onlyOwner {
    if (_newTokens.length == 0) {
      revert ErrorLibrary.InvalidLength();
    }

    for (uint256 i = 0; i < _newTokens.length; i++) {
      TokenRecord memory tokenInfo = getTokenInformation(_newTokens[i]);

      if (_permittedToken[_newTokens[i]]) {
        revert ErrorLibrary.AddressAlreadyApproved();
      }
      if (!isEnabled(_newTokens[i])) {
        revert ErrorLibrary.TokenNotEnabled();
      }
      if (!tokenInfo.primary) {
        revert ErrorLibrary.TokenNotPrimary();
      }

      IPriceOracle oracle = IPriceOracle(_oracle[i]);

      address[] memory underlying = IHandler(tokenInfo.handler).getUnderlying(_newTokens[i]);
      for (uint256 j = 0; j < underlying.length; j++) {
        if (!(oracle.getPriceTokenUSD18Decimals(underlying[j], 1 ether) > 0)) {
          revert ErrorLibrary.TokenNotInPriceOracle();
        }
      }

      _permittedToken[_newTokens[i]] = true;
    }
    emit EnablePermittedTokens(block.timestamp, _newTokens);
  }

  /**
   * @notice This function allows to disable tokens that have been permitted initially
   */
  function disablePermittedTokens(address[] calldata _tokens) external virtual onlyOwner {
    if (_tokens.length == 0) {
      revert ErrorLibrary.InvalidLength();
    }
    for (uint256 i = 0; i < _tokens.length; i++) {
      if (_tokens[i] == address(0)) {
        revert ErrorLibrary.InvalidTokenAddress();
      }
      if (!(_permittedToken[_tokens[i]])) {
        revert ErrorLibrary.AddressNotApproved();
      }
      delete _permittedToken[_tokens[i]];
    }
    emit DisablePermittedTokens(block.timestamp, _tokens);
  }

  /**
   * @notice This function checks if the token is permitted in the registry or not
   */
  function isPermitted(address _token) public view virtual returns (bool) {
    if (_token == address(0)) {
      revert ErrorLibrary.InvalidTokenAddress();
    }
    return _permittedToken[_token];
  }

  /**
   * @notice This function allows us to pause the protocol before certain operations
   */
  function setProtocolPause(bool _state) external virtual onlyOwner {
    protocolPause = _state;
  }

  /**
   * @notice This function returns the protocol state, paused or not
   */
  function getProtocolState() public view virtual returns (bool) {
    return protocolPause;
  }

  /**
   * @notice This function returns the WETH value from the registry
   */
  function getETH() public view virtual returns (address) {
    return WETH;
  }

  /**
   * @notice This function is used to set the cooldown period
   */
  function setCoolDownPeriod(uint256 newCoolDownPeriod) external onlyOwner {
    COOLDOWN_PERIOD = newCoolDownPeriod;
  }

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
