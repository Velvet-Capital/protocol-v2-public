// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import { FunctionParameters } from "../FunctionParameters.sol";
import { IIndexSwap } from "./IIndexSwap.sol"; 
import { ExchangeData } from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";
import { ITokenRegistry } from "../registry/ITokenRegistry.sol";
import { IExchange } from "./IExchange.sol";
import { IAssetManagerConfig } from "../registry/IAssetManagerConfig.sol";

interface IIndexOperations {
  function _swapTokenToTokens(FunctionParameters.SwapTokenToTokensData memory inputData)
    external
    payable
    returns (uint256);

  function swapOffChainTokens(ExchangeData.IndexOperationData memory inputData)
    external
    returns (
      uint256 balanceInUSD,
      uint256 underlyingIndex
    );
}
