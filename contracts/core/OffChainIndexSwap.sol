// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

import {IIndexSwap} from "../core/IIndexSwap.sol";
import {IndexSwapLibrary} from "../core/IndexSwapLibrary.sol";
import {IHandler} from "../handler/IHandler.sol";

import {IWETH} from "../interfaces/IWETH.sol";

import {IExternalSwapHandler} from "../handler/IExternalSwapHandler.sol";
import {IAccessController} from "../access/IAccessController.sol";

import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import {IFeeModule} from "../fee/IFeeModule.sol";

import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import "./IndexSwapLibrary.sol";

import {ExchangeData} from "../handler/ExternalSwapHandler/Helper/ExchangeData.sol";
import {IIndexSwap} from "./IIndexSwap.sol";

contract OffChainIndexSwap is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
  using SafeMathUpgradeable for uint256;
  address internal WETH;

  // Total denormalized weight of the pool.
  uint256 public constant TOTAL_WEIGHT = 10_000;

  ITokenRegistry public tokenRegistry;
  IExchange public exchange;
  IFeeModule public feeModule;
  IAssetManagerConfig public iAssetManagerConfig;
  IPriceOracle public oracle;
  IIndexSwap public index;
  struct UserData {
    bool userRedeemedStatus;
    address withdrawToken;
    uint256 tokenAmount;
    bytes userRedeemedTokens;
  }
  mapping(address => UserData) public userWithdrawData;
  //using this mapping to user, users swapData in byte format
  mapping(address => mapping(address => uint256[])) public tokenAmounts;
  mapping(address => mapping(address => uint256)) public userUnderlyingAmounts;
  event InvestInFundOffChain(
    uint256 investedAmount,
    uint256 tokenAmount,
    uint256 indexed rate,
    address indexed index,
    uint256 time,
    address indexed user
  );
  event WithdrawFund(address indexed user, uint256 tokenAmount, address indexed index, uint256 timestamp);
  event MultipleTokenWithdrawalTriggered(address indexed user, address[] tokens);
  event UserTokenRedeemed(
    address indexed user,
    uint256 tokenAmount,
    uint256 indexed rate,
    address indexed index,
    uint256 timestamp
  );

  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Initializes the contract by setting up the required dependencies and variables.
   * @param _indexSwap The address of the IndexSwap contract.
   * It initializes the following variables:
   * - index: An instance of the IIndexSwap contract.
   * - exchange: An instance of the IExchange contract fetched from the IndexSwap contract.
   * - feeModule: An instance of the IFeeModule contract fetched from the IndexSwap contract.
   * - oracle: An instance of the IPriceOracle contract fetched from the IndexSwap contract.
   * - iAssetManagerConfig: An instance of the IAssetManagerConfig contract fetched from the IndexSwap contract.
   * - tokenRegistry: An instance of the ITokenRegistry contract fetched from the IndexSwap contract.
   * - paused: A boolean indicating the paused state of the contract (initially set to false).
   * - WETH: The address of the WETH (Wrapped Ether) token fetched from the TokenRegistry contract.
   */
  function init(address _indexSwap) external initializer {
    __Ownable_init();
    __UUPSUpgradeable_init();
    index = IIndexSwap(_indexSwap);
    exchange = IExchange(index.exchange());
    feeModule = IFeeModule(index.feeModule());
    oracle = IPriceOracle(index.oracle());
    iAssetManagerConfig = IAssetManagerConfig(index.iAssetManagerConfig());
    tokenRegistry = ITokenRegistry(index.tokenRegistry());
    WETH = tokenRegistry.getETH();
  }

  modifier notPaused() {
    if (index.paused()) {
      revert ErrorLibrary.ContractPaused();
    }
    _;
  }

  modifier onlyRebalancerContract() {
    if (!(IAccessController(index.accessController()).hasRole(keccak256("REBALANCER_CONTRACT"), msg.sender))) {
      revert ErrorLibrary.CallerNotRebalancerContract();
    }
    _;
  }

  /**
   * @notice Invests a specified amount of tokens in the fund off-chain.
   * @param _initData The ZeroExData struct containing the initialization data for the investment.
   *                 - _buyToken: An array of tokens to buy during the investment.
   *                 - _tokens: An array of tokens involved in the investment.
   *                 - _offChainHandler: The address of the off-chain handler for the investment.
   *                 - _buyAmount: An array of buy amounts for each token during the investment.
   *                 - _protocolFee: An array of protocol fees for each token during the investment.
   *                 - _buySwapData: An array of buy swap data for each token during the investment.
   * @param _tokenAmount The amount of tokens to invest.
   * @param _lpSlippage An array of slippage values for each liquidity provider.
   * @param _to The address to which the investment tokens will be minted.
   * @return balanceInUSD The balance in USD of the investment after slippage.
   */
  function investInFundOffChain(
    ExchangeData.ZeroExData memory _initData,
    uint256 _tokenAmount,
    uint256[] calldata _lpSlippage,
    address _to
  ) external payable virtual nonReentrant notPaused returns (uint256 balanceInUSD) {
    // Perform necessary checks before investment
    IndexSwapLibrary.beforeCheck(index, _lpSlippage, _to);
    uint256 balanceBefore = address(this).balance;
    // Get the index operations contract

    // Check if the investment is made with ETH
    if (msg.value > 0 && WETH == _initData.sellTokenAddress) {
      _tokenAmount = msg.value;
      IndexSwapLibrary._checkInvestmentValue(_tokenAmount, iAssetManagerConfig);

      // Deposit ETH into WETH
      IWETH(WETH).deposit{value: msg.value}();

      // Transfer the WETH to index operations contract
      IWETH(WETH).transfer(address(exchange), _tokenAmount);
    } else {
      // Check permission and balance for the sell token
      IndexSwapLibrary._checkPermissionAndBalance(
        _initData.sellTokenAddress,
        _tokenAmount,
        iAssetManagerConfig,
        msg.sender
      );

      // Get the token balance in BNB
      uint256 tokenBalanceInBNB = _getTokenBalanceInBNB(_initData.sellTokenAddress, _tokenAmount);
      IndexSwapLibrary._checkInvestmentValue(tokenBalanceInBNB, iAssetManagerConfig);

      // Transfer the sell token from the sender to index operations contract
      TransferHelper.safeTransferFrom(_initData.sellTokenAddress, msg.sender, address(exchange), _tokenAmount);
    }

    // Charge fees and update vault balance
    uint256 vaultBalance = IndexSwapLibrary.chargeFees(index, feeModule);

    // Perform off-chain investment
    balanceInUSD = _offChainInvestment(_initData, _tokenAmount, _lpSlippage);

    // Calculate the invested amount in BNB after slippage
    uint256 investedAmountAfterSlippageBNB = oracle.getUsdEthPrice(balanceInUSD);

    // Ensure the final invested amount is not zero
    require(investedAmountAfterSlippageBNB > 0, "final invested amount is zero");

    // Calculate the vault balance in BNB
    uint256 vaultBalanceBNB = oracle.getUsdEthPrice(vaultBalance);

    // Calculate the token amount to be minted
    uint256 tokenAmount;
    uint256 _totalSupply = index.totalSupply();
    if (_totalSupply > 0) {
      tokenAmount = IndexSwapLibrary._mintShareAmount(investedAmountAfterSlippageBNB, vaultBalanceBNB, _totalSupply);
    } else {
      tokenAmount = investedAmountAfterSlippageBNB;
    }

    // Ensure the token amount is not zero
    require(tokenAmount > 0, "token amount is 0");

    // Mint investment tokens to the specified address
    index.mintInvest(_to, tokenAmount);

    // Set the last investment period for the address
    index.setLastInvestmentPeriod(_to);

    // Refund any leftover ETH to the user
    uint256 balanceAfter = address(this).balance;
    if (balanceAfter > 0) {
      (bool success, ) = payable(_to).call{value: balanceAfter.sub(balanceBefore)}("");
      if (!success) {
        revert ErrorLibrary.ETHTransferFailed();
      }
    }

    // Emit an event for the off-chain investment
    emit InvestInFundOffChain(
      _tokenAmount,
      tokenAmount,
      IndexSwapLibrary.getIndexTokenRate(index),
      address(index),
      block.timestamp,
      _to
    );
  }

  /**
   * @notice Performs off-chain investment using the ZeroEx protocol
   * @param inputData The ZeroExData struct containing the off-chain investment details:
   *   - _buyToken: The array of tokens to be bought during the off-chain investment
   *   - _tokens: The array of tokens involved in the off-chain investment
   *   - _offChainHandler: The address of the off-chain handler contract
   *   - _buyAmount: The array of buy amounts for each token during the off-chain investment
   *   - _protocolFee: The array of protocol fees for each token during the off-chain investment
   *   - _buySwapData: The array of buy swap data for each token during the off-chain investment
   * @param _lpSlippage The array of slippage percentages for each token during the off-chain investment
   * @return balanceInUSD The resulting balance in USD after the off-chain investment
   */
  function _offChainInvestment(
    ExchangeData.ZeroExData memory inputData,
    uint256 _tokenAmount,
    uint256[] calldata _lpSlippage
  ) internal virtual returns (uint256 balanceInUSD) {
    uint256 underlyingIndex = 0;
    balanceInUSD = 0;
    address[] memory _tokens = index.getTokens();
    uint256[] memory _buyAmount = calculateSwapAmountsOffChain(index, _tokenAmount);
    for (uint256 i = 0; i < _tokens.length; i++) {
      // Get the handler contract for the current token
      // Perform off-chain token swap using the exchange contract
      (balanceInUSD, underlyingIndex) = exchange.swapOffChainTokens(
        ExchangeData.IndexOperationData(
          ExchangeData.InputData(
            inputData.buyAmount,
            inputData.sellTokenAddress,
            inputData._offChainHandler,
            inputData._buySwapData
          ),
          index,
          underlyingIndex,
          inputData.protocolFee[i],
          balanceInUSD,
          _lpSlippage[i],
          _buyAmount[i],
          _tokens[i],
          msg.sender
        )
      );
    }
  }

  /**
   * @notice The function is used withdrawaing - pulling from vault and redeeming the tokens of user for withdrawal
   */
  function redeemTokens(ExchangeData.RedeemData memory inputdata) external virtual nonReentrant notPaused {
    address user = msg.sender;

    (uint256 totalSupplyIndex, uint256 _fee) = _beforeCheckAndChargeFees(
      inputdata.tokenAmount,
      inputdata.token,
      user,
      userWithdrawData[user].userRedeemedStatus
    );
    address[] memory _tokens = index.getTokens();
    uint256 _tokenAmount = inputdata.tokenAmount.sub(_fee);
    for (uint256 i = 0; i < _tokens.length; i++) {
      delete tokenAmounts[user][_tokens[i]];
      uint256 amount = _getTokenAmount(_tokenAmount, totalSupplyIndex, _tokens[i]);
      if (_tokens[i] == inputdata.token && inputdata.token == WETH) {
        _pullAndWithdraw(inputdata.token, amount);
      } else if (_tokens[i] == inputdata.token) {
        IndexSwapLibrary.pullFromVault(exchange, inputdata.token, amount, user);
      } else {
        IHandler handler = IHandler(tokenRegistry.getTokenInformation(_tokens[i]).handler);
        address[] memory underlying = handler.getUnderlying(_tokens[i]);
        uint256[] memory balanceBefore = IndexSwapLibrary.checkUnderlyingBalances(_tokens[i], handler, address(this));
        IndexSwapLibrary._pullAndRedeem(
          exchange,
          _tokens[i],
          address(this),
          amount,
          inputdata._lpSlippage[i],
          tokenRegistry.getTokenInformation(_tokens[i]).primary,
          handler
        );
        user = msg.sender;
        for (uint256 j = 0; j < underlying.length; j++) {
          address _underlying = underlying[j];
          if (_underlying == WETH) {
            IWETH(_underlying).deposit{value: address(this).balance}();
          }
          uint256 _balanceBefore = balanceBefore[j];
          uint256 _balanceAfter = IERC20Upgradeable(_underlying).balanceOf(address(this));
          tokenAmounts[user][_tokens[i]].push(_balanceAfter.sub(_balanceBefore));
          userUnderlyingAmounts[msg.sender][_underlying] = userUnderlyingAmounts[msg.sender][_underlying]
            .add(_balanceAfter)
            .sub(_balanceBefore);
        }
      }
    }
    userWithdrawData[user].withdrawToken = inputdata.token;
    userWithdrawData[user].userRedeemedStatus = true;
    userWithdrawData[user].tokenAmount = _tokenAmount;
    userWithdrawData[user].userRedeemedTokens = abi.encode(_tokens);

    emit UserTokenRedeemed(
      user,
      inputdata.tokenAmount,
      IndexSwapLibrary.getIndexTokenRate(index),
      address(index),
      block.timestamp
    );
  }

  /**
   * @notice Performs an off-chain withdrawal of tokens for a user.[he function is used swaping the redeemed token to desired token and giving to user]
   * @dev This function allows a user to withdraw their tokens off-chain.
   * @dev The tokens are transferred to the user's address.
   * @param inputData The data required for the off-chain withdrawal.
   *   - sellAmount: The amounts of tokens to sell.
   *   - protocolFee: The protocol fees for each token.
   *   - sellTokenAddress: The addresses of the tokens to sell.
   *   - offChainHandler: The address of the off-chain handler.
   *   - buySwapData: The swap data for buying tokens.
   */
  /**
   * @notice Performs an off-chain withdrawal of tokens for a user.
   * @dev This function allows a user to withdraw their tokens off-chain.
   * @dev The tokens are transferred to the user's address.
   * @param inputData The data required for the off-chain withdrawal.
   */
  function withdrawOffChain(ExchangeData.ZeroExWithdraw memory inputData) external virtual nonReentrant notPaused {
    address user = msg.sender;
    address withdrawToken = userWithdrawData[user].withdrawToken;

    // Perform necessary checks before the off-chain withdrawal
    IndexSwapLibrary.beforeWithdrawOffChain(
      userWithdrawData[user].userRedeemedStatus,
      tokenRegistry,
      inputData.offChainHandler
    );

    uint256 balanceBefore = IERC20Upgradeable(withdrawToken).balanceOf(address(this));
    uint256 balanceAfter = 0;

    // Iterate through the sell tokens and perform the withdrawal
    for (uint256 i = 0; i < inputData.sellTokenAddress.length; i++) {
      if (inputData.sellTokenAddress[i] != withdrawToken) {
        // Perform the withdrawal for non-withdrawal tokens
        _withdraw(
          ExchangeData.withdrawData(
            inputData.sellAmount[i],
            inputData.protocolFee[i],
            userUnderlyingAmounts[user][inputData.sellTokenAddress[i]],
            inputData.sellTokenAddress[i],
            inputData.offChainHandler,
            withdrawToken,
            inputData.buySwapData[i]
          )
        );
      } else {
        // Update the balance for the withdrawal token
        balanceAfter = userUnderlyingAmounts[user][inputData.sellTokenAddress[i]];
      }

      // Delete the recorded amounts for the sell tokens
      delete userUnderlyingAmounts[user][inputData.sellTokenAddress[i]];
    }

    // Calculate the updated balance of the withdrawal token
    balanceAfter = balanceAfter.add(IERC20Upgradeable(withdrawToken).balanceOf(address(this)));

    // Transfer the withdrawal token to the user
    _transferTokenToUser(withdrawToken, balanceAfter.sub(balanceBefore));

    // Emit an event to indicate the successful withdrawal
    emit WithdrawFund(user, userWithdrawData[user].tokenAmount, address(index), block.timestamp);
    // Delete the user's data to complete the withdrawal process
    delete userWithdrawData[msg.sender];
  }

  /**
   * @notice This Function is internal fucntion of withdraw,used to swap tokens
   * @param inputData sellTokenAddress, address of offchainHandler, address of buyToken, calldata, sellAmount,protocolFee, and users tokenamount
   */
  function _withdraw(ExchangeData.withdrawData memory inputData) internal {
    if (inputData.sellAmount != inputData.userAmount) {
      revert ErrorLibrary.InvalidSellAmount();
    }
    IndexSwapLibrary._transferAndSwapUsingOffChainHandler(
      inputData.sellTokenAddress,
      inputData.buyToken,
      inputData.sellAmount,
      address(this),
      inputData.swapData,
      inputData.offChainHandler,
      inputData.protocolFee
    );
  }

  /**
   * @notice This function pulls assets from the vault and calls _withdrawAndTransfer to unwrap WETH and send ETH to the user
   */
  function _pullAndWithdraw(address _token, uint256 _amount) internal {
    uint256 balanceBefore = IERC20Upgradeable(_token).balanceOf(address(this));
    IndexSwapLibrary.pullFromVault(exchange, _token, _amount, address(this));
    uint256 balanceAfter = IERC20Upgradeable(_token).balanceOf(address(this));
    _withdrawAndTransfer(balanceAfter.sub(balanceBefore));
  }

  /**
   * @notice This function unwraps WETH and sends ETH to the user
   */
  function _withdrawAndTransfer(uint256 _amount) internal virtual {
    IWETH(WETH).withdraw(_amount);
    (bool success, ) = payable(msg.sender).call{value: _amount}("");
    if (!success) {
      revert ErrorLibrary.WithdrawTransferFailed();
    }
  }

  /**
   * @notice This function calls the calculateSwapAmountsOffChain() function from the IndexSwapLibrary and stores the output for each user in byte format,to use it later to verify user input
   */
  function calculateSwapAmountsOffChain(
    IIndexSwap _index,
    uint256 _tokenAmount
  ) public virtual returns (uint256[] memory swapAmount) {
    swapAmount = IndexSwapLibrary.calculateSwapAmountsOffChain(_index, _tokenAmount);
  }

  function _transferTokenToUser(address buyToken, uint256 amount) internal {
    if (buyToken == WETH) {
      _withdrawAndTransfer(amount);
    } else {
      TransferHelper.safeTransfer(buyToken, msg.sender, amount);
    }
  }

  /**
   * @notice This function gets the token amount for the user
   */
  function getTokenAmounts(address _user, address _token) external view virtual returns (uint256[] memory) {
    return tokenAmounts[_user][_token];
  }

  /**
   * @notice This function converts the token balance in BNB if investment token is not BNB
   */
  function _getTokenBalanceInBNB(
    address _token,
    uint256 _tokenAmount
  ) internal view returns (uint256 tokenBalanceInBNB) {
    oracle.getPriceTokenUSD18Decimals(_token, _tokenAmount);
    uint256 tokenBalanceInUSD = oracle.getPriceTokenUSD18Decimals(_token, _tokenAmount);
    tokenBalanceInBNB = oracle.getUsdEthPrice(tokenBalanceInUSD);
  }

  /**
   * @notice This function calculates the token amount during redeem of token
   */
  function _getTokenAmount(uint256 userAmount, uint256 supply, address token) internal view returns (uint256 amount) {
    uint256 tokenBalance = IndexSwapLibrary.getTokenBalance(index, token);
    amount = tokenBalance.mul(userAmount).div(supply);
  }

  /**
   * @notice This function makes the inital checks before redeem of tokens
   */
  function _beforeCheckAndChargeFees(
    uint256 _tokenAmount,
    address _token,
    address user,
    bool _status
  ) internal returns (uint256, uint256) {
    IndexSwapLibrary.beforeRedeemCheck(index, _tokenAmount, _token, _status);
    IndexSwapLibrary.checkCoolDownPeriod(index.lastInvestmentTime(user), tokenRegistry);
    address assetManagerTreasury = iAssetManagerConfig.assetManagerTreasury();
    address velvetTreasury = tokenRegistry.velvetTreasury();
    if (!(msg.sender == assetManagerTreasury || msg.sender == velvetTreasury)) {
      IndexSwapLibrary.chargeFees(index, feeModule);
    }
    return (index.totalSupply(), index.burnWithdraw(msg.sender, _tokenAmount));
  }

  /**
   * @notice Triggers the withdrawal of multiple tokens for a user [This function can withdraw tokens of user directly to them, after they redeemed(redeemTokens function), in case withdrawOffChain fucntion doesn't work
   * @dev This function allows a user to withdraw their underlying tokens for all redeemed tokens except the withdrawal token.
   * @dev The user must have already redeemed their tokens.
   * @dev Emits a MultipleTokenWithdrawalTriggered event upon successful withdrawal.
   * @dev Removes the user's redeemed status and withdrawal token from storage.
   */
  function triggerMultipleTokenWithdrawal() external {
    // Check if the user has redeemed their tokens
    if (userWithdrawData[msg.sender].userRedeemedStatus != true) {
      revert ErrorLibrary.TokensNotRedeemed();
    }

    // Decode the redeemed tokens from the user's data
    address[] memory _tokens = abi.decode(userWithdrawData[msg.sender].userRedeemedTokens, (address[]));

    // Iterate through the redeemed tokens
    for (uint256 i = 0; i < _tokens.length; i++) {
      // Skip the withdrawal token
      address token = _tokens[i];
      if (token != userWithdrawData[msg.sender].withdrawToken) {
        // Get the handler and underlying tokens for the current token
        IHandler handler = IHandler(tokenRegistry.getTokenInformation(token).handler);
        address[] memory underlying = handler.getUnderlying(token);
        uint256 underlyingLength = underlying.length;

        // Transfer the underlying tokens to the user and delete the recorded amounts
        for (uint256 j = 0; j < underlyingLength; j++) {
          uint256 amount = tokenAmounts[msg.sender][token][j];
          address _underlying = underlying[j];
          TransferHelper.safeTransfer(_underlying, msg.sender, amount);
          delete userUnderlyingAmounts[msg.sender][_underlying];
        }
      }
    }

    // Emit an event to indicate the successful withdrawal
    emit MultipleTokenWithdrawalTriggered(msg.sender, _tokens);

    // Delete the user's data to complete the withdrawal process
    delete userWithdrawData[msg.sender];
  }

  // important to receive ETH
  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
