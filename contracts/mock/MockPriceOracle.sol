// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {AggregatorV2V3Interface, AggregatorInterface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV2V3Interface.sol";
import {Denominations} from "@chainlink/contracts/src/v0.8/Denominations.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";

contract MockPriceOracle is Ownable {
  /// @notice Thrown when aggregator already exists in price oracle
  error AggregatorAlreadyExists();
  /// @notice Thrown when zero address is passed in aggregator
  error FeedNotFound();

  struct AggregatorInfo {
    mapping(address => AggregatorV2V3Interface) aggregatorInterfaces;
  }

  mapping(address => AggregatorInfo) internal aggregatorAddresses;
  mapping(address => int256) internal mockPrice;

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
      if (aggregatorAddresses[base[i]].aggregatorInterfaces[quote[i]] != AggregatorInterface(address(0))) {
        revert AggregatorAlreadyExists();
      }
      aggregatorAddresses[base[i]].aggregatorInterfaces[quote[i]] = aggregator[i];
    }
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
   * @return price The latest token price of the pair
   */
  function latestRoundData(address base, address quote) internal view returns (int256 price) {
    price = _getMockData(base, quote);
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
   * @return price The latest token price of the pair
   */
  function getPriceForAmount(address token, uint256 amount, bool ethPath) public view returns (uint256 price) {
    if (ethPath) {
      price = getPriceTokenUSD18Decimals(token, amount);
    } else {
      price = uint256(latestRoundData(Denominations.ETH, Denominations.USD));
    }
  }

  /**
   * @notice Returns the latest price for a specific amount
   * @param tokenIn token asset address
   * @param tokenOut token asset address
   * @return amountOut The latest token price of the pair
   */
  function getPriceForTokenAmount(
    address tokenIn,
    address tokenOut,
    uint256 amount
  ) public view returns (uint256 amountOut) {
    uint256 price = getPriceTokenUSD18Decimals(tokenIn, amount);
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
    amountOut = (amountIn * (10 ** decimal)) / (output);
  }

  /**
   * @notice This is a getter function used to retrieve the mock price of the base address
   */
  function _getMockData(address base, address quote) internal view returns (int256) {
    return mockPrice[base];
  }

  /**
   * @notice This is a setter function used to set the mock price of the base address
   */
  function setMockData(address base, int256 price) external {
    mockPrice[base] = price;
  }
}
