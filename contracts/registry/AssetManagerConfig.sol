// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import { OwnableUpgradeable, Initializable } from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";

import { IAccessController } from "../access/IAccessController.sol";

import { ITokenRegistry } from "../registry/ITokenRegistry.sol";

import { FunctionParameters } from "../FunctionParameters.sol";
import { ErrorLibrary } from "../library/ErrorLibrary.sol";

contract AssetManagerConfig is
  Initializable,
  OwnableUpgradeable,
  UUPSUpgradeable
{
  IAccessController public accessController;
  ITokenRegistry public tokenRegistry;

  uint256 public MAX_INVESTMENTAMOUNT;
  uint256 public MIN_INVESTMENTAMOUNT;

  uint256 public managementFee;
  uint256 public performanceFee;

  uint256 public newPerformanceFee;
  uint256 public newManagementFee;

  uint256 public proposedPerformanceFeeTime;
  uint256 public proposedManagementFeeTime;

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

  event UpdateManagementFee(uint256 indexed time, uint256 indexed newManagementFee);
  event UpdatePerformanceFee(uint256 indexed time, uint256 indexed performanceFee);
  event SetPermittedTokens(uint256 indexed time, address[] _newTokens);

  function init(FunctionParameters.AssetManagerConfigInitData calldata initData)
    external
    initializer
  {
    __UUPSUpgradeable_init();
    __Ownable_init();
    if (initData._assetManagerTreasury == address(0)) {
      revert ErrorLibrary.ZeroAddressTreasury();
    }
    accessController = IAccessController(initData._accessController);
    tokenRegistry = ITokenRegistry(initData._tokenRegistry);

    if (
      !(initData._managementFee <= tokenRegistry.maxManagementFee() &&
        initData._performanceFee <= tokenRegistry.maxPerformanceFee())
    ) {
      revert ErrorLibrary.InvalidFee();
    }

    managementFee = initData._managementFee;
    performanceFee = initData._performanceFee;

    MIN_INVESTMENTAMOUNT = initData._minInvestmentAmount;
    MAX_INVESTMENTAMOUNT = initData._maxInvestmentAmount;

    assetManagerTreasury = initData._assetManagerTreasury;

    publicPortfolio = initData._publicPortfolio;
    transferable = initData._transferable;
    transferableToPublic = initData._transferableToPublic;

    whitelistTokens = initData._whitelistTokens;

    addTokensToWhitelist(initData._whitelistedTokens);
  }

  modifier onlyAssetManager() {
    if (
      !(accessController.hasRole(keccak256("ASSET_MANAGER_ROLE"), msg.sender))
    ) {
      revert ErrorLibrary.CallerNotAssetManager();
    }
    _;
  }

  modifier onlyWhitelistManager() {
    if (
      !(accessController.hasRole(keccak256("WHITELIST_MANAGER"), msg.sender))
    ) {
      revert ErrorLibrary.CallerNotWhitelistManager();
    }
    _;
  }

  /**
   * @notice This function updates the newManagementFee (staging)
   */
  function proposeNewManagementFee(uint256 _newManagementFee)
    public
    virtual
    onlyAssetManager
  {
    if (_newManagementFee > tokenRegistry.maxManagementFee()) {
      revert ErrorLibrary.InvalidFee();
    }
    newManagementFee = _newManagementFee;
    proposedManagementFeeTime = block.timestamp;
  }

  /**
   * @notice This function deletes the newManagementFee
   */
  function deleteProposedManagementFee() public virtual onlyAssetManager {
    proposedManagementFeeTime = 0;
    newManagementFee = 0;
  }

  /**
   * @notice This function updates the existing managementFee with newManagementFee
   */
  function updateManagementFee() public virtual onlyAssetManager {
    if (block.timestamp < (proposedManagementFeeTime + 28 days)) {
      revert ErrorLibrary.TimePeriodNotOver();
    }
    managementFee = newManagementFee;
    emit UpdateManagementFee(block.timestamp, managementFee);
  }

  /**
   * @notice This function updates the newPerformanceFee (staging)
   */
  function proposeNewPerformanceFee(uint256 _newPerformanceFee)
    public
    virtual
    onlyAssetManager
  {
    if (_newPerformanceFee > tokenRegistry.maxPerformanceFee()) {
      revert ErrorLibrary.InvalidFee();
    }
    newPerformanceFee = _newPerformanceFee;
    proposedPerformanceFeeTime = block.timestamp;
  }

 /**
  * @notice This function permits a portfolio token from the asset manager side
  */
  function setPermittedTokens(address[] calldata _newTokens)
    external
    virtual
    onlyAssetManager
  {
    if (_newTokens.length == 0) {
      revert ErrorLibrary.InvalidLength();
    }
    for (uint256 i = 0; i < _newTokens.length; i++) {
      if (!(tokenRegistry.isPermitted(_newTokens[i]))) {
        revert ErrorLibrary.TokenNotPermitted();
      }
      if (_newTokens[i] == address(0)) {
        revert ErrorLibrary.InvalidTokenAddress();
      }

      if (_permittedTokens[_newTokens[i]] != false) {
        revert ErrorLibrary.AddressAlreadyApproved();
      }

      _permittedTokens[_newTokens[i]] = true;
    }
    emit SetPermittedTokens(block.timestamp, _newTokens);
  }

  /**
   * @notice This function removes permission from a previously permitted token
   */
  function deletePermittedTokens(address[] calldata _tokens)
    external
    virtual
    onlyAssetManager
  {
    if (_tokens.length == 0) {
      revert ErrorLibrary.InvalidLength();
    }
    for (uint256 i = 0; i < _tokens.length; i++) {
      if (_tokens[i] == address(0)) {
        revert ErrorLibrary.InvalidTokenAddress();
      }
      if (_permittedTokens[_tokens[i]] != true) {
        revert ErrorLibrary.TokenNotApproved();
      }
      delete _permittedTokens[_tokens[i]];
    }
  }

  /**
   * @notice This function checks if a token is permitted or not
   */
  function isTokenPermitted(address _token) public view virtual returns (bool) {
    if (_token == address(0)) {
      revert ErrorLibrary.InvalidTokenAddress();
    }
    return _permittedTokens[_token];
  }

  /**
   * @notice This function delete the newPerformanceFee
   */
  function deleteProposedPerformanceFee() public virtual onlyAssetManager {
    proposedPerformanceFeeTime = 0;
    newPerformanceFee = 0;
  }

  /**
   * @notice This function updates the existing performance fee with newPerformanceFee
   */
  function updatePerformanceFee() public virtual onlyAssetManager {
    if (block.timestamp < (proposedPerformanceFeeTime + 28 days)) {
      revert ErrorLibrary.TimePeriodNotOver();
    }
    performanceFee = newPerformanceFee;
    emit UpdatePerformanceFee(block.timestamp, performanceFee);
  }

  /**
   * @notice This function update the address of assetManagerTreasury
   */
  function updateAssetManagerTreasury(address _newAssetManagementTreasury)
    public
    virtual
    onlyAssetManager
  {
    assetManagerTreasury = _newAssetManagementTreasury;
  }

  /**
   * @notice This function whitelists users which can invest in a particular index
   */
  function addWhitelistedUser(address[] calldata users)
    public
    virtual
    onlyWhitelistManager
  {
    uint256 len = users.length;
    for (uint256 i = 0; i < len; i++) {
      whitelistedUsers[users[i]] = true;
    }
  }

  /**
   * @notice This function removes a previously whitelisted user
   */
  function removeWhitelistedUser(address[] calldata users)
    public
    virtual
    onlyWhitelistManager
  {
    uint256 len = users.length;
    for (uint256 i = 0; i < len; i++) {
      whitelistedUsers[users[i]] = false;
    }
  }

  /**
   * @notice This function explicitly adds tokens to the whitelisted list
   */
  function addTokensToWhitelist(address[] calldata tokens) internal virtual {
    uint256 len = tokens.length;
    for (uint256 i = 0; i < len; i++) {
      whitelistedToken[tokens[i]] = true;
    }
  }

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation)
    internal
    virtual
    override
    onlyOwner
  {}
}
