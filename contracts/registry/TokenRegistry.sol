// SPDX-License-Identifier: BUSL-1.1
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

  mapping(address => TokenRecord) internal tokenInformation;
  mapping(address => bool) internal _swapHandler;
  mapping(address => bool) internal _offChainHandler;

  mapping(address => bool) internal nonDerivativeToken;

  mapping(address => bool) internal externalSwapHandler;

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

  uint256 public exceptedRangeDecimal;

  uint256 public MAX_VELVET_INVESTMENTAMOUNT;
  uint256 public MIN_VELVET_INVESTMENTAMOUNT;

  bool internal protocolPause;

  uint256 internal maxAssetLimit;

  uint256 public COOLDOWN_PERIOD;

  address internal WETH;
  event EnableToken(
    address[] _oracle,
    address[] _token,
    address[] _handler,
    address[][] _rewardTokens,
    bool[] _primary
  );
  event EnableExternalSwapHandler(address swapHandler);
  event DisableExternalSwapHandler(address indexed swapHandler);
  event EnablePermittedTokens(address[] newTokens);
  event DisablePermittedTokens(address[] newTokens);
  event EnableSwapHandlers(address[] handler);
  event DisableSwapHandlers(address[] handler);
  event AddNonDerivative(address handler);
  event AddRewardToken(address[] token, address _baseHandler);
  event RemoveRewardToken(address token);
  event DisableToken(address token);

  /**
   * @notice This function is used to init the Token Registry while deployment
   */
  function initialize(
    uint256 _minVelvetInvestmentAmount,
    uint256 _maxVelvetInvestmentAmount,
    address _velvetTreasury,
    address _weth
  ) external initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();
    if (_velvetTreasury == address(0)) {
      revert ErrorLibrary.ZeroAddressTreasury();
    }

    //25% protocolFee
    protocolFee = 2500;
    //0.3% contraint
    protocolFeeBottomConstraint = 30;
    //10% maxManagementFee
    maxManagementFee = 1000;
    //30% maxPerformanceFee
    maxPerformanceFee = 3000;
    //5% maxEntryFee
    maxEntryFee = 500;
    //5% maxExitFee
    maxExitFee = 500;

    MIN_VELVET_INVESTMENTAMOUNT = _minVelvetInvestmentAmount;
    MAX_VELVET_INVESTMENTAMOUNT = _maxVelvetInvestmentAmount;

    velvetTreasury = _velvetTreasury;

    WETH = _weth;
    //1day cooldownperiod
    COOLDOWN_PERIOD = 1 days;
    maxAssetLimit = 15;

    //10^6 expectedRange
    exceptedRangeDecimal = 1000000;
  }

  /**
   * @notice This function return the record of the given token
   * @param _token Address of the token whose inforamtion is to be retrieved
   */
  function getTokenInformation(address _token) external view virtual returns (TokenRecord memory) {
    return tokenInformation[_token];
  }

  /**
   * @notice This function updates a list of token along with it's handler and and primary bool and enables it
   * @param _oracle Address of the price oracle being used
   * @param _token Address of the token to be enabled in the registry
   * @param _handler Address of the handler associated with the token (protocol)
   * @param _rewardTokens Address of the reward token associated with the token of that protocol
   * @param _primary Boolean paramter for is the token primary or derivative
   */
  function enableToken(
    address[] memory _oracle,
    address[] memory _token,
    address[] memory _handler,
    address[][] memory _rewardTokens,
    bool[] memory _primary
  ) external virtual onlyOwner {
    if (
      !((_oracle.length == _token.length) &&
        (_token.length == _handler.length) &&
        (_handler.length == _rewardTokens.length) &&
        (_rewardTokens.length == _primary.length))
    ) revert ErrorLibrary.IncorrectArrayLength();

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
      setTokenInfo(_token[i], _primary[i], _handler[i], true, _rewardTokens[i]);
    }
    emit EnableToken(_oracle, _token, _handler, _rewardTokens, _primary);
  }

  /**
   * @notice This function is used to add a particular token as a reward token
   * @param _token Array of address of the token to be added as a reward token
   * @param _baseHandler Address of base handler of the token
   */
  function addRewardToken(address[] memory _token, address _baseHandler) external onlyOwner {
    if (_baseHandler == address(0)) {
        revert ErrorLibrary.InvalidHandlerAddress();
    }
    for (uint i = 0; i < _token.length; i++) {
      if (_token[i] == address(0)) {
        revert ErrorLibrary.InvalidTokenAddress();
      }
      address[] memory zeroAddress = new address[](1);
      zeroAddress[0] = address(0);
      if (!tokenInformation[_token[i]].enabled) {
        setTokenInfo(_token[i], true, _baseHandler, false, zeroAddress);
      }
      isRewardToken[_token[i]] = true;
    }

    emit AddRewardToken(_token, _baseHandler);
  }

  /**
   * @notice This function is used to remove a particular token as a reward token
   * @param _token Address of the token to be removed as a reward token
   */
  function removeRewardToken(address _token) external onlyOwner {
    if (_token == address(0)) revert ErrorLibrary.InvalidAddress();

    delete isRewardToken[_token];
    emit RemoveRewardToken(_token);
  }

  /**
   * @notice This function updates a list of swapHandlers and enables it
   * @param _handler Array of swap handler addresses to be enabled by the registry
   */
  function enableSwapHandlers(address[] memory _handler) external virtual onlyOwner {
    if (_handler.length == 0) {
      revert ErrorLibrary.InvalidLength();
    }
    for (uint256 i = 0; i < _handler.length; i++) {
      if (_swapHandler[_handler[i]] == true) {
        revert ErrorLibrary.HandlerAlreadyEnabled();
      }
      if (_handler[i] == address(0)) {
        revert ErrorLibrary.InvalidAddress();
      }
      _swapHandler[_handler[i]] = true;
    }
    emit EnableSwapHandlers(_handler);
  }

  /**
   * @notice This function disables the given swapHandler
   * @param _handler Array of swap handler addresses to be disabled by the registry
   */
  function disableSwapHandlers(address[] memory _handler) external virtual onlyOwner {
    if (_handler.length == 0) {
      revert ErrorLibrary.InvalidLength();
    }
    for (uint256 i = 0; i < _handler.length; i++) {
      address handler = _handler[i];
      if (!_swapHandler[handler]) {
        revert ErrorLibrary.HandlerAlreadyDisabled();
      }
      if (handler == address(0)) {
        revert ErrorLibrary.InvalidAddress();
      }
      _swapHandler[handler] = false;
    }
    emit DisableSwapHandlers(_handler);
  }

  /**
   * @notice This function returns if the swap handler is enabled in the registry or not
   * @param swapHandler Address of the swap handler to be checked for
   * @return Boolean parameter for is the swap handler enabled or not
   */
  function isSwapHandlerEnabled(address swapHandler) external view virtual returns (bool) {
    return _swapHandler[swapHandler];
  }

  /**
   * @notice This function returns a bool according to given offChainHandler address
   * @param offChainHandler Address of the offchain handler to be checked for
   * @return Boolean parameter for is the offchain handler enabled or not
   */
  function isOffChainHandlerEnabled(address offChainHandler) external view virtual returns (bool) {
    return _offChainHandler[offChainHandler];
  }

  // todo updatetoken?? -> then require mapping doesn't already exist

  /**
   * @notice This function adds non derivative handler address to record
   * @param handler Address of the handler to be added as a non-derivative handler
   */
  function addNonDerivative(address handler) external virtual onlyOwner {
    if (handler == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    nonDerivativeToken[handler] = true;
    emit AddNonDerivative(handler);
  }

  /**
   * @notice This function returns a bool according to whether the given input is non derivative or not
   * @param handler Address of the handler to be checked for
   * @return Boolean parameter for is the handler non-derivative or not
   */
  function checkNonDerivative(address handler) external view virtual returns (bool) {
    return nonDerivativeToken[handler];
  }

  /**
   * @notice This function returns a bool according to whether the given input token is enabled or not
   * @param _token Address of the token to be checked
   * @return Boolean parameter for is the token enabled in the registry or not
   */
  function isEnabled(address _token) external view virtual returns (bool) {
    return tokenInformation[_token].enabled;
  }

  /**
   * @notice This function disables the given input token
   * @param _token Address of the token to be disabled in the reigstry
   */
  function disableToken(address _token) external virtual onlyOwner {
    if (_token == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    tokenInformation[_token].enabled = false;
    emit DisableToken(_token);
  }

  /**
   * @notice This function updates a list of externalSwapHandlers and enables it
   * @param swapHandler Address of the external swap handler to be enabled in the registry
   */
  function enableExternalSwapHandler(address swapHandler) external virtual onlyOwner {
    if (swapHandler == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    externalSwapHandler[swapHandler] = true;
    emit EnableExternalSwapHandler(swapHandler);
  }

  /**
   * @notice This function disables the externalSwapHandler input
   * @param swapHandler Address of the external swap handler to be disabled in the registry
   */
  function disableExternalSwapHandler(address swapHandler) external virtual onlyOwner {
    if (swapHandler == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    externalSwapHandler[swapHandler] = false;
    emit DisableExternalSwapHandler(swapHandler);
  }

  /**
   * @notice This function returns a bool according to given input is an externalSwapHandler or not
   * @param swapHandler Address of the external swap handler to be checked
   * @return Boolean parameter for is the external swap handler enabled or not
   */
  function isExternalSwapHandler(address swapHandler) external view virtual returns (bool) {
    return externalSwapHandler[swapHandler];
  }

  /**
   * @notice This function updates the velvetTreasuryAddress with the given input
   * @param _newVelvetTreasury Address of the new velvet treasury address to be updated to
   */
  function updateVelvetTreasury(address _newVelvetTreasury) external virtual onlyOwner {
    if (_newVelvetTreasury == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    velvetTreasury = _newVelvetTreasury;
  }

  /**
   * @notice This function allows to update the WETH value from the registry
   * @param _newWETH Address of the new WETH to be added as the WETH address in the registry
   */
  function updateWETH(address _newWETH) external virtual onlyOwner {
    if (_newWETH == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    WETH = _newWETH;
  }

  /**
   * @notice This function sets a list of tokens that are permitted from the registry level to be used as investment/withdrawal tokens
   * @param _newTokens Array of token addresses to be permitted from the registry
   * @param _oracle Array of the corresponding price oracle addresses for the tokens
   */
  function enablePermittedTokens(address[] calldata _newTokens, address[] calldata _oracle) external virtual onlyOwner {
    if (_newTokens.length == 0 || _oracle.length != _newTokens.length) {
      revert ErrorLibrary.InvalidLength();
    }

    for (uint256 i = 0; i < _newTokens.length; i++) {
      address _token = _newTokens[i];
      TokenRecord memory tokenInfo = tokenInformation[_token];

      if (_permittedToken[_token]) {
        revert ErrorLibrary.AddressAlreadyApproved();
      }
      if (!tokenInformation[_token].enabled) {
        revert ErrorLibrary.TokenNotEnabled();
      }
      if (!tokenInfo.primary) {
        revert ErrorLibrary.TokenNotPrimary();
      }
      if (_token == address(0)) {
        revert ErrorLibrary.InvalidAddress();
      }

      IPriceOracle oracle = IPriceOracle(_oracle[i]);

      address[] memory underlying = IHandler(tokenInfo.handler).getUnderlying(_token);
      for (uint256 j = 0; j < underlying.length; j++) {
        if (!(oracle.getPriceTokenUSD18Decimals(underlying[j], 1 ether) > 0)) {
          revert ErrorLibrary.TokenNotInPriceOracle();
        }
      }

      _permittedToken[_token] = true;
    }
    emit EnablePermittedTokens(_newTokens);
  }

  /**
   * @notice This function allows to disable tokens that have been permitted initially as investment/withdrawal tokens
   * @param _tokens Array of token addresses to be disabled (permission revoke) from the registry
   */
  function disablePermittedTokens(address[] calldata _tokens) external virtual onlyOwner {
    if (_tokens.length == 0) {
      revert ErrorLibrary.InvalidLength();
    }
    for (uint256 i = 0; i < _tokens.length; i++) {
      address _token = _tokens[i];
      if (_token == address(0)) {
        revert ErrorLibrary.InvalidTokenAddress();
      }
      if (!(_permittedToken[_token])) {
        revert ErrorLibrary.AddressNotApproved();
      }
      delete _permittedToken[_token];
    }
    emit DisablePermittedTokens(_tokens);
  }

  /**
   * @notice This function checks if the token is permitted in the registry and that, the user can use it for investment or not
   * @param _token Address of the token to be checked for
   * @return Boolean paramter for is the token permitted in the registry or not
   */
  function isPermitted(address _token) external view virtual returns (bool) {
    return _permittedToken[_token];
  }

  /**
   * @notice This function allows us to pause the protocol before certain operations
   * @param _state Boolean parameter to set the pasuse/unpause state of the protocol
   */
  function setProtocolPause(bool _state) external virtual onlyOwner {
    protocolPause = _state;
  }

  /**
   * @notice This function allows us to set new expectedRangeDecimal, based on market condition
   * @param _newRange Value of new Range
   */
  function setExceptedRangeDecimal(uint256 _newRange) external onlyOwner {
    if (_newRange == 0) revert ErrorLibrary.InvalidAmount();
    exceptedRangeDecimal = _newRange;
  }

  /**
   * @notice This function returns the protocol state, paused or not
   * @return Boolean parameter for the current state of the protocol (paused or unpaused)
   */
  function getProtocolState() external view virtual returns (bool) {
    return protocolPause;
  }

  /**
   * @notice This function returns the WETH value from the registry
   * @return Address of the WETH value of the registry
   */
  function getETH() external view virtual returns (address) {
    return WETH;
  }

  /**
   * @notice This function is used to set the cooldown period
   * @param newCoolDownPeriod New cooldown period value to be updated to
   */
  function setCoolDownPeriod(uint256 newCoolDownPeriod) external onlyOwner {
    COOLDOWN_PERIOD = newCoolDownPeriod;
  }

  /**
   * @notice This function sets the limit for the number of assets that a fund can have
   * @param _maxAssetLimit Maximum number of allowed assets in the fund
   */
  function setMaxAssetLimit(uint256 _maxAssetLimit) external onlyOwner {
    maxAssetLimit = _maxAssetLimit;
  }

  /**
   * @notice This function returns the limit for the number of assets that a fund can have
   * @return Current max limit of assets for the fund
   */
  function getMaxAssetLimit() external view virtual returns (uint256) {
    return maxAssetLimit;
  }

  /**
   * @notice This internal function updates a list of token along with it's handler and and primary bool and enables it
   * @param _token Address of the token to be enabled in the registry
   * @param _primary Boolean parameter for is the token primary or derivative
   * @param _handler Address of the handler associated with the token (protocol)
   * @param _enabled Boolean parameter to enable the token
   * @param _rewardToken Address of the reward token associated with the token of that protocol
   */
  function setTokenInfo(
    address _token,
    bool _primary,
    address _handler,
    bool _enabled,
    address[] memory _rewardToken
  ) internal {
    tokenInformation[_token].primary = _primary;
    tokenInformation[_token].handler = _handler;
    tokenInformation[_token].enabled = _enabled;
    tokenInformation[_token].rewardTokens = _rewardToken;
  }

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
