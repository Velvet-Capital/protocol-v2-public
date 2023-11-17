// SPDX-License-Identifier: BUSL-1.1

/**
 * @title IndexSwap for the Index
 * @author Velvet.Capital
 * @notice This contract is used by the user to invest and withdraw from the index
 * @dev  The IndexSwap contract facilitates the investment and withdrawal of funds in a portfolio of tokens.
 *        It allows users to invest in the portfolio and receive index tokens representing their share in the portfolio.
 *        Users can also withdraw their investment by burning index tokens and receiving the corresponding portfolio tokens.
 * This contract includes functionalities:
 *      1. Invest in the particular fund
 *      2. Withdraw from the fund
 */

pragma solidity 0.8.16;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/token/ERC20/ERC20Upgradeable.sol";
import {UUPSUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";
import {IIndexSwap} from "../core/IIndexSwap.sol";
import "../core/IndexSwapLibrary.sol";
import {IPriceOracle} from "../oracle/IPriceOracle.sol";
import {IAccessController} from "../access/IAccessController.sol";
import {ITokenRegistry} from "../registry/ITokenRegistry.sol";
import {IExchange} from "./IExchange.sol";
import {IAssetManagerConfig} from "../registry/IAssetManagerConfig.sol";
import {IWETH} from "../interfaces/IWETH.sol";

import {TransferHelper} from "@uniswap/lib/contracts/libraries/TransferHelper.sol";

import {IFeeModule} from "../fee/IFeeModule.sol";
import {FunctionParameters} from "../FunctionParameters.sol";

import {ErrorLibrary} from "../library/ErrorLibrary.sol";
import {CommonReentrancyGuard} from "./CommonReentrancyGuard.sol";

contract IndexSwap is Initializable, ERC20Upgradeable, UUPSUpgradeable, OwnableUpgradeable, CommonReentrancyGuard {
  /**
   * @dev Token record data structure
   * @param lastDenormUpdate timestamp of last denorm change
   * @param denorm denormalized weight
   * @param index index of address in tokens array
   * @param handler handler address for token
   */
  struct Record {
    uint40 lastDenormUpdate;
    uint96 denorm;
    uint256 index;
  }

  // Array of underlying tokens in the pool.
  address[] internal _tokens;

  // Internal records of the pool's underlying tokens
  mapping(address => Record) internal _records;

  // Internal records of the tokens input by asset manager while updating
  mapping(address => bool) internal _previousToken;

  // IERC20 public token;

  //Keeps track of user last investment time
  mapping(address => uint256) public lastInvestmentTime;
  mapping(address => uint256) public lastWithdrawCooldown;

  address internal _vault;
  address internal _module;

  bool internal _paused;
  uint256 internal _lastPaused;

  uint256 internal _lastRebalanced;

  bool internal _redeemed;

  IPriceOracle internal _oracle;
  IFeeModule internal _feeModule;
  IAccessController internal _accessController;
  ITokenRegistry internal _tokenRegistry;
  IExchange internal _exchange;
  IAssetManagerConfig internal _iAssetManagerConfig;
  address internal WETH;
  // Total denormalized weight of the pool.
  uint256 internal constant _TOTAL_WEIGHT = 10_000;

  //events
  event InvestInFund(
    address user,
    uint256 investedAmount,
    uint256 tokenAmount,
    uint256 rate,
    uint256 currentUserBalance,
    address index
  );
  event WithdrawFund(
    address indexed user,
    uint256 tokenAmount,
    uint256 indexed rate,
    uint256 currentUserBalance,
    address indexed index
  );

  // /** @dev Emitted when public trades are enabled. */
  event LOG_PUBLIC_SWAP_ENABLED(uint indexed time);

  constructor() {
    _disableInitializers();
  }

  /**
   * @notice This function make sure of the necessary checks before the transfer of index tokens.
   * (Making sure that the fund allows the token transfer and the receipient address is whitelisted)
   */
  function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
    super._beforeTokenTransfer(from, to, amount);
    if (from == address(0) || to == address(0)) {
      return;
    }
    if (
      !(_iAssetManagerConfig.transferableToPublic() ||
        (_iAssetManagerConfig.transferable() && _iAssetManagerConfig.whitelistedUsers(to)))
    ) {
      revert ErrorLibrary.Transferprohibited();
    }
    checkCoolDownPeriod(from);
  }

  /**
   * @notice This function is used to init the IndexSwap while deployment
   * @param initData Includes the input params
   */
  function init(FunctionParameters.IndexSwapInitData calldata initData) external initializer {
    __ERC20_init(initData._name, initData._symbol);
    __UUPSUpgradeable_init();
    __Ownable_init();
    __ReentrancyGuard_init();
    _vault = initData._vault;
    _module = initData._module;
    _accessController = IAccessController(initData._accessController);
    _tokenRegistry = ITokenRegistry(initData._tokenRegistry);
    _oracle = IPriceOracle(initData._oracle);
    _exchange = IExchange(initData._exchange);
    _iAssetManagerConfig = IAssetManagerConfig(initData._iAssetManagerConfig);
    _feeModule = IFeeModule(initData._feeModule);
    WETH = _tokenRegistry.getETH();
  }

  /**
   * @dev Sets up the initial assets for the pool.
   * @param tokens Underlying tokens to initialize the pool with
   * @param denorms Initial denormalized weights for the tokens
   */
  function initToken(address[] calldata tokens, uint96[] calldata denorms) external virtual onlySuperAdmin {
    if (tokens.length > _tokenRegistry.getMaxAssetLimit())
      revert ErrorLibrary.TokenCountOutOfLimit(_tokenRegistry.getMaxAssetLimit());

    if (tokens.length != denorms.length) {
      revert ErrorLibrary.InvalidInitInput();
    }
    if (_tokens.length != 0) {
      revert ErrorLibrary.AlreadyInitialized();
    }
    uint256 totalWeight;
    for (uint256 i = 0; i < tokens.length; i++) {
      if (_previousToken[tokens[i]] == true) {
        revert ErrorLibrary.TokenAlreadyExist();
      }
      address token = tokens[i];
      uint96 _denorm = denorms[i];
      IndexSwapLibrary._beforeInitCheck(IIndexSwap(address(this)), token, _denorm);
      _records[token] = Record({lastDenormUpdate: uint40(getTimeStamp()), denorm: _denorm, index: uint256(i)});
      _tokens.push(token);

      totalWeight = totalWeight + _denorm;
      _previousToken[tokens[i]] = true;
    }
    setFalse(tokens);
    _weightCheck(totalWeight);
    emit LOG_PUBLIC_SWAP_ENABLED(getTimeStamp());
  }

  modifier onlySuperAdmin() {
    if (!_checkRole("SUPER_ADMIN", msg.sender)) {
      revert ErrorLibrary.CallerNotSuperAdmin();
    }
    _;
  }

  /**
   * @notice This function mints new shares to a particular address of the specific amount
   */
  function mintShares(address _to, uint256 _amount) external virtual onlyMinter {
    _mint(_to, _amount);
  }

  /**
   * @notice This function burns the specific amount of shares of a particular address
   */
  function burnShares(address _to, uint256 _amount) external virtual onlyMinter {
    _burn(_to, _amount);
  }

  /**
     * @notice The function swaps BNB into the portfolio tokens after a user makes an investment
     * @dev The output of the swap is converted into USD to get the actual amount after slippage to calculate 
            the index token amount to mint
     * @dev (tokenBalance, vaultBalance) has to be calculated before swapping for the _mintShareAmount function 
            because during the swap the amount will change but the index token balance is still the same 
            (before minting)
     */
  function investInFund(
    FunctionParameters.InvestFund memory investData
  ) external payable virtual nonReentrant notPaused {
    IndexSwapLibrary.beforeInvestment(
      IIndexSwap(address(this)),
      investData._slippage.length,
      investData._lpSlippage.length,
      msg.sender
    );
    address _token = investData._token;
    uint256 balanceBefore = IndexSwapLibrary.checkBalance(_token, address(_exchange), WETH);
    uint256 _amount = investData._tokenAmount;
    uint256 _investmentAmountInUSD;

    if (msg.value > 0) {
      if (WETH != _token) {
        revert ErrorLibrary.InvalidToken();
      }
      _amount = msg.value;
    } else {
      IndexSwapLibrary._checkPermissionAndBalance(_token, _amount, _iAssetManagerConfig, msg.sender);
      TransferHelper.safeTransferFrom(_token, msg.sender, address(_exchange), _amount);
    }

    _investmentAmountInUSD = _oracle.getPriceTokenUSD18Decimals(_token, _amount);
    _checkInvestmentValue(_investmentAmountInUSD);

    uint256 investedAmountAfterSlippage;
    uint256 vaultBalance;
    uint256[] memory amount = new uint256[](_tokens.length);
    uint256[] memory tokenBalance = new uint256[](_tokens.length);

    (tokenBalance, vaultBalance) = getTokenAndVaultBalance();
    chargeFees(vaultBalance);

    amount = IndexSwapLibrary.calculateSwapAmounts(
      IIndexSwap(address(this)),
      _amount,
      tokenBalance,
      vaultBalance,
      _tokens
    );
    uint256[] memory slippage = investData._slippage;

    investedAmountAfterSlippage = _exchange._swapTokenToTokens{value: msg.value}(
      FunctionParameters.SwapTokenToTokensData(
        address(this),
        _token,
        investData._swapHandler,
        msg.sender,
        _amount,
        totalSupply(),
        amount,
        slippage,
        investData._lpSlippage
      ),
      balanceBefore
    );

    if (investedAmountAfterSlippage <= 0) {
      revert ErrorLibrary.ZeroFinalInvestmentValue();
    }
    uint256 tokenAmount;
    uint256 _totalSupply = totalSupply();
    tokenAmount = getTokenAmount(_totalSupply, investedAmountAfterSlippage, vaultBalance);
    if (tokenAmount <= 0) {
      revert ErrorLibrary.ZeroTokenAmount();
    }
    uint256 _mintedAmount = _mintInvest(msg.sender, tokenAmount);
    lastWithdrawCooldown[msg.sender] = IndexSwapLibrary.calculateCooldownPeriod(
      balanceOf(msg.sender),
      _mintedAmount,
      _tokenRegistry.COOLDOWN_PERIOD(),
      lastWithdrawCooldown[msg.sender],
      lastInvestmentTime[msg.sender]
    );
    lastInvestmentTime[msg.sender] = getTimeStamp();

    emit InvestInFund(
      msg.sender,
      _amount,
      _mintedAmount,
      IndexSwapLibrary.getIndexTokenRate(IIndexSwap(address(this))),
      balanceOf(msg.sender),
      address(this)
    );
  }

  /*
   * @notice The function swaps the amount of portfolio tokens represented by the amount of index token back to
   *           BNB or token pass and returns it to the user and burns the amount of index token being withdrawn
   *          Allows users to withdraw their investment by burning index tokens.
   *          also option  Users will receive the corresponding underlying tokens.
   * @dev This function implements the withdrawal process for the fund.
   * @param initData WithdrawFund struct containing the function parameters:
   *        - _slippage: Array of slippage values for token swaps
   *        - _lpSlippage: Array of slippage values for LP token swaps
   *        - tokenAmount: Amount of index tokens to be burned
   *        - _swapHandler: Address of the swap handler contract
   *        - _token: Address of the token to withdraw or convert to
   *        - isMultiAsset: Flag indicating if the withdrawal involves multiple assets or a single asset
   *
   */
  function withdrawFund(FunctionParameters.WithdrawFund calldata initData) external nonReentrant notPaused {
    checkCoolDownPeriod(msg.sender);
    IndexSwapLibrary.beforeWithdrawCheck(
      initData._slippage.length,
      initData._lpSlippage.length,
      initData._token,
      msg.sender,
      IIndexSwap(address(this)),
      initData.tokenAmount
    );
    uint256 vaultBalance;
    (, vaultBalance) = getTokenAndVaultBalance();
    if (!(msg.sender == _iAssetManagerConfig.assetManagerTreasury() || msg.sender == _tokenRegistry.velvetTreasury())) {
      chargeFees(vaultBalance);
    }
    uint256 totalSupplyIndex = totalSupply();
    uint256 _exitFee = _burnWithdraw(msg.sender, initData.tokenAmount);
    uint256 _tokenAmount = initData.tokenAmount - _exitFee;
    for (uint256 i = 0; i < _tokens.length; i++) {
      address token = _tokens[i];
      IHandler handler = IHandler(_tokenRegistry.getTokenInformation(token).handler);
      uint256 tokenBalance = handler.getTokenBalance(_vault, token);
      tokenBalance = (tokenBalance * _tokenAmount) / totalSupplyIndex;
      if (initData.isMultiAsset || token == initData._token) {
        IndexSwapLibrary.withdrawMultiAssetORWithdrawToken(
          address(_tokenRegistry),
          address(_exchange),
          token,
          tokenBalance
        );
      } else {
        _exchange._pullFromVault(token, tokenBalance, address(_exchange));
        _exchange._swapTokenToToken(
          FunctionParameters.SwapTokenToTokenData(
            token,
            initData._token,
            msg.sender,
            initData._swapHandler,
            msg.sender,
            tokenBalance,
            initData._slippage[i],
            initData._lpSlippage[i],
            false
          )
        );
      }
    }
    emit WithdrawFund(
      msg.sender,
      initData.tokenAmount,
      IndexSwapLibrary.getIndexTokenRate(IIndexSwap(address(this))),
      balanceOf(msg.sender),
      address(this)
    );
  }

  /**
   * @notice Performs additional validation after the withdrawal process.
   *  Basic us that when use withdraw he not keep dust after withdraw index token
   * @dev This function is called after the withdrawal process is completed.
   */
  function validateWithdraw(address _user) internal {
    uint256 _minInvestValue = _tokenRegistry.MIN_VELVET_INVESTMENTAMOUNT();
    if (!(balanceOf(_user) == 0 || balanceOf(_user) >= _minInvestValue)) {
      revert ErrorLibrary.BalanceCantBeBelowVelvetMinInvestAmount({minVelvetInvestment: _minInvestValue});
    }
  }

  /**
   * @notice Calculates the token amount based on the total supply, invested amount, and vault balance.
   * @dev If the total supply is greater than zero, the token amount is calculated using the formula:
   *  tokenAmount = investedAmount * _totalSupply / vaultBalance
   *  If the total supply is zero, the token amount is equal to the invested amount.
   * @param _totalSupply The total supply of index tokens.
   * @param investedAmount The amount of funds invested.
   * @param vaultBalance The balance of funds in the vault.
   * @return tokenAmount The calculated token amount.
   */
  function getTokenAmount(
    uint256 _totalSupply,
    uint256 investedAmount,
    uint256 vaultBalance
  ) internal pure returns (uint256 tokenAmount) {
    if (_totalSupply > 0) {
      tokenAmount = (investedAmount * _totalSupply) / vaultBalance;
    } else {
      tokenAmount = investedAmount;
    }
  }

  function nonReentrantBefore() external onlyMinter {
    _nonReentrantBefore();
  }

  function nonReentrantAfter() external onlyMinter {
    _nonReentrantAfter();
  }

  /**
   * @notice Mints new index tokens and assigns them to the specified address.
   * @dev If the entry fee is applicable, it is charged and deducted from the minted tokens.
   * @param _to The address to which the minted index tokens are assigned.
   * @param _mintAmount The amount of index tokens to mint.
   */
  function _mintInvest(address _to, uint256 _mintAmount) internal returns (uint256) {
    uint256 entryFee = _iAssetManagerConfig.entryFee();

    // Check if the entry fee should be charged and deducted from the minted tokens
    if (IndexSwapLibrary.mintAndBurnCheck(entryFee, _to, address(_tokenRegistry), address(_iAssetManagerConfig))) {
      _mintAmount = _feeModule.chargeEntryFee(_mintAmount, entryFee);
    }

    // Mint new index tokens and assign them to the specified address
    _mint(_to, _mintAmount);
    return _mintAmount;
  }

  /**
   * @notice Burns a specified amount of index tokens from the specified address and returns the exit fee.
   * @dev If the exit fee is applicable, it is charged and deducted from the burned tokens.
   * @param _to The address from which the index tokens are burned.
   * @param _mintAmount The amount of index tokens to burn.
   * @return The exit fee deducted from the burned tokens.
   */
  function _burnWithdraw(address _to, uint256 _mintAmount) internal returns (uint256) {
    uint256 exitFee = _iAssetManagerConfig.exitFee();
    uint256 returnValue;

    // Check if the exit fee should be charged and deducted from the burned tokens
    if (IndexSwapLibrary.mintAndBurnCheck(exitFee, _to, address(_tokenRegistry), address(_iAssetManagerConfig))) {
      (, , uint256 _exitFee) = _feeModule.chargeExitFee(_mintAmount, exitFee);
      returnValue = _exitFee;
    }

    // Burn the specified amount of index tokens from the specified address
    _burn(_to, _mintAmount);

    validateWithdraw(_to);

    return returnValue;
  }

  /**
   * @notice Mints a specified amount of index tokens to the specified address.
   * @dev This function can only be called by the designated minter.
   * @param _to The address to which the index tokens are minted.
   * @param _mintAmount The amount of index tokens to mint.
   */
  function mintTokenAndSetCooldown(
    address _to,
    uint256 _mintAmount
  ) external onlyMinter returns (uint256 _mintedAmount) {
    _mintedAmount = _mintInvest(_to, _mintAmount);
    lastWithdrawCooldown[_to] = IndexSwapLibrary.calculateCooldownPeriod(
      balanceOf(_to),
      _mintedAmount,
      _tokenRegistry.COOLDOWN_PERIOD(),
      lastWithdrawCooldown[_to],
      lastInvestmentTime[_to]
    );
    lastInvestmentTime[_to] = getTimeStamp();
  }

  /**
   * @notice Burns a specified amount of index tokens from the specified address and returns the exit fee.
   * @dev This function can only be called by the designated minter.
   * @param _to The address from which the index tokens are burned.
   * @param _mintAmount The amount of index tokens to burn.
   * @return exitFee The exit fee charged for the burn operation.
   */
  function burnWithdraw(address _to, uint256 _mintAmount) external onlyMinter returns (uint256 exitFee) {
    exitFee = _burnWithdraw(_to, _mintAmount);
  }

  modifier onlyRebalancerContract() {
    if (!_checkRole("REBALANCER_CONTRACT", msg.sender)) {
      revert ErrorLibrary.CallerNotRebalancerContract();
    }
    _;
  }

  modifier onlyMinter() {
    if (!_checkRole("MINTER_ROLE", msg.sender)) {
      revert ErrorLibrary.CallerNotIndexManager();
    }
    _;
  }

  modifier notPaused() {
    if (_paused) {
      revert ErrorLibrary.ContractPaused();
    }
    _;
  }

  /**
    @notice The function will pause the InvestInFund() and Withdrawal() called by the rebalancing contract.
    @param _state The state is bool value which needs to input by the Index Manager.
  */
  function setPaused(bool _state) external virtual onlyRebalancerContract {
    _setPaused(_state);
  }

  function _setPaused(bool _state) internal virtual {
    _paused = _state;
    _lastPaused = getTimeStamp();
  }

  /**
    @notice The function will set lastRebalanced time called by the rebalancing contract.
    @param _time The time is block.timestamp, the moment when rebalance is done
  */
  function setLastRebalance(uint256 _time) external virtual onlyRebalancerContract {
    _setLastRebalance(_time);
  }

  function _setLastRebalance(uint256 _time) internal virtual {
    _lastRebalanced = _time;
  }

  /**
    @notice The function will update the redeemed value
    @param _state The state is bool value which needs to input by the Index Manager.
  */
  function setRedeemed(bool _state) external virtual onlyRebalancerContract {
    _setRedeemed(_state);
  }

  function _setRedeemed(bool _state) internal virtual {
    _redeemed = _state;
  }

  /**
   * @notice The function updates the record struct including the denorm information
   * @dev The token list is passed so the function can be called with current or updated token list
   * @param tokens The updated token list of the portfolio
   * @param denorms The new weights for for the portfolio
   */
  function updateRecords(address[] calldata tokens, uint96[] calldata denorms) external virtual onlyRebalancerContract {
    _updateRecords(tokens, denorms);
  }

  /**
   * @notice The function is internal function for update records
   * @dev The token list is passed so the function can be called with current or updated token list
   * @param tokens The updated token list of the portfolio
   * @param denorms The new weights for for the portfolio
   */
  function _updateRecords(address[] calldata tokens, uint96[] calldata denorms) internal {
    uint256 totalWeight;
    for (uint256 i = 0; i < tokens.length; i++) {
      uint96 _denorm = denorms[i];
      address token = tokens[i];
      if (_denorm <= 0) {
        revert ErrorLibrary.ZeroDenormValue();
      }
      if (_previousToken[token] == true) {
        revert ErrorLibrary.TokenAlreadyExist();
      }
      _records[token] = Record({lastDenormUpdate: uint40(getTimeStamp()), denorm: _denorm, index: uint8(i)});

      totalWeight = totalWeight + _denorm;
      _previousToken[token] = true;
    }
    setFalse(tokens);
    _weightCheck(totalWeight);
  }

  /**
   * @notice This function update records with new tokenlist and weights
   * @param tokens Array of the tokens to be updated
   * @param _denorms Array of the updated denorm values
   */
  function updateTokenListAndRecords(
    address[] calldata tokens,
    uint96[] calldata _denorms
  ) external virtual onlyRebalancerContract {
    _updateTokenList(tokens);
    _updateRecords(tokens, _denorms);
  }

  /**
    @notice The function sets the token state to false for it be reused later by the asset manager
    @param tokens Addresses of the tokens whose state is to be changed
  */
  function setFalse(address[] calldata tokens) internal {
    for (uint i = 0; i < tokens.length; i++) {
      _previousToken[tokens[i]] = false;
    }
  }

  /**
    @notice The function returns the token list
  */
  function getTokens() public view virtual returns (address[] memory) {
    return _tokens;
  }

  /**
    @notice The function returns a boolean ouput of the redeemed value
  */
  function getRedeemed() public view virtual returns (bool) {
    return _redeemed;
  }

  /**
    @notice The function returns lastRebalanced time
  */
  function getLastRebalance() public view virtual returns (uint256) {
    return _lastRebalanced;
  }

  /**
    @notice The function returns lastPaused time
  */
  function getLastPaused() public view virtual returns (uint256) {
    return _lastPaused;
  }

  /**
   * @notice This function returns the record of a specific token
   */
  function getRecord(address _token) external view virtual returns (Record memory) {
    return _records[_token];
  }

  /**
   * @notice This function updates the token list with new tokens
   * @param tokens List of updated tokens
   */
  function updateTokenList(address[] calldata tokens) external virtual onlyRebalancerContract {
    _updateTokenList(tokens);
  }

  function _updateTokenList(address[] calldata tokens) internal {
    uint256 _maxAssetLimit = _tokenRegistry.getMaxAssetLimit();
    if (tokens.length > _maxAssetLimit) revert ErrorLibrary.TokenCountOutOfLimit(_maxAssetLimit);
    _tokens = tokens;
  }

  /**
   * @notice This function returns the address of the vault
   */
  function vault() external view returns (address) {
    return _vault;
  }

  /**
   * @notice This function returns the address of the fee module
   */
  function feeModule() external view returns (address) {
    return address(_feeModule);
  }

  /**
   * @notice This function returns the address of the exchange
   */
  function exchange() external view returns (address) {
    return address(_exchange);
  }

  /**
   * @notice This function returns the address of the token registry
   */
  function tokenRegistry() external view returns (address) {
    return address(_tokenRegistry);
  }

  /**
   * @notice This function returns the address of the access controller
   */
  function accessController() external view returns (address) {
    return address(_accessController);
  }

  /**
   * @notice This function returns the paused or unpaused state of the investment/withdrawal
   */
  function paused() external view returns (bool) {
    return _paused;
  }

  /**
   * @notice This function returns the total weight, which is supposed to be = 10_000 (representing 100%)
   */
  function TOTAL_WEIGHT() external pure returns (uint256) {
    return _TOTAL_WEIGHT;
  }

  /**
   * @notice This function returns the address of the asset manager config
   */
  function iAssetManagerConfig() external view returns (address) {
    return address(_iAssetManagerConfig);
  }

  /**
   * @notice This function returns the address of the price oracle
   */
  function oracle() external view returns (address) {
    return address(_oracle);
  }

  /**
   * @notice This function deletes a particular token record
   * @param t Address of the token whose record is to be deleted
   */
  function deleteRecord(address t) external virtual onlyRebalancerContract {
    delete _records[t];
  }

  /**
   * @notice Claims the token for the caller via the Exchange contract
   * @param tokens Addresses of the token for which the reward is to be claimed
   */
  function claimTokens(address[] calldata tokens) external nonReentrant {
    _exchange.claimTokens(IIndexSwap(address(this)), tokens);
  }

  /**
   * @notice Check for totalweight == _TOTAL_WEIGHT
   * @param weight weight of portfolio
   */
  function _weightCheck(uint256 weight) internal pure {
    if (weight != _TOTAL_WEIGHT) {
      revert ErrorLibrary.InvalidWeights({totalWeight: _TOTAL_WEIGHT});
    }
  }

  /**
   * @notice This internal function returns tokenBalance in array, vaultBalance and vaultBalance in usd
   */
  function getTokenAndVaultBalance() internal returns (uint256[] memory tokenBalance, uint256 vaultBalance) {
    (tokenBalance, vaultBalance) = IndexSwapLibrary.getTokenAndVaultBalance(IIndexSwap(address(this)), getTokens());
  }

  /**
   * @notice This internal function check for role
   */
  function _checkRole(bytes memory _role, address user) internal view returns (bool) {
    return _accessController.hasRole(keccak256(_role), user);
  }

  /**
   * @notice This internal set multiple flags such as setLastRebalance,setPause and setRedeemed
   */
  function setFlags(bool _pauseState, bool _redeemState) external onlyRebalancerContract {
    _setLastRebalance(getTimeStamp());
    _setPaused(_pauseState);
    _setRedeemed(_redeemState);
  }

  /**
   * @notice The function is used to check investment value
   */
  function _checkInvestmentValue(uint256 _tokenAmount) internal view {
    IndexSwapLibrary._checkInvestmentValue(_tokenAmount, _iAssetManagerConfig);
  }

  /**
   * @notice This function is used to charge fees
   */
  function chargeFees(uint256 vaultBalance) internal {
    _feeModule.chargeFeesFromIndex(vaultBalance);
  }

  /**
   * @notice This function returns remaining cooldown for user
   */
  function getRemainingCoolDown(address _user) public view returns (uint256) {
    uint256 userCoolDownPeriod = lastInvestmentTime[_user] + lastWithdrawCooldown[_user];
    return userCoolDownPeriod < getTimeStamp() ? 0 : userCoolDownPeriod - getTimeStamp();
  }

  /**
   * @notice This function check whether the cooldown period is passed or not
   */
  function checkCoolDownPeriod(address _user) public view {
    if (getRemainingCoolDown(_user) > 0) {
      revert ErrorLibrary.CoolDownPeriodNotPassed();
    }
  }

  /**
   * @notice This function returns timeStamp
   */
  function getTimeStamp() internal view returns (uint256) {
    return block.timestamp;
  }

  // important to receive ETH
  receive() external payable {}

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
