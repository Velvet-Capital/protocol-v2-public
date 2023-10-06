// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {FunctionParameters} from "../FunctionParameters.sol";

interface IAssetManagerConfig {
  function init(FunctionParameters.AssetManagerConfigInitData calldata initData) external;

  function managementFee() external view returns (uint256);

  function performanceFee() external view returns (uint256);

  function entryFee() external view returns (uint256);

  function exitFee() external view returns (uint256);

  function MAX_INVESTMENTAMOUNT() external view returns (uint256);

  function MIN_INVESTMENTAMOUNT() external view returns (uint256);

  function assetManagerTreasury() external returns (address);

  function whitelistedToken(address) external returns (bool);

  function whitelistedUsers(address) external returns (bool);

  function publicPortfolio() external returns (bool);

  function transferable() external returns (bool);

  function transferableToPublic() external returns (bool);

  function whitelistTokens() external returns (bool);

  function setPermittedTokens(address[] calldata _newTokens) external;

  function deletePermittedTokens(address[] calldata _newTokens) external;

  function isTokenPermitted(address _token) external returns (bool);
}
