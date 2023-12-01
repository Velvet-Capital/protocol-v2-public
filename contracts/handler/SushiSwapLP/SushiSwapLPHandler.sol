// SPDX-License-Identifier: MIT

// PancakeSwap Official Docs: https://docs.pancakeswap.finance/
// PancakeSwap GitHub: https://github.com/pancakeswap

/**
 * @title Handler for the PancakeSwap's LP protocol
 * @author Velvet.Capital
 * @notice This contract is used to add and remove liquidity
 *      to/from the PancakeSwap protocol.
 * @dev This contract includes functionalities:
 *      1. Add liquidity to the PancakeSwap protocol
 *      2. Remove liquidity from the PancakeSwap protocol
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity 0.8.16;

import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {LPInterface} from "../interfaces/LPInterface.sol";
import {RouterInterface} from "../interfaces/RouterInterface.sol";
import {FactoryInterface} from "../interfaces/FactoryInterface.sol";
import {IMasterChef} from "./interfaces/IMasterChef.sol";
import {IMainStaking} from "./interfaces/IMainStaking.sol";
import {Babylonian} from "@uniswap/lib/contracts/libraries/Babylonian.sol";
import {IPriceOracle} from "../../oracle/IPriceOracle.sol";
import {IHandler} from "../IHandler.sol";
import {SlippageControl} from "../SlippageControl.sol";
import {FullMath} from "../libraries/FullMath.sol";
import {ErrorLibrary} from "./../../library/ErrorLibrary.sol";
import {FunctionParameters} from "../../FunctionParameters.sol";
import {UniswapV2LPHandler} from "../AbstractLPHandler.sol";
import {Denominations} from "@chainlink/contracts/src/v0.8/Denominations.sol";

contract SushiSwapLPHandler is IHandler, SlippageControl, UniswapV2LPHandler {
  IPriceOracle internal _oracle;

  RouterInterface internal router;
  event Deposit(address indexed user, address indexed token, uint256[] amounts, address indexed to);
  event Redeem(address indexed user, address indexed token, uint256 amount, address indexed to, bool isWETH);

  /**
   * @param _priceOracle address of price oracle
   * @param _routerAddress address of sushiswapLp protocol router used for deposit and withdraw
   */
  constructor(address _priceOracle, address _routerAddress) {
    if (_priceOracle == address(0) || _routerAddress == address(0)) revert ErrorLibrary.InvalidAddress();
    _oracle = IPriceOracle(_priceOracle);
    router = RouterInterface(_routerAddress);
  }

  /**
   * @notice This function adds liquidity to the PancakeSwap protocol
   * @param _lpAsset Address of the protocol asset to be deposited
   * @param _amount Amount that is to be deposited
   * @param _lpSlippage LP slippage value passed to the function
   * @param _to Address that would receive the cTokens in return
   */
  function deposit(
    address _lpAsset,
    uint256[] memory _amount,
    uint256 _lpSlippage,
    address _to,
    address user
  ) public payable override returns (uint256 _mintedAmount) {
    if (_lpAsset == address(0) || _to == address(0) || user == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory t = getUnderlying(_lpAsset);
    uint p1 = _oracle.getPriceForOneTokenInUSD(t[0]);
    uint p2 = _oracle.getPriceForOneTokenInUSD(t[1]);
    _mintedAmount = _deposit(_lpAsset, _amount, _lpSlippage, _to, address(router), user, address(_oracle), p1, p2);
    emit Deposit(msg.sender, _lpAsset, _amount, _to);
  }

  /**
   * @notice This function remove liquidity from the PancakeSwap protocol
   */
  function redeem(FunctionParameters.RedeemData calldata inputData) public override {
    if (inputData._yieldAsset == address(0) || inputData._to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory t = getUnderlying(inputData._yieldAsset);
    uint p1 = _oracle.getPriceForOneTokenInUSD(t[0]);
    uint p2 = _oracle.getPriceForOneTokenInUSD(t[1]);
    _redeem(inputData, address(router), p1, p2);
    emit Redeem(msg.sender, inputData._yieldAsset, inputData._amount, inputData._to, inputData.isWETH);
  }

  /**
   * @notice This function returns address of the underlying asset
   * @param _lpToken Address of the protocol token whose underlying asset is needed
   * @return underlying Address of the underlying asset
   */
  function getUnderlying(address _lpToken) public view override returns (address[] memory) {
    return _getUnderlyingTokens(_lpToken);
  }

  /**
   * @notice This function returns the protocol token balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param _token Address of the protocol token
   * @return tokenBalance t token balance of the holder
   */
  function getTokenBalance(address _tokenHolder, address _token) public view override returns (uint256 tokenBalance) {
    return _getTokenBalance(_tokenHolder, _token);
  }

  /**
   * @notice This function returns the USD value of the LP asset using Fair LP Price model
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param _token Address of the protocol token
   */
  function getTokenBalanceUSD(address _tokenHolder, address _token) public view override returns (uint256) {
    if (_token == address(0) || _tokenHolder == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    return _calculatePriceForBalance(_token, address(_oracle), _getTokenBalance(_tokenHolder, _token));
  }

  function getUnderlyingBalance(address _tokenHolder, address) public view override returns (uint256[] memory) {}

  function encodeData(address, uint256 _amount) public view returns (bytes memory) {}

  function getRouterAddress() public pure returns (address) {}

  function getClaimTokenCalldata(address, address) public view returns (bytes memory, address) {}

  receive() external payable {}
}