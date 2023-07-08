// SPDX-License-Identifier: MIT

// BiSwap Official Docs: https://docs.biswap.org/biswap/
// BiSwap GitHub: https://github.com/biswap-org

/**
 * @title Handler for the BiSwap's LP protocol
 * @author Velvet.Capital
 * @notice This contract is used to add and remove liquidity
 *      to/from the BiSwap protocol.
 * @dev This contract includes functionalities:
 *      1. Add liquidity to the BiSwap protocol
 *      2. Remove liquidity from the BiSwap protocol
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity 0.8.16;

import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";

import {LPInterface} from "../interfaces/LPInterface.sol";
import {RouterInterface} from "../interfaces/RouterInterface.sol";
import {FactoryInterface} from "../interfaces/FactoryInterface.sol";
import {IMasterChef} from "./interfaces/IMasterChef.sol";
import {ISwapFeeRewardWithRB} from "./interfaces/ISwapFeeRewardWithRB.sol";
import {Babylonian} from "@uniswap/lib/contracts/libraries/Babylonian.sol";
import {IPriceOracle} from "../../oracle/IPriceOracle.sol";
import {IHandler} from "../IHandler.sol";

import {FullMath} from "../libraries/FullMath.sol";
import {ErrorLibrary} from "./../../library/ErrorLibrary.sol";
import {SlippageControl} from "../SlippageControl.sol";
import {FunctionParameters} from "../../FunctionParameters.sol";
import {UniswapV2LPHandler} from "../AbstractLPHandler.sol";

contract BiSwapLPHandler is IHandler, SlippageControl, UniswapV2LPHandler {
  using SafeMathUpgradeable for uint256;

  IPriceOracle public _oracle;

  address public constant routerAddress = 0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8;
  RouterInterface public router = RouterInterface(routerAddress);
  uint256 public constant DIVISOR_INT = 10_000;

  address public constant SWAP_FEE_REWARD = 0x04eFD76283A70334C72BB4015e90D034B9F3d245;
  address public constant MASTER_CHEF = 0xDbc1A13490deeF9c3C12b44FE77b503c1B061739;

  event Deposit(uint256 time, address indexed user, address indexed token, uint256[] amounts, address indexed to);
  event Redeem(
    uint256 time,
    address indexed user,
    address indexed token,
    uint256 amount,
    address indexed to,
    bool isWETH
  );

  constructor(address _priceOracle) {
    require(_priceOracle != address(0), "Oracle having zero address");
    _oracle = IPriceOracle(_priceOracle);
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
  ) public payable override {
    address[] memory t = getUnderlying(_lpAsset);
    uint p1 = _oracle.getPriceTokenUSD18Decimals(t[0], 1000000000000000000);
    uint p2 = _oracle.getPriceTokenUSD18Decimals(t[1], 1000000000000000000);
    _deposit(_lpAsset, _amount, _lpSlippage, _to, address(router), user, p1, p2);
    emit Deposit(block.timestamp, msg.sender, _lpAsset, _amount, _to);
  }

  /**
   * @notice This function remove liquidity from the PancakeSwap protocol
   */
  function redeem(FunctionParameters.RedeemData calldata inputData) public override {
    address[] memory t = getUnderlying(inputData._yieldAsset);
    uint p1 = _oracle.getPriceTokenUSD18Decimals(t[0], 1000000000000000000);
    uint p2 = _oracle.getPriceTokenUSD18Decimals(t[1], 1000000000000000000);
    _redeem(inputData, routerAddress, p1, p2);
    emit Redeem(block.timestamp, msg.sender, inputData._yieldAsset, inputData._amount, inputData._to, inputData.isWETH);
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
   * @param t Address of the protocol token
   * @return tokenBalance t token balance of the holder
   */
  function getTokenBalance(address _tokenHolder, address t) public view override returns (uint256 tokenBalance) {
    return _getTokenBalance(_tokenHolder, t);
  }

  /**
   * @notice This function returns the underlying asset balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token's underlying asset balance of the holder
   */
  function getUnderlyingBalance(address _tokenHolder, address t) public view override returns (uint256[] memory) {
    return _getUnderlyingBalance(_tokenHolder, t);
  }

  /**
   * @notice This function returns the USD value of the LP asset using Fair LP Price model
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return finalLB value of the lp asset t
   */
  function getFairLpPrice(address _tokenHolder, address t) public view returns (uint) {
    uint lB = _calculatePrice(t, address(_oracle));
    uint256 balance = _getTokenBalance(_tokenHolder, t);
    uint finalLB = lB.mul(balance).div(10 ** 18);
    return finalLB;
  }

  function encodeData(address t, uint256 _amount) public returns (bytes memory) {}

  function getRouterAddress() public view returns (address) {}

  function getClaimTokenCalldata(address _token, address) public view returns (bytes memory, address) {}

  receive() external payable {}
}
