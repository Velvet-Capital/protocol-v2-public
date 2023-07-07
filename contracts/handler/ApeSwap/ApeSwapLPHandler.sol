// SPDX-License-Identifier: MIT

// ApeSwap Official Docs: https://apeswap.gitbook.io/apeswap-finance/welcome/master
// ApeSwap GitHub: https://github.com/ApeSwapFinance/

/**
 * @title Handler for the ApeSwap's LP protocol
 * @author Velvet.Capital
 * @notice This contract is used to add and remove liquidity
 *      to/from the ApeSwap protocol.
 * @dev This contract includes functionalities:
 *      1. Add liquidity to the ApeSwap protocol
 *      2. Remove liquidity from the ApeSwap protocol
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity 0.8.16;

import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/utils/math/SafeMathUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/Initializable.sol";
import {Ownable} from "@openzeppelin/contracts-4.8.2/access/Ownable.sol";

import {LPInterface} from "../interfaces/LPInterface.sol";
import {RouterInterface} from "../interfaces/RouterInterface.sol";
import {FactoryInterface} from "../interfaces/FactoryInterface.sol";
import {IMasterChef} from "./interfaces/IMasterChef.sol";

import {Babylonian} from "@uniswap/lib/contracts/libraries/Babylonian.sol";
import {IPriceOracle} from "../../oracle/IPriceOracle.sol";
import {IHandler} from "../IHandler.sol";

import {FullMath} from "../libraries/FullMath.sol";
import {ErrorLibrary} from "./../../library/ErrorLibrary.sol";
import {SlippageControl} from "../SlippageControl.sol";
import {FunctionParameters} from "../../FunctionParameters.sol";
import {UniswapV2LPHandler} from "../AbstractLPHandler.sol";

contract ApeSwapLPHandler is IHandler, SlippageControl, UniswapV2LPHandler {
  using SafeMathUpgradeable for uint256;

  IPriceOracle public _oracle;

  address public constant routerAddress = 0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7;
  RouterInterface public router = RouterInterface(routerAddress);
  uint256 public constant DIVISOR_INT = 10_000;
  address public constant MASTER_CHEF = 0x5c8D727b265DBAfaba67E050f2f739cAeEB4A6F9;

  mapping(address => uint256) pid;

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
    if (t == address(0) || _tokenHolder == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    uint lB = _calculatePrice(t, address(_oracle));
    uint256 balance = _getTokenBalance(_tokenHolder, t);
    uint finalLB = lB.mul(balance).div(10 ** 18);
    return finalLB;
  }

  /**
   * @notice This function allows to map token addresses to their protocol's pid value
   */
  function pidMap(address[] calldata _lpTokens, uint256[] calldata _pid) external onlyOwner {
    if (_lpTokens.length != _pid.length) {
      revert ErrorLibrary.InvalidLength();
    }
    uint256 len = _lpTokens.length;
    for (uint256 i = 0; i < len; i++) {
      pid[_lpTokens[i]] = _pid[i];
    }
  }

  /**
   * @notice This function allows to remove entries from the pid map
   */
  function removePidMap(address[] calldata _lpTokens, uint256[] calldata _pid) external onlyOwner {
    if (_lpTokens.length != _pid.length) {
      revert ErrorLibrary.InvalidLength();
    }
    uint256 len = _lpTokens.length;
    for (uint256 i = 0; i < len; i++) {
      require(pid[_lpTokens[i]] == _pid[i], "Invalid PID");
      delete (pid[_lpTokens[i]]);
    }
  }

  function encodeData(address t, uint256 _amount) public returns (bytes memory) {}

  function getRouterAddress() public view returns (address) {}

  function getClaimTokenCalldata(address _token, address) public view returns (bytes memory, address) {}

  receive() external payable {}
}
