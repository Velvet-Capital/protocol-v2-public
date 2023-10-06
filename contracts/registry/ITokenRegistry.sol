// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.16;

interface ITokenRegistry {
  struct TokenRecord {
    bool primary;
    bool enabled;
    address handler;
    address[] rewardTokens;
  }

  function enableToken(address _oracle, address _token) external;

  function isEnabled(address _token) external view returns (bool);

  function isSwapHandlerEnabled(address swapHandler) external view returns (bool);

  function isOffChainHandlerEnabled(address offChainHandler) external view returns (bool);

  function disableToken(address _token) external;

  function checkNonDerivative(address handler) external view returns (bool);

  function getTokenInformation(address) external view returns (TokenRecord memory);

  function enableExternalSwapHandler(address swapHandler) external;

  function disableExternalSwapHandler(address swapHandler) external;

  function isExternalSwapHandler(address swapHandler) external view returns (bool);

  function isRewardToken(address) external view returns (bool);

  function velvetTreasury() external returns (address);

  function IndexOperationHandler() external returns (address);

  function WETH() external returns (address);

  function protocolFee() external returns (uint256);

  function protocolFeeBottomConstraint() external returns (uint256);

  function maxManagementFee() external returns (uint256);

  function maxPerformanceFee() external returns (uint256);

  function maxEntryFee() external returns (uint256);

  function maxExitFee() external returns (uint256);

  function exceptedRangeDecimal() external view returns(uint256);

  function MIN_VELVET_INVESTMENTAMOUNT() external returns (uint256);

  function MAX_VELVET_INVESTMENTAMOUNT() external returns (uint256);

  function enablePermittedTokens(address[] calldata _newTokens) external;

  function setIndexCreationState(bool _state) external;

  function setProtocolPause(bool _state) external;

  function setExceptedRangeDecimal(uint256 _newRange) external ;

  function getProtocolState() external returns (bool);

  function disablePermittedTokens(address[] calldata _tokens) external;

  function isPermitted(address _token) external returns (bool);

  function getETH() external view returns (address);

  function COOLDOWN_PERIOD() external view returns (uint256);

  function setMaxAssetLimit(uint256) external;

  function getMaxAssetLimit() external view returns (uint256);
}