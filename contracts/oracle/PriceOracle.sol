// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {AggregatorV2V3Interface, AggregatorInterface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV2V3Interface.sol";
import {Denominations} from "@chainlink/contracts/src/v0.8/Denominations.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";

contract PriceOracle is Ownable {
  /// @notice Thrown when aggregator already exists in price oracle
  error AggregatorAlreadyExists();
  /// @notice Thrown when zero address is passed in aggregator
  error FeedNotFound();

  struct AggregatorInfo {
    mapping(address => AggregatorV2V3Interface) aggregatorInterfaces;
  }

  address public WETH;

  mapping(address => AggregatorInfo) internal aggregatorAddresses;

  uint256 public oracleExpirationThreshold;

  // Events
  event addFeed(address[] base, address[] quote, AggregatorV2V3Interface[] aggregator);
  event updateFeed(address base, address quote, address aggregator);

  constructor(address _WETH) {
    WETH = _WETH;
    oracleExpirationThreshold = 90000; // 25 hours
  }

  /**
   * @notice Retrieve the aggregator of an base / quote pair in the current phase
   * @param base base asset address
   * @param quote quote asset address
   * @return aggregator
   */
  function _getFeed(address base, address quote) internal view returns (AggregatorV2V3Interface aggregator) {  
    aggregator = aggregatorAddresses[base].aggregatorInterfaces[quote];
  }

  /**
   * @notice Add a new aggregator of an base / quote pair
   * @param base base asset address
   * @param quote quote asset address
   * @param aggregator aggregator
   */
  function _addFeed(
    address[] memory base,
    address[] memory quote,
    AggregatorV2V3Interface[] memory aggregator
  ) public onlyOwner {
    if (!((base.length == quote.length) && (quote.length == aggregator.length)))
      revert ErrorLibrary.IncorrectArrayLength();

    for (uint256 i = 0; i < base.length; i++) {
      if(base[i] == address(0))
        revert ErrorLibrary.InvalidAddress();
      if(quote[i] == address(0))
        revert ErrorLibrary.InvalidAddress();
      if((address(aggregator[i])) == address(0))
        revert ErrorLibrary.InvalidAddress();
      
      if (aggregatorAddresses[base[i]].aggregatorInterfaces[quote[i]] != AggregatorInterface(address(0))) {
        revert AggregatorAlreadyExists();
      }
      aggregatorAddresses[base[i]].aggregatorInterfaces[quote[i]] = aggregator[i];
    }
    emit addFeed(base, quote, aggregator);
  }

  /**
   * @notice Updatee an existing feed
   * @param base base asset address
   * @param quote quote asset address
   * @param aggregator aggregator
   */
  function _updateFeed(address base, address quote, AggregatorV2V3Interface aggregator) public onlyOwner {
    if(base == address(0))
      revert ErrorLibrary.InvalidAddress();
    if(quote == address(0))
      revert ErrorLibrary.InvalidAddress();
    if((address(aggregator)) == address(0))
      revert ErrorLibrary.InvalidAddress();
    
    aggregatorAddresses[base].aggregatorInterfaces[quote] = aggregator;
    emit updateFeed(base, quote, address(aggregator));
  }

  /**
   * @notice Returns the decimals of a token pair price feed
   * @param base base asset address
   * @param quote quote asset address
   * @return Decimals of the token pair
   */
  function decimals(address base, address quote) public view returns (uint8) {
    AggregatorV2V3Interface aggregator = _getFeed(base, quote);
    if (address(aggregator) == address(0)) {
      revert FeedNotFound();
    }
    return aggregator.decimals();
  }

  /**
   * @notice Returns the latest price
   * @param base base asset address
   * @param quote quote asset address
   * @return The latest token price of the pair
   */
  function latestRoundData(address base, address quote) internal view returns (int256) {
    (
      ,
      /*uint80 roundID*/
      int256 price /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/,
      ,
      uint256 updatedAt,

    ) = aggregatorAddresses[base].aggregatorInterfaces[quote].latestRoundData();

    if (updatedAt + oracleExpirationThreshold < block.timestamp) {
      revert ErrorLibrary.PriceOracleExpired();
    }

    if (price == 0) {
      revert ErrorLibrary.PriceOracleInvalid();
    }

    return price;
  }

  /**
   * @notice Returns the latest ETH price for a specific token amount
   * @param amountIn The amount of base tokens to be converted to ETH
   * @return amountOut The latest ETH token price of the base token
   */
  function getUsdEthPrice(uint256 amountIn) public view returns (uint256 amountOut) {
    uint256 price = uint256(latestRoundData(Denominations.ETH, Denominations.USD));
    uint256 decimal = decimals(Denominations.ETH, Denominations.USD);
    amountOut = (amountIn * (10 ** decimal)) / (price);
  }

  /**
   * @notice Returns the latest USD price for a specific token amount
   * @param amountIn The amount of base tokens to be converted to ETH
   * @return amountOut The latest USD token price of the base token
   */
  function getEthUsdPrice(uint256 amountIn) public view returns (uint256 amountOut) {
    uint256 price = uint256(latestRoundData(Denominations.ETH, Denominations.USD));
    uint256 decimal = decimals(Denominations.ETH, Denominations.USD);
    amountOut = (amountIn * price) / (10 ** decimal);
  }

  /**
   * @notice Returns the latest price
   * @param base base asset address
   * @param quote quote asset address
   * @return The latest token price of the pair
   */
  function getPrice(address base, address quote) public view returns (int256) {
    int256 price = latestRoundData(base, quote);
    return price;
  }

  /**
   * @notice Returns the latest price for a specific amount
   * @param token token asset address
   * @param amount token amount
   * @param ethPath boolean parameter for is the path for ETH (native token)
   * @return amountOut The latest token price of the pair
   */
  function getPriceForAmount(address token, uint256 amount, bool ethPath) public view returns (uint256 amountOut) {
    // token / eth
    if (ethPath) {
      // getPriceTokenUSD18Decimals returns usd amount in 18 decimals
      uint256 price = getPriceTokenUSD18Decimals(token, amount);
      amountOut = getUsdEthPrice(price);
    } else {
      // eth will be in 18 decimals, price and decimal2 is also 18 decimals
      uint256 price = uint256(latestRoundData(Denominations.ETH, Denominations.USD));
      uint256 decimal2 = decimals(Denominations.ETH, Denominations.USD);
      // getPriceUSDToken returns the amount in decimals of token (out)
      amountOut = getPriceUSDToken(token, (price * amount) / (10 ** decimal2));
    }
  }

  /**
   * @notice Returns the latest price for a specific amount
   * @param tokenIn token asset address
   * @param tokenOut token asset address
   * @param amount token amount
   * @return amountOut The latest token price of the pair
   */

  function getPriceForTokenAmount(
    address tokenIn,
    address tokenOut,
    uint256 amount
  ) public view returns (uint256 amountOut) {
    // getPriceTokenUSD18Decimals returns usd amount in 18 decimals
    uint256 price = getPriceTokenUSD18Decimals(tokenIn, amount);
    // getPriceUSDToken returns the amount in decimals of token (out)
    amountOut = getPriceUSDToken(tokenOut, price);
  }

  /**
   * @notice Returns the latest USD price for a specific token and amount
   * @param _base base asset address
   * @param amountIn The amount of base tokens to be converted to USD
   * @return amountOut The latest USD token price of the base token
   */
  function getPriceTokenUSD18Decimals(address _base, uint256 amountIn) public view returns (uint256 amountOut) {
    uint256 output = uint256(getPrice(_base, Denominations.USD));
    uint256 decimalChainlink = decimals(_base, Denominations.USD);
    IERC20MetadataUpgradeable token = IERC20MetadataUpgradeable(_base);
    uint8 decimal = token.decimals();

    uint256 diff = uint256(18) - (decimal);

    amountOut = (output * amountIn * (10 ** diff)) / (10 ** decimalChainlink);
  }

  /**
   * @notice Returns the latest token price for a specific USD amount
   * @param _base base asset address
   * @param amountIn The amount of base tokens to be converted to USD
   * @return amountOut The latest USD token price of the base token
   */
  function getPriceUSDToken(address _base, uint256 amountIn) public view returns (uint256 amountOut) {
    uint256 output = uint256(getPrice(_base, Denominations.USD));
    uint256 decimal = decimals(_base, Denominations.USD);

    uint8 tokenOutDecimal = IERC20MetadataUpgradeable(_base).decimals();
    uint256 diff = uint256(18) - (tokenOutDecimal);

    amountOut = ((amountIn * (10 ** decimal)) / output) / (10 ** diff);
  }

  /**
   * @notice Returns the latest token price for a specific token for 1 unit
   * @param _base base asset address
   * @return amountOut The latest USD token price of the base token in 18 decimals
   */
  function getPriceForOneTokenInUSD(address _base) public view returns (uint256 amountOut) {
    uint256 amountIn = 10 ** IERC20MetadataUpgradeable(_base).decimals();
    amountOut = getPriceTokenUSD18Decimals(_base, amountIn);
  }

  /**
   * @notice Updates the oracle timeout threshold
   * @param _newTimeout New timeout threshold set by owner
   */
  function updateOracleExpirationThreshold(uint256 _newTimeout) public onlyOwner {
    oracleExpirationThreshold = _newTimeout;
  }
}
