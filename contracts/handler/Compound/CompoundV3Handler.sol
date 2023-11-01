// SPDX-License-Identifier: MIT

// Compound Official Docs: https://docs.compound.finance/
// Compound GitHub: https://github.com/compound-finance

/**
 * @title Handler for the Compound protocol
 * @author Velvet.Capital
 * @notice This contract is used to deposit and redeem Bridged USDC (USDC.e)
 *      to/from the Compound protocol.
 * @dev This contract includes functionalities:
 *      1. Deposit Bridged USDC to the Compound protocol
 *      2. Redeem Bridged USDC from the Compound protocol
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity 0.8.16;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import {CometMainInterface} from "./Interfaces/CometMainInterface.sol";

import {IHandler} from "../IHandler.sol";
import {ErrorLibrary} from "./../../library/ErrorLibrary.sol";
import {FunctionParameters} from "contracts/FunctionParameters.sol";
import {IPriceOracle} from "../../oracle/IPriceOracle.sol";

contract CompoundV3Handler is IHandler {
  IPriceOracle internal _oracle;
  address internal _cometReward;

  event Deposit(uint256 time, address indexed user, address indexed token, uint256[] amounts, address indexed to);
  event Redeem(
    uint256 time,
    address indexed user,
    address indexed token,
    uint256 amount,
    address indexed to,
    bool isWETH
  );

  /**
   * @param _priceOracle address of price oracle
   * @param _rewardContract address of compound reward contract
   */
  constructor(address _priceOracle, address _rewardContract) {
    if (_priceOracle == address(0)) revert ErrorLibrary.InvalidAddress();
    _oracle = IPriceOracle(_priceOracle);
    _cometReward = _rewardContract;
  }

  /**
   * @notice This function deposits bridged USDC to the Compound protocol
   * @param _cAsset Address of the asset to be deposited (only USDC.e supported)
   * @param _amount Amount that is to be deposited
   * @param _lpSlippage LP slippage value passed to the function
   * @param _to Address that would receive the cUSDCv3 Tokens in return
   */
  function deposit(
    address _cAsset,
    uint256[] calldata _amount,
    uint256 _lpSlippage,
    address _to,
    address user
  ) public payable override returns (uint256 _mintedAmount) {
    if (_cAsset == address(0) || _to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(_cAsset)[0]);
    CometMainInterface cAsset = CometMainInterface(_cAsset);

    TransferHelper.safeApprove(address(underlyingToken), _cAsset, 0);
    TransferHelper.safeApprove(address(underlyingToken), _cAsset, _amount[0]);
    cAsset.supply(address(underlyingToken), _amount[0]);

    if (_to != address(this)) {
      uint256 cBalance = cAsset.balanceOf(address(this));
      TransferHelper.safeTransfer(_cAsset, _to, cBalance);
    }

    _mintedAmount = _oracle.getPriceTokenUSD18Decimals(address(underlyingToken), _amount[0]);
    emit Deposit(block.timestamp, msg.sender, _cAsset, _amount, _to);
  }

  /**
   * @notice This function redeems bridged USDC from the Compound protocol
   */
  function redeem(FunctionParameters.RedeemData calldata inputData) public override {
    if (inputData._yieldAsset == address(0) || inputData._to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }

    CometMainInterface cAsset = CometMainInterface(inputData._yieldAsset);
    uint256 assetBalance = IERC20Upgradeable(inputData._yieldAsset).balanceOf(address(this));
    if (inputData._amount > assetBalance) {
      revert ErrorLibrary.InsufficientBalance();
    }

    address underlyingToken = getUnderlying(inputData._yieldAsset)[0];
    cAsset.withdraw(underlyingToken, assetBalance);
    if (inputData._to != address(this)) {
      uint256 tokenAmount = IERC20Upgradeable(underlyingToken).balanceOf(address(this));
      TransferHelper.safeTransfer(address(underlyingToken), inputData._to, tokenAmount);
    }

    emit Redeem(block.timestamp, msg.sender, inputData._yieldAsset, inputData._amount, inputData._to, inputData.isWETH);
  }

  /**
   * @notice This function returns address of the underlying asset
   * @param _cToken Address of the protocol token whose underlying asset is needed
   * @return underlying Address of the underlying asset
   */
  function getUnderlying(address _cToken) public view override returns (address[] memory) {
    address[] memory underlying = new address[](1);
    CometMainInterface token = CometMainInterface(_cToken);
    underlying[0] = token.baseToken();
    return underlying;
  }

  /**
   * @notice This function returns the protocol token balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token balance of the holder
   */
  function getTokenBalance(address _tokenHolder, address t) public view override returns (uint256 tokenBalance) {
    if (t == address(0) || _tokenHolder == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    tokenBalance = IERC20Upgradeable(t).balanceOf(_tokenHolder);
  }

  /**
   * @notice This function returns the underlying asset balance of the passed address
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   * @return tokenBalance t token's underlying asset balance of the holder
   */
  function getUnderlyingBalance(address _tokenHolder, address t) public view override returns (uint256[] memory) {
    if (t == address(0) || _tokenHolder == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    uint256[] memory tokenBalance = new uint256[](1);
    CometMainInterface token = CometMainInterface(t);
    tokenBalance[0] = token.balanceOf(_tokenHolder);
    return tokenBalance;
  }

  /**
   * @notice This function returns the USD value of the asset
   * @param _tokenHolder Address whose balance is to be retrieved
   * @param t Address of the protocol token
   */
  function getTokenBalanceUSD(address _tokenHolder, address t) public view override returns (uint256) {
    if (t == address(0) || _tokenHolder == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    uint[] memory underlyingBalance = getUnderlyingBalance(_tokenHolder, t);
    address[] memory underlyingToken = getUnderlying(t);

    uint balanceUSD = _oracle.getPriceTokenUSD18Decimals(underlyingToken[0], underlyingBalance[0]);
    return balanceUSD;
  }

  function getFairLpPrice(address _tokenHolder, address t) public view returns (uint) {}

  function encodeData(address t, uint256 _amount) public returns (bytes memory) {}

  function getRouterAddress() public view returns (address) {}

  /**
   * @notice This function returns encoded data, for withdrawal
   * @param _compToken address of token
   * @param _holder address of holder
   * @return bytes endoded data for claim
   */
  function getClaimTokenCalldata(address _compToken, address _holder) public view returns (bytes memory, address) {
    return (abi.encodeWithSelector(CometMainInterface.claim.selector, _compToken, _holder, true), _cometReward);
  }

  receive() external payable {}
}
