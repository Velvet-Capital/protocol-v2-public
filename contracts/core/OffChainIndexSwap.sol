// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/IERC20Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";

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

contract OffChainIndexSwap is Initializable, OwnableUpgradeable, UUPSUpgradeable {
  address internal WETH;

  // Total denormalized weight of the pool.
  uint256 internal constant TOTAL_WEIGHT = 10_000;

  ITokenRegistry internal tokenRegistry;
  IExchange internal exchange;
  IFeeModule internal feeModule;
  IAssetManagerConfig internal iAssetManagerConfig;
  IPriceOracle internal oracle;
  IIndexSwap internal index;
  struct UserData {
    bool userRedeemedStatus;
    address withdrawToken;
    uint256 tokenAmount;
    bytes userRedeemedTokens;
    uint256 sellTokenLength;
  }
  mapping(address => UserData) public userWithdrawData;
  //using this mapping to user, users swapData in byte format
  mapping(address => mapping(address => uint256[])) public tokenAmounts;
  mapping(address => mapping(address => uint256)) public userUnderlyingAmounts;
  event InvestInFundOffChain(
    uint256 investedAmount,
    uint256 tokenAmount,
    uint256 indexed rate,
    uint currentUserBalance,
    address indexed index,
    address indexed user
  );
  event WithdrawFund(address indexed user, uint256 tokenAmount, address indexed index);
  event MultipleTokenWithdrawalTriggered(address indexed user, address[] tokens);
  event UserTokenRedeemed(
    address indexed user,
    uint256 tokenAmount,
    uint256 indexed rate,
    uint currentUserBalance,
    address indexed index
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

  modifier nonReentrant() {
    index.nonReentrantBefore();
    _;
    index.nonReentrantAfter();
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
   *                 - _buySwapData: An array of buy swap data for each token during the investment.
   * @param _tokenAmount The amount of tokens to invest.
   * @param _lpSlippage An array of slippage values for each liquidity provider.
   * @return investedAmountAfterSlippage The balance in USD of the investment after slippage.
   */
  function investInFundOffChain(
    ExchangeData.ZeroExData memory _initData,
    uint256 _tokenAmount,
    uint256[] calldata _lpSlippage
  ) external payable virtual nonReentrant notPaused returns (uint256 investedAmountAfterSlippage) {
    // Perform necessary checks before investment
    address user = msg.sender;
    uint256 _amount;
    address _token = _initData.sellTokenAddress;
    _validateInvestment(_lpSlippage, user, _initData._offChainHandler, _token);
    uint256 balanceBefore = IndexSwapLibrary.checkBalance(_token, address(exchange), WETH);
    // Check if the investment is made with ETH
    if (msg.value > 0) {
      if (WETH != _token) {
        revert ErrorLibrary.InvalidToken();
      }
      _amount = msg.value;

      // Deposit ETH into WETH
      IWETH(WETH).deposit{value: _amount}();

      // Transfer the WETH to index operations contract
      IWETH(WETH).transfer(address(exchange), _amount);
    } else {
      _amount = _tokenAmount;
      // Check permission and balance for the sell token
      IndexSwapLibrary._checkPermissionAndBalance(_token, _amount, iAssetManagerConfig, user);

      // Transfer the sell token from the sender to index operations contract
      TransferHelper.safeTransferFrom(_token, user, address(exchange), _amount);
    }
    uint256 _investmentAmountInUSD = oracle.getPriceTokenUSD18Decimals(_token, _amount);
    _checkInvestmentValue(_investmentAmountInUSD);

    // Charge fees and update vault balance
    uint256 vaultBalance = chargeFees();

    // Perform off-chain investment
    investedAmountAfterSlippage = exchange._swapTokenToTokensOffChain(
      ExchangeData.InputData(_initData.buyAmount, _token, _initData._offChainHandler, _initData._buySwapData),
      index,
      _lpSlippage,
      getTokens(),
      calculateSwapAmountsOffChain(index, _amount),
      balanceBefore,
      user
    );

    // Ensure the final invested amount is not zero
    if (investedAmountAfterSlippage == 0) revert ErrorLibrary.ZeroInvestedAmountAfterSlippage();

    // Calculate the token amount to be minted
    uint256 tokenAmount;
    uint256 _totalSupply = totalSupply();
    if (_totalSupply > 0) {
      tokenAmount = (investedAmountAfterSlippage * _totalSupply) / vaultBalance;
    } else {
      tokenAmount = investedAmountAfterSlippage;
    }

    // Ensure the token amount is not zero
    if (tokenAmount == 0) revert ErrorLibrary.ZeroTokenAmount();

    // Mint investment tokens to the specified address And Set CoolDown Period
    uint256 _mintedAmount = index.mintTokenAndSetCooldown(user, tokenAmount);

    // Emit an event for the off-chain investment
    emit InvestInFundOffChain(
      _amount,
      _mintedAmount,
      getIndexTokenRate(),
      IIndexSwap(index).balanceOf(msg.sender),
      address(index),
      msg.sender
    );
  }

  /**
   * @notice The function is used withdrawaing - pulling from vault and redeeming the tokens of user for withdrawal
   */
  function redeemTokens(ExchangeData.RedeemData memory inputdata) external virtual nonReentrant notPaused {
    // address user = msg.sender;
    (uint256 totalSupplyIndex, uint256 _fee) = _beforeCheckAndChargeFees(
      inputdata.tokenAmount,
      inputdata.token,
      msg.sender,
      userWithdrawData[msg.sender].userRedeemedStatus
    );
    address[] memory _tokens = getTokens();
    uint256 _tokenAmount = inputdata.tokenAmount - _fee;
    uint256 sellTokenLength;
    for (uint256 i = 0; i < _tokens.length; i++) {
      delete tokenAmounts[msg.sender][_tokens[i]];
      uint256 amount = _getTokenAmount(_tokenAmount, totalSupplyIndex, _tokens[i]);
      if (_tokens[i] == inputdata.token && inputdata.token == WETH) {
        _pullAndWithdraw(inputdata.token, amount);
      } else if (_tokens[i] == inputdata.token) {
        IndexSwapLibrary.pullFromVault(exchange, inputdata.token, amount, msg.sender);
      } else {
        IHandler handler = IHandler(getTokenInfo(_tokens[i]).handler);
        address[] memory underlying = getUnderlying(handler, _tokens[i]);
        uint256[] memory balanceBefore = IndexSwapLibrary.getUnderlyingBalances(_tokens[i], handler, address(this));
        IndexSwapLibrary._pullAndRedeem(
          exchange,
          _tokens[i],
          address(this),
          amount,
          inputdata._lpSlippage[i],
          getTokenInfo(_tokens[i]).primary,
          handler
        );
        for (uint256 j = 0; j < underlying.length; j++) {
          address _underlying = underlying[j];
          if (_underlying == WETH) {
            IWETH(_underlying).deposit{value: address(this).balance}();
          }
          uint256 _balanceAfter = getBalance(_underlying, address(this));
          uint256 _underlyingDifference = _balanceAfter - balanceBefore[j];
          if (_underlyingDifference <= 0) {
            revert ErrorLibrary.ZeroTokenAmount();
          }
          tokenAmounts[msg.sender][_tokens[i]].push(_underlyingDifference);
          uint256 userAmount = userUnderlyingAmounts[msg.sender][_underlying];
          sellTokenLength = userAmount > 0 ? sellTokenLength : sellTokenLength + 1;
          userUnderlyingAmounts[msg.sender][_underlying] = userAmount + _underlyingDifference;
        }
      }
    }
    userWithdrawData[msg.sender].withdrawToken = inputdata.token;
    userWithdrawData[msg.sender].userRedeemedStatus = true;
    userWithdrawData[msg.sender].tokenAmount = _tokenAmount;
    userWithdrawData[msg.sender].userRedeemedTokens = abi.encode(_tokens);
    userWithdrawData[msg.sender].sellTokenLength = sellTokenLength;

    emit UserTokenRedeemed(
      msg.sender,
      inputdata.tokenAmount,
      getIndexTokenRate(),
      index.balanceOf(msg.sender),
      address(index)
    );
  }

  /**
   * @notice Performs an off-chain withdrawal of tokens for a user.[he function is used swaping the redeemed token to desired token and giving to user]
   * @dev This function allows a user to withdraw their tokens off-chain.
   * @dev The tokens are transferred to the user's address.
   * @param inputData The data required for the off-chain withdrawal.
   *   - sellAmount: The amounts of tokens to sell.
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
  function withdrawOffChain(ExchangeData.ZeroExWithdraw memory inputData) external virtual nonReentrant {
    address user = msg.sender;
    address withdrawToken = userWithdrawData[user].withdrawToken;

    // Perform necessary checks before the off-chain withdrawal
    IndexSwapLibrary.beforeWithdrawOffChain(
      userWithdrawData[user].userRedeemedStatus,
      tokenRegistry,
      inputData.offChainHandler
    );

    uint256 balanceBefore = getBalance(withdrawToken, address(this));
    uint256 balanceAfter;
    uint256 tokenLength = inputData.sellTokenAddress.length;
    if (
      userWithdrawData[user].sellTokenLength != tokenLength ||
      tokenLength != inputData.sellAmount.length ||
      tokenLength != inputData.buySwapData.length
    ) {
      revert ErrorLibrary.InvalidLength();
    }

    // Iterate through the sell tokens and perform the withdrawal
    for (uint256 i = 0; i < tokenLength; i++) {
      if (inputData.sellTokenAddress[i] != withdrawToken) {
        // Perform the withdrawal for non-withdrawal tokens
        _withdraw(
          ExchangeData.withdrawData(
            inputData.sellAmount[i],
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
    balanceAfter = balanceAfter + getBalance(withdrawToken, address(this));

    // Transfer the withdrawal token to the user
    _transferTokenToUser(withdrawToken, balanceAfter - balanceBefore);

    // Emit an event to indicate the successful withdrawal
    emit WithdrawFund(user, userWithdrawData[user].tokenAmount, address(index));
    // Delete the user's data to complete the withdrawal process
    delete userWithdrawData[user];
  }

  /**
   * @notice This Function is internal fucntion of withdraw, used to swap tokens
   * @param inputData sellTokenAddress, address of offchainHandler, address of buyToken, calldata, sellAmount, and users tokenamount
   */
  function _withdraw(ExchangeData.withdrawData memory inputData) internal {
    if (inputData.sellAmount != inputData.userAmount) {
      revert ErrorLibrary.InvalidSellAmount();
    }
    TransferHelper.safeTransfer(inputData.sellTokenAddress, inputData.offChainHandler, inputData.sellAmount);
    IExternalSwapHandler(inputData.offChainHandler).swap(
      inputData.sellTokenAddress,
      inputData.buyToken,
      inputData.sellAmount,
      inputData.swapData,
      address(this)
    );
  }

  /**
   * @notice This function pulls assets from the vault and calls _withdrawAndTransfer to unwrap WETH and send ETH to the user
   */
  function _pullAndWithdraw(address _token, uint256 _amount) internal {
    uint256 balanceBefore = getBalance(_token, address(this));
    IndexSwapLibrary.pullFromVault(exchange, _token, _amount, address(this));
    uint256 balanceAfter = getBalance(_token, address(this));
    _withdrawAndTransfer(balanceAfter - balanceBefore);
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
   * @notice This function calculates the token amount during redeem of token
   */
  function _getTokenAmount(uint256 userAmount, uint256 supply, address token) internal view returns (uint256 amount) {
    IHandler handler = IHandler(getTokenInfo(token).handler);
    uint256 tokenBalance = handler.getTokenBalance(index.vault(), token);
    amount = (tokenBalance * userAmount) / supply;
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
    index.checkCoolDownPeriod(user);
    address assetManagerTreasury = iAssetManagerConfig.assetManagerTreasury();
    address velvetTreasury = tokenRegistry.velvetTreasury();
    if (!(user == assetManagerTreasury || user == velvetTreasury)) {
      chargeFees();
    }
    uint256 _totalSupply = totalSupply();
    uint256 _exitFee = index.burnWithdraw(user, _tokenAmount);
    return (_totalSupply,_exitFee);
  }

  /**
   * @notice Triggers the withdrawal of multiple tokens for a user [This function can withdraw tokens of user directly to them, after they redeemed(redeemTokens function), in case withdrawOffChain fucntion doesn't work
   * @dev This function allows a user to withdraw their underlying tokens for all redeemed tokens except the withdrawal token.
   * @dev The user must have already redeemed their tokens.
   * @dev Emits a MultipleTokenWithdrawalTriggered event upon successful withdrawal.
   * @dev Removes the user's redeemed status and withdrawal token from storage.
   */
  function triggerMultipleTokenWithdrawal() external nonReentrant {
    // Check if the user has redeemed their tokens
    if (tokenRegistry.getProtocolState()) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (!userWithdrawData[msg.sender].userRedeemedStatus) {
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
        IHandler handler = IHandler(getTokenInfo(token).handler);
        address[] memory underlying = getUnderlying(handler, token);
        uint256 underlyingLength = underlying.length;

        // Transfer the underlying tokens to the user and delete the recorded amounts
        for (uint256 j = 0; j < underlyingLength; j++) {
          address _underlying = underlying[j];
          if (userUnderlyingAmounts[msg.sender][_underlying] > 0) {
            uint256 amount = userUnderlyingAmounts[msg.sender][_underlying];
            TransferHelper.safeTransfer(_underlying, msg.sender, amount);
            delete userUnderlyingAmounts[msg.sender][_underlying];
          }
        }
      }
    }

    // Emit an event to indicate the successful withdrawal
    emit MultipleTokenWithdrawalTriggered(msg.sender, _tokens);

    // Delete the user's data to complete the withdrawal process
    delete userWithdrawData[msg.sender];
  }

  /**
   * @notice This function is used to validate investment
   * @param _lpSlippage Array Of LP Slippage passed by the user
   * @param _to Address of user
   * @param _offchainHandler Address of offchain handler used for swapping tokens
   */
  function _validateInvestment(
    uint256[] calldata _lpSlippage,
    address _to,
    address _offchainHandler,
    address _token
  ) internal {
    if (tokenRegistry.getProtocolState()) {
      revert ErrorLibrary.ProtocolIsPaused();
    }
    if (!(iAssetManagerConfig.publicPortfolio() || iAssetManagerConfig.whitelistedUsers(_to))) {
      revert ErrorLibrary.UserNotAllowedToInvest();
    }
    if (_lpSlippage.length == 0) {
      revert ErrorLibrary.InvalidSlippageLength();
    }
    if (getTokens().length == 0) {
      revert ErrorLibrary.NotInitialized();
    }
    if (!tokenRegistry.isExternalSwapHandler(_offchainHandler)) {
      revert ErrorLibrary.OffHandlerNotEnabled();
    }
    if (_token == address(0)) {
      revert ErrorLibrary.InvalidToken();
    }
  }

  /**
   * @notice This internal function returns token information
   */
  function getTokenInfo(address _token) internal view returns (ITokenRegistry.TokenRecord memory) {
    return tokenRegistry.getTokenInformation(_token);
  }

  /**
   * @notice This function returns underlying tokens for given _token
   */
  function getUnderlying(IHandler handler, address _token) internal view returns (address[] memory) {
    return handler.getUnderlying(_token);
  }

  /**
   * @notice This internal function returns balance of token
   */
  function getBalance(address _token, address _of) internal view returns (uint256) {
    return IERC20Upgradeable(_token).balanceOf(_of);
  }

  /**
   * @notice The function is used to get tokens from index
   */
  function getTokens() internal view returns (address[] memory) {
    return index.getTokens();
  }

  /**
   * @notice The function is used to check investment value
   */
  function _checkInvestmentValue(uint256 _tokenAmount) internal view {
    IndexSwapLibrary._checkInvestmentValue(_tokenAmount, iAssetManagerConfig);
  }

  /**
   * @notice The function is used to get index token rate
   */
  function getIndexTokenRate() internal returns (uint256) {
    return IndexSwapLibrary.getIndexTokenRate(index);
  }

  function chargeFees() internal returns (uint256) {
    return IndexSwapLibrary.chargeFees(index, feeModule);
  }

  function totalSupply() internal view returns (uint256) {
    return index.totalSupply();
  }

  // important to receive ETH
  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}