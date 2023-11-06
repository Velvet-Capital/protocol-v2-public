// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {AggregatorV3Interface} from "./AggregatorV3Interface.sol";
import {LPInterface} from "../../handler/interfaces/LPInterface.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Babylonian} from "@uniswap/lib/contracts/libraries/Babylonian.sol";
import {IPriceOracle} from "../IPriceOracle.sol";

/**
 * @title Uniswap-v2 LP aggregator
 * @notice You can use this contract for lp token pricing oracle.
 * @dev This should have `latestRoundData` function as chainlink pricing oracle.
 */
contract UniswapV2LPAggregator is AggregatorV3Interface {

  address public pair;
  address public token0;
  address public token1;
  uint256 public decimal0;
  uint256 public decimal1;

  IPriceOracle public oracle;
  constructor(address _pair, address _oracle) {
    require(_pair != address(0), "_pair address cannot be 0");
    require(_oracle != address(0), "_oracle address cannot be 0");
    pair = _pair;
    token0 = LPInterface(pair).token0();
    token1 = LPInterface(pair).token1();
    oracle = IPriceOracle(_oracle);
    decimal0 = IERC20Metadata(token0).decimals();
    decimal1 = IERC20Metadata(token1).decimals();
  }

  function decimals() external pure override returns (uint8) {
    return 8;
  }

  /**
   * @notice Get the latest round data. Should be the same format as chainlink aggregator.
   * @return roundId The round ID.
   * @return answer The price - the latest round data of a given uniswap-v2 lp token (price decimal: 8)
   * @return startedAt Timestamp of when the round started.
   * @return updatedAt Timestamp of when the round was updated.
   * @return answeredInRound The round ID of the round in which the answer was computed.
   */
  function latestRoundData()
    external
    view
    override
    returns (
      uint80,
      int256,
      uint256,
      uint256,
      uint80
    )
  {
    // calculate lp price
    // referenced from
    // https://github.com/AlphaFinanceLab/homora-v2/blob/master/contracts/oracle/UniswapV2Oracle.sol

    // uint256 price = _calculatePrice();
    (uint256 price0, uint256 price1) = _getTokenPrices();
    uint256 totalSupply = LPInterface(pair).totalSupply();
    (uint256 reserve0, uint256 reserve1, ) = LPInterface(pair).getReserves();

    reserve0 = reserve0 * (10**18) / (10**decimal0); // decimal = 18
    reserve1 = reserve1 * (10**18) / (10**decimal1); // decimal = 18
    
    uint256 sqrtReserve = Babylonian.sqrt(reserve0 * reserve1); // decimal = 18
    uint256 sqrtPrice = Babylonian.sqrt(price0 * price1); // decimal = 18

    uint256 price = ((sqrtReserve * (sqrtPrice) * 2) / totalSupply / (10**10)); // decimal = 8

    // we don't need roundId, startedAt and answeredInRound
    return (0, int256(price), 0, block.timestamp, 0);
  }

  /**
   * @notice Fetch underlying token prices from the oracle
   */
  function _getTokenPrices() internal view returns (uint256, uint256) {
    return (oracle.getPriceForOneTokenInUSD(token0),oracle.getPriceForOneTokenInUSD(token1));
  }
}