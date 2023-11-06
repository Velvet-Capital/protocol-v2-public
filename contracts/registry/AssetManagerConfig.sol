// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";

import {IAccessController} from "../access/IAccessController.sol";

import {ITokenRegistry} from "../registry/ITokenRegistry.sol";

import {FunctionParameters} from "../FunctionParameters.sol";
import {ErrorLibrary} from "../library/ErrorLibrary.sol";

contract AssetManagerConfig is Initializable, OwnableUpgradeable, UUPSUpgradeable {
  IAccessController internal accessController;
  ITokenRegistry internal tokenRegistry;

  uint256 public MAX_INVESTMENTAMOUNT;
  uint256 public MIN_INVESTMENTAMOUNT;

  uint256 public managementFee;
  uint256 public performanceFee;

  uint256 public entryFee;
  uint256 public exitFee;

  uint256 public newPerformanceFee;
  uint256 public newManagementFee;
  uint256 public newEntryFee;
  uint256 public newExitFee;

  uint256 public proposedPerformanceFeeTime;
  uint256 public proposedManagementFeeTime;
  uint256 public proposedEntryAndExitFeeTime;

  address public assetManagerTreasury;

  // Speicifes whether portfolio is public or only accessible for whitelisted users
  mapping(address => bool) public whitelistedUsers;

  // Tokens that are whitelisted for a specific portfolio chosen during portfolio creation
  mapping(address => bool) public whitelistedToken;

  mapping(address => bool) internal _permittedTokens;

  bool public whitelistTokens;

  bool public publicPortfolio;
  bool public transferable;
  bool public transferableToPublic;

  event ProposeManagementFee(uint256 indexed newManagementFee);
  event ProposePerformanceFee(uint256 indexed performanceFee);
  event DeleteProposedManagementFee(address indexed user);
  event DeleteProposedPerformanceFee(address indexed user);
  event UpdateManagementFee(uint256 indexed newManagementFee);
  event UpdatePerformanceFee(uint256 indexed performanceFee);
  event SetPermittedTokens(address[] _newTokens);
  event RemovePermittedTokens(address[] tokens);
  event UpdateAssetManagerTreasury(address treasuryAddress);
  event AddWhitelistedUser(address[] users);
  event RemoveWhitelistedUser(address[] users);
  event AddWhitelistTokens(address[] tokens);
  event ChangedPortfolioToPublic(address indexed user);
  event TransferabilityUpdate(bool _transferable, bool _publicTransfers);
  event ProposeEntryAndExitFee(uint256 indexed time, uint256 indexed newEntryFee, uint256 indexed newExitFee);
  event DeleteProposedEntryAndExitFee(uint indexed time);
  event UpdateEntryAndExitFee(uint256 indexed time, uint256 indexed newEntryFee, uint256 indexed newExitFee);

  /**
   * @notice This function is used to init the assetmanager-config data while deployment
   * @param initData Input parameters passed as a struct
   */
  function init(FunctionParameters.AssetManagerConfigInitData calldata initData) external initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();
    if (initData._assetManagerTreasury == address(0)) {
      revert ErrorLibrary.ZeroAddressTreasury();
    }
    accessController = IAccessController(initData._accessController);
    tokenRegistry = ITokenRegistry(initData._tokenRegistry);

    if (
      !(initData._managementFee <= tokenRegistry.maxManagementFee() &&
        initData._performanceFee <= tokenRegistry.maxPerformanceFee() &&
        initData._entryFee <= tokenRegistry.maxEntryFee() &&
        initData._exitFee <= tokenRegistry.maxExitFee())
    ) {
      revert ErrorLibrary.InvalidFee();
    }

    managementFee = initData._managementFee;
    performanceFee = initData._performanceFee;

    entryFee = initData._entryFee;
    exitFee = initData._exitFee;

    MIN_INVESTMENTAMOUNT = initData._minInvestmentAmount;
    MAX_INVESTMENTAMOUNT = initData._maxInvestmentAmount;

    assetManagerTreasury = initData._assetManagerTreasury;

    publicPortfolio = initData._publicPortfolio;
    transferable = initData._transferable;
    transferableToPublic = initData._transferableToPublic;

    whitelistTokens = initData._whitelistTokens;
    if (whitelistTokens) {
      addTokensToWhitelist(initData._whitelistedTokens);
    }
  }

  modifier onlyAssetManager() {
    if (!(accessController.hasRole(keccak256("ASSET_MANAGER_ROLE"), msg.sender))) {
      revert ErrorLibrary.CallerNotAssetManager();
    }
    _;
  }

  modifier onlyWhitelistManager() {
    if (!(accessController.hasRole(keccak256("WHITELIST_MANAGER"), msg.sender))) {
      revert ErrorLibrary.CallerNotWhitelistManager();
    }
    _;
  }

  /**
   * @notice This function updates the newManagementFee (staging)
   * @param _newManagementFee The new proposed management fee (integral) value - has to be in the range of min and max fee values
   */
  function proposeNewManagementFee(uint256 _newManagementFee) public virtual onlyAssetManager {
    if (_newManagementFee > tokenRegistry.maxManagementFee()) {
      revert ErrorLibrary.InvalidFee();
    }
    newManagementFee = _newManagementFee;
    proposedManagementFeeTime = block.timestamp;
    emit ProposeManagementFee(newManagementFee);
  }

  /**
   * @notice This function deletes the newManagementFee
   */
  function deleteProposedManagementFee() public virtual onlyAssetManager {
    proposedManagementFeeTime = 0;
    newManagementFee = 0;
    emit DeleteProposedManagementFee(msg.sender);
  }

  /**
   * @notice This function updates the existing managementFee with newManagementFee
   */
  function updateManagementFee() public virtual onlyAssetManager {
    if (proposedManagementFeeTime == 0) {
      revert ErrorLibrary.NoNewFeeSet();
    }
    if (block.timestamp < (proposedManagementFeeTime + 28 days)) {
      revert ErrorLibrary.TimePeriodNotOver();
    }
    managementFee = newManagementFee;
    emit UpdateManagementFee(managementFee);
  }

  /**
   * @notice This function updates the newPerformanceFee (staging)
   * @param _newPerformanceFee The new proposed performance fee (integral) value
   */
  function proposeNewPerformanceFee(uint256 _newPerformanceFee) public virtual onlyAssetManager {
    if (_newPerformanceFee > tokenRegistry.maxPerformanceFee()) {
      revert ErrorLibrary.InvalidFee();
    }
    newPerformanceFee = _newPerformanceFee;
    proposedPerformanceFeeTime = block.timestamp;
    emit ProposePerformanceFee(newPerformanceFee);
  }

  /**
   * @notice This function permits a portfolio token from the asset manager side
   * @param _newTokens Array of the tokens to be permitted by the asset manager
   */
  function setPermittedTokens(address[] calldata _newTokens) external virtual onlyAssetManager {
    if (_newTokens.length == 0) {
      revert ErrorLibrary.InvalidLength();
    }
    for (uint256 i = 0; i < _newTokens.length; i++) {
      address _newToken = _newTokens[i];
      if (_newToken == address(0)) {
        revert ErrorLibrary.InvalidTokenAddress();
      }
      if (!(tokenRegistry.isPermitted(_newToken))) {
        revert ErrorLibrary.TokenNotPermitted();
      }
      if (_permittedTokens[_newToken]) {
        revert ErrorLibrary.AddressAlreadyApproved();
      }

      _permittedTokens[_newToken] = true;
    }
    emit SetPermittedTokens(_newTokens);
  }

  /**
   * @notice This function removes permission from a previously permitted token
   * @param _tokens Address of the tokens to be revoked permission by the asset manager
   */
  function deletePermittedTokens(address[] calldata _tokens) external virtual onlyAssetManager {
    if (_tokens.length == 0) {
      revert ErrorLibrary.InvalidLength();
    }
    for (uint256 i = 0; i < _tokens.length; i++) {
      address _token = _tokens[i];
      if (_token == address(0)) {
        revert ErrorLibrary.InvalidTokenAddress();
      }
      if (_permittedTokens[_token] != true) {
        revert ErrorLibrary.TokenNotApproved();
      }
      delete _permittedTokens[_token];
    }
    emit RemovePermittedTokens(_tokens);
  }

  /**
   * @notice This function checks if a token is permitted or not
   * @param _token Address of the token to be checked for
   * @return Boolean return value for is the token permitted in the asset manager config or not
   */
  function isTokenPermitted(address _token) public view virtual returns (bool) {
    if (_token == address(0)) {
      revert ErrorLibrary.InvalidTokenAddress();
    }
    return _permittedTokens[_token];
  }

  /**
   * @notice This function allows the asset manager to convert a private fund to a public fund
   */
  function convertPrivateFundToPublic() public virtual onlyAssetManager {
    if (!publicPortfolio) {
      publicPortfolio = true;
      if (transferable) {
        transferableToPublic = true;
      }
    }

    emit ChangedPortfolioToPublic(msg.sender);
  }

  /**
   * @notice This function allows the asset manager to update the transferability of a fund
   * @param _transferable Boolean parameter for is the fund transferable or not
   * @param _publicTransfer Boolean parameter for is the fund transferable to public or not
   */
  function updateTransferability(bool _transferable, bool _publicTransfer) public virtual onlyAssetManager {
    transferable = _transferable;

    if (!transferable) {
      transferableToPublic = false;
    } else {
      if (publicPortfolio) {
        if (!_publicTransfer) {
          revert ErrorLibrary.PublicFundToWhitelistedNotAllowed();
        }
        transferableToPublic = true;
      } else {
        transferableToPublic = _publicTransfer;
      }
    }
    emit TransferabilityUpdate(transferable, transferableToPublic);
  }

  /**
   * @notice This function delete the newPerformanceFee
   */
  function deleteProposedPerformanceFee() public virtual onlyAssetManager {
    proposedPerformanceFeeTime = 0;
    newPerformanceFee = 0;
    emit DeleteProposedPerformanceFee(msg.sender);
  }

  /**
   * @notice This function updates the existing performance fee with newPerformanceFee
   */
  function updatePerformanceFee() public virtual onlyAssetManager {
    if (proposedPerformanceFeeTime == 0) {
      revert ErrorLibrary.NoNewFeeSet();
    }
    if (block.timestamp < (proposedPerformanceFeeTime + 28 days)) {
      revert ErrorLibrary.TimePeriodNotOver();
    }
    performanceFee = newPerformanceFee;
    emit UpdatePerformanceFee(performanceFee);
  }

  /**
   * @notice This function update the address of assetManagerTreasury
   * @param _newAssetManagementTreasury New proposed address of the asset manager treasury
   */
  function updateAssetManagerTreasury(address _newAssetManagementTreasury) public virtual onlyAssetManager {
    if (_newAssetManagementTreasury == address(0)) revert ErrorLibrary.InvalidAddress();
    assetManagerTreasury = _newAssetManagementTreasury;
    emit UpdateAssetManagerTreasury(_newAssetManagementTreasury);
  }

  /**
   * @notice This function whitelists users which can invest in a particular index
   * @param users Array of user addresses to be whitelisted by the asset manager
   */
  function addWhitelistedUser(address[] calldata users) public virtual onlyWhitelistManager {
    uint256 len = users.length;
    for (uint256 i = 0; i < len; i++) {
      address _user = users[i];
      if (_user == address(0)) revert ErrorLibrary.InvalidAddress();
      whitelistedUsers[_user] = true;
    }
    emit AddWhitelistedUser(users);
  }

  /**
   * @notice This function removes a previously whitelisted user
   * @param users Array of user addresses to be removed from whiteist by the asset manager
   */
  function removeWhitelistedUser(address[] calldata users) public virtual onlyWhitelistManager {
    uint256 len = users.length;
    for (uint256 i = 0; i < len; i++) {
      if (users[i] == address(0)) revert ErrorLibrary.InvalidAddress();
      whitelistedUsers[users[i]] = false;
    }
    emit RemoveWhitelistedUser(users);
  }

  /**
   * @notice This function explicitly adds tokens to the whitelisted list
   * @param tokens Array of token addresses to be whitelisted
   */
  function addTokensToWhitelist(address[] calldata tokens) internal virtual {
    uint256 len = tokens.length;
    for (uint256 i = 0; i < len; i++) {
      address _token = tokens[i];
      if (_token == address(0)) revert ErrorLibrary.InvalidAddress();
      if (!tokenRegistry.isEnabled(_token)) revert ErrorLibrary.TokenNotEnabled();
      whitelistedToken[_token] = true;
    }
    emit AddWhitelistTokens(tokens);
  }

  /**
   * @notice This function updates the newEntryFee and newExitFee (staging)
   * @param _newEntryFee The new proposed entry fee (integral) value - has to be in the range of min and max fee values
   * @param _newExitFee The new proposed exit fee (integral) value - has to be in the range of min and max fee values
   */
  function proposeNewEntryAndExitFee(uint256 _newEntryFee, uint256 _newExitFee) public virtual onlyAssetManager {
    if (_newEntryFee > tokenRegistry.maxEntryFee() || _newExitFee > tokenRegistry.maxExitFee()) {
      revert ErrorLibrary.InvalidFee();
    }
    newEntryFee = _newEntryFee;
    newExitFee = _newExitFee;
    proposedEntryAndExitFeeTime = block.timestamp;
    emit ProposeEntryAndExitFee(proposedEntryAndExitFeeTime, newEntryFee, newExitFee);
  }

  /**
   * @notice This function deletes the newEntryFee and newExitFee
   */
  function deleteProposedEntryAndExitFee() public virtual onlyAssetManager {
    proposedEntryAndExitFeeTime = 0;
    newEntryFee = 0;
    newExitFee = 0;
    emit DeleteProposedEntryAndExitFee(block.timestamp);
  }

  /**
   * @notice This function updates the existing entryFee with newEntryFee and exitFee with newExitFee
   */
  function updateEntryAndExitFee() public virtual onlyAssetManager {
    if (proposedEntryAndExitFeeTime == 0) {
      revert ErrorLibrary.NoNewFeeSet();
    }
    if (block.timestamp < (proposedEntryAndExitFeeTime + 28 days)) {
      revert ErrorLibrary.TimePeriodNotOver();
    }
    entryFee = newEntryFee;
    exitFee = newExitFee;
    emit UpdateEntryAndExitFee(block.timestamp, entryFee, exitFee);
  }

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}
