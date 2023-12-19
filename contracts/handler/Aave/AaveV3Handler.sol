// SPDX-License-Identifier: MIT

// Aave Official Docs: https://docs.aave.com/hub/
// Aave GitHub: https://github.com/aave

/**
 * @title Handler for the Aave v3 protocol
 * @author Velvet.Capital
 * @notice This contract is used to deposit and redeem assets
 *      to/from the Aave protocol.
 * @dev This contract includes functionalities:
 *      1. Deposit tokens to the Aave protocol
 *      2. Redeem tokens from the Aave protocol
 *      3. Get underlying asset address
 *      4. Get protocol token balance
 *      5. Get underlying asset balance
 */

pragma solidity 0.8.16;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";
import {IPriceOracle} from "../../oracle/IPriceOracle.sol";
import {IaToken} from "./Interfaces/IaToken.sol";
import {Ipool} from "./Interfaces/Ipool.sol";
import {WrappedTokenGateway} from "./Interfaces/WrappedTokenGateway.sol";

import {IHandler} from "../IHandler.sol";
import {ErrorLibrary} from "./../../library/ErrorLibrary.sol";
import {FunctionParameters} from "contracts/FunctionParameters.sol";
import {IReward} from "./Interfaces/IReward.sol";

contract AaveV3Handler is IHandler {
  address public AAVE_POOL_V3;
  address public WRAPPED_TOKEN_GATEWAY;
  address public REWARD_CONTRACT;

  IPriceOracle internal _oracle;

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
   * @param aave_pool address of aave protocol handler used for deposit and withdraw non-ETH
   * @param token_gateway address of aave protocol handler used for deposit and withdraw ETH
   * @param _rewardContract address of incentive contract of aave
   */
  constructor(address _priceOracle, address aave_pool, address token_gateway, address _rewardContract) {
    if (_priceOracle == address(0) || aave_pool == address(0) || token_gateway == address(0) || _rewardContract == address(0))
      revert ErrorLibrary.InvalidAddress();
    _oracle = IPriceOracle(_priceOracle);
    AAVE_POOL_V3 = aave_pool;
    WRAPPED_TOKEN_GATEWAY = token_gateway;
    REWARD_CONTRACT = _rewardContract;
  }

  /**
   * @notice This function deposits assets to the Aave protocol
   * @param IaAsset Address of the protocol asset to be deposited
   * @param _amount Amount that is to be deposited
   * @param _lpSlippage LP slippage value passed to the function
   * @param _to Address that would receive the vTokens in return
   */
  function deposit(
    address IaAsset,
    uint256[] calldata _amount,
    uint256 _lpSlippage,
    address _to,
    address user
  ) public payable override returns (uint256 _mintedAmount) {
    if (IaAsset == address(0) || _to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(IaAsset)[0]);

    if (msg.value == 0) {
      TransferHelper.safeApprove(address(underlyingToken), AAVE_POOL_V3, 0);
      TransferHelper.safeApprove(address(underlyingToken), AAVE_POOL_V3, _amount[0]);
      Ipool(AAVE_POOL_V3).supply(address(underlyingToken), _amount[0], _to, 0);
    } else {
      if (msg.value != _amount[0]) {
        revert ErrorLibrary.MintAmountNotEqualToPassedValue();
      }
      WrappedTokenGateway(WRAPPED_TOKEN_GATEWAY).depositETH{value: _amount[0]}(AAVE_POOL_V3, _to, 0);
    }

    _mintedAmount = _oracle.getPriceTokenUSD18Decimals(address(underlyingToken), _amount[0]);
    emit Deposit(block.timestamp, _to, IaAsset, _amount, _to);
  }

  /**
   * @notice This function redeems assets from the Aave protocol
   */
  function redeem(FunctionParameters.RedeemData calldata inputData) public override {
    if (inputData._yieldAsset == address(0) || inputData._to == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    IaToken token = IaToken(inputData._yieldAsset);
    IERC20Upgradeable underlyingToken = IERC20Upgradeable(getUnderlying(inputData._yieldAsset)[0]);
    if (inputData._amount > token.balanceOf(address(this))) {
      revert ErrorLibrary.InsufficientBalance();
    }
    if (!inputData.isWETH) {
      Ipool(AAVE_POOL_V3).withdraw(address(underlyingToken), inputData._amount, inputData._to);
    } else {
      TransferHelper.safeApprove(inputData._yieldAsset, WRAPPED_TOKEN_GATEWAY, 0);
      TransferHelper.safeApprove(inputData._yieldAsset, WRAPPED_TOKEN_GATEWAY, inputData._amount);
      WrappedTokenGateway(WRAPPED_TOKEN_GATEWAY).withdrawETH(AAVE_POOL_V3, inputData._amount, inputData._to);
    }

    emit Redeem(block.timestamp, msg.sender, inputData._yieldAsset, inputData._amount, inputData._to, inputData.isWETH);
  }

  /**
   * @notice This function returns address of the underlying asset
   * @param IaAsset Address of the protocol token whose underlying asset is needed
   * @return underlying Address of the underlying asset
   */
  function getUnderlying(address IaAsset) public view override returns (address[] memory) {
    if (IaAsset == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    address[] memory underlying = new address[](1);

    IaToken _IaToken = IaToken(IaAsset);
    underlying[0] = _IaToken.UNDERLYING_ASSET_ADDRESS();
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
    IaToken token = IaToken(t);
    tokenBalance = token.balanceOf(_tokenHolder);
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
    IERC20Upgradeable aToken = IERC20Upgradeable(t);
    uint256[] memory tokenBalance = new uint256[](1);
    tokenBalance[0] = aToken.balanceOf(_tokenHolder);
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
   * @param _aaveToken address of token
   * @param _holder address of holder
   * @return bytes endoded data for claim
   */
  function getClaimTokenCalldata(address _aaveToken, address _holder) public view returns (bytes memory, address) {
    address[] memory tokenArray = new address[](1);
    tokenArray[0] = _aaveToken;
    return (abi.encodeWithSelector(IReward.claimAllRewards.selector, tokenArray, _holder), REWARD_CONTRACT);
  }

  receive() external payable {}
}
