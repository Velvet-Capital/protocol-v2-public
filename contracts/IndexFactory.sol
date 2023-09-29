// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.16;
import {AccessController} from "./access/AccessController.sol";
import {IIndexSwap} from "./core/IIndexSwap.sol";
import {IOffChainIndexSwap} from "./core/IOffChainIndexSwap.sol";
import {IAssetManagerConfig} from "./registry/IAssetManagerConfig.sol";
import {IRebalancing} from "./rebalance/IRebalancing.sol";
import {IOffChainRebalance} from "./rebalance/IOffChainRebalance.sol";
import {IRebalanceAggregator} from "./rebalance/IRebalanceAggregator.sol";
import {IExchange} from "./core/IExchange.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable, Initializable} from "@openzeppelin/contracts-upgradeable-4.3.2/access/OwnableUpgradeable.sol";
import {FunctionParameters} from "./FunctionParameters.sol";
import {ErrorLibrary} from "./library/ErrorLibrary.sol";
import {ITokenRegistry} from "./registry/ITokenRegistry.sol";
import {IFeeModule} from "./fee/IFeeModule.sol";
import {IVelvetSafeModule} from "./vault/IVelvetSafeModule.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {VelvetSafeModule} from "./vault/VelvetSafeModule.sol";
import {GnosisDeployer} from "contracts/library/GnosisDeployer.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable-4.3.2/security/ReentrancyGuardUpgradeable.sol";

contract IndexFactory is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
  address public indexSwapLibrary;
  address internal baseIndexSwapAddress;
  address internal baseRebalancingAddress;
  address internal baseOffChainRebalancingAddress;
  address internal baseRebalanceAggregatorAddress;
  address internal baseExchangeHandlerAddress;
  address internal baseAssetManagerConfigAddress;
  address internal feeModuleImplementationAddress;
  address internal baseOffChainIndexSwapAddress;
  address internal baseVelvetGnosisSafeModuleAddress;
  address public tokenRegistry;
  address public priceOracle;
  bool internal indexCreationPause;
  //Gnosis Helper Contracts
  address public gnosisSingleton;
  address public gnosisFallbackLibrary;
  address public gnosisMultisendLibrary;
  address public gnosisSafeProxyFactory;

  uint256 public indexId;

  struct IndexSwaplInfo {
    address indexSwap;
    address rebalancing;
    address offChainRebalancing;
    address metaAggregator;
    address owner;
    address exchangeHandler;
    address assetManagerConfig;
    address feeModule;
    address offChainIndexSwap;
    address vaultAddress;
    address gnosisModule;
  }

  IndexSwaplInfo[] public IndexSwapInfolList;
  //Events
  event IndexInfo(IndexSwaplInfo indexData, uint256 indexed indexId, address _owner);
  event IndexCreationState(bool state);
  event UpgradeIndexSwap(address newImplementation);
  event UpgradeExchange(address newImplementation);
  event UpgradeAssetManagerConfig(address newImplementation);
  event UpgradeOffchainRebalance(address newImplementation);
  event UpgradeOffChainIndex(address newImplementation);
  event UpgradeFeeModule(address newImplementation);
  event UpgradeRebalanceAggregator(address newImplementation);
  event UpgradeRebalance(address newImplementation);
  event UpdateGnosisAddresses(
    address newGnosisSingleton,
    address newGnosisFallbackLibrary,
    address newGnosisMultisendLibrary,
    address newGnosisSafeProxyFactory
  );

  /**
   * @notice This function is used to initialise the IndexFactory while deployment
   */
  function initialize(FunctionParameters.IndexFactoryInitData memory initData) external initializer {
    __UUPSUpgradeable_init();
    __Ownable_init();
    __ReentrancyGuard_init();
    if (
      initData._indexSwapLibrary == address(0) ||
      initData._baseExchangeHandlerAddress == address(0) ||
      initData._baseOffChainRebalancingAddress == address(0) ||
      initData._baseIndexSwapAddress == address(0) ||
      initData._baseRebalancingAddres == address(0) ||
      initData._baseRebalanceAggregatorAddress == address(0) ||
      initData._baseAssetManagerConfigAddress == address(0) ||
      initData._baseOffChainIndexSwapAddress == address(0) ||
      initData._feeModuleImplementationAddress == address(0) ||
      initData._baseVelvetGnosisSafeModuleAddress == address(0) ||
      initData._gnosisSingleton == address(0) ||
      initData._gnosisFallbackLibrary == address(0) ||
      initData._gnosisMultisendLibrary == address(0) ||
      initData._gnosisSafeProxyFactory == address(0)
    ) {
      revert ErrorLibrary.InvalidAddress();
    }
    indexSwapLibrary = initData._indexSwapLibrary;
    priceOracle = initData._priceOracle;
    _setBaseIndexSwapAddress(initData._baseIndexSwapAddress);
    _setBaseRebalancingAddress(initData._baseRebalancingAddres);
    _setBaseOffChainRebalancingAddress(initData._baseOffChainRebalancingAddress);
    _setRebalanceAggregatorAddress(initData._baseRebalanceAggregatorAddress);
    _setBaseExchangeHandlerAddress(initData._baseExchangeHandlerAddress);
    _setBaseAssetManagerConfigAddress(initData._baseAssetManagerConfigAddress);
    _setBaseOffChainIndexSwapAddress(initData._baseOffChainIndexSwapAddress);
    _setFeeModuleImplementationAddress(initData._feeModuleImplementationAddress);
    baseVelvetGnosisSafeModuleAddress = initData._baseVelvetGnosisSafeModuleAddress;
    tokenRegistry = initData._tokenRegistry;
    gnosisSingleton = initData._gnosisSingleton;
    gnosisFallbackLibrary = initData._gnosisFallbackLibrary;
    gnosisMultisendLibrary = initData._gnosisMultisendLibrary;
    gnosisSafeProxyFactory = initData._gnosisSafeProxyFactory;
  }

  /**
   * @notice This function enables to create a new non custodial portfolio
   * @param initData Accepts the input data from the user
   */
  function createIndexNonCustodial(
    FunctionParameters.IndexCreationInitData memory initData
  ) external virtual nonReentrant {
    address[] memory _owner = new address[](1);
    _owner[0] = address(0x0000000000000000000000000000000000000000);
    _createIndex(initData, false, _owner, 1);
  }

  /**
   * @notice This function enables to create a new custodial portfolio
   * @param initData Accepts the input data from the user
   * @param _owners Array list of owners for gnosis safe
   * @param _threshold Threshold for the gnosis safe(min number of transaction required)
   */
  function createIndexCustodial(
    FunctionParameters.IndexCreationInitData memory initData,
    address[] memory _owners,
    uint256 _threshold
  ) external virtual nonReentrant {
    if (_owners.length == 0) {
      revert ErrorLibrary.NoOwnerPassed();
    }
    if (_threshold > _owners.length || _threshold == 0) {
      revert ErrorLibrary.InvalidThresholdLength();
    }
    _createIndex(initData, true, _owners, _threshold);
  }

  /**
   * @notice This internal function enables to create a new portfolio according to given inputs
   * @param initData Input params passed as a struct
   * @param _custodial Boolean param as to whether the fund is custodial or non-custodial
   * @param _owner Address of the owner of the fund
   * @param _threshold Number of signers required for the multi-sig fund creation
   */
  function _createIndex(
    FunctionParameters.IndexCreationInitData memory initData,
    bool _custodial,
    address[] memory _owner,
    uint256 _threshold
  ) internal virtual {
    if (initData.minIndexInvestmentAmount < ITokenRegistry(tokenRegistry).MIN_VELVET_INVESTMENTAMOUNT()) {
      revert ErrorLibrary.InvalidMinInvestmentAmount();
    }
    if (initData.maxIndexInvestmentAmount > ITokenRegistry(tokenRegistry).MAX_VELVET_INVESTMENTAMOUNT()) {
      revert ErrorLibrary.InvalidMaxInvestmentAmount();
    }
    if (indexCreationPause) {
      revert ErrorLibrary.IndexCreationIsPause();
    }
    if (initData._assetManagerTreasury == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    if (ITokenRegistry(tokenRegistry).getProtocolState() == true) {
      revert ErrorLibrary.ProtocolIsPaused();
    }

    //Exchange Handler
    ERC1967Proxy _exchangeHandler = new ERC1967Proxy(baseExchangeHandlerAddress, bytes(""));

    // Access Controller
    AccessController accessController = new AccessController();

    ERC1967Proxy _assetManagerConfig = new ERC1967Proxy(
      baseAssetManagerConfigAddress,
      abi.encodeWithSelector(
        IAssetManagerConfig.init.selector,
        FunctionParameters.AssetManagerConfigInitData({
          _managementFee: initData._managementFee,
          _performanceFee: initData._performanceFee,
          _entryFee: initData._entryFee,
          _exitFee: initData._exitFee,
          _minInvestmentAmount: initData.minIndexInvestmentAmount,
          _maxInvestmentAmount: initData.maxIndexInvestmentAmount,
          _tokenRegistry: tokenRegistry,
          _accessController: address(accessController),
          _assetManagerTreasury: initData._assetManagerTreasury,
          _whitelistedTokens: initData._whitelistedTokens,
          _publicPortfolio: initData._public,
          _transferable: initData._transferable,
          _transferableToPublic: initData._transferableToPublic,
          _whitelistTokens: initData._whitelistTokens
        })
      )
    );

    ERC1967Proxy _feeModule = new ERC1967Proxy(feeModuleImplementationAddress, bytes(""));
    // Vault creation
    address vaultAddress;
    address module;
    if (!_custodial) {
      _owner[0] = address(_exchangeHandler);
      _threshold = 1;
    }

    (vaultAddress, module) = GnosisDeployer.deployGnosisSafeAndModule(
      gnosisSingleton,
      gnosisSafeProxyFactory,
      gnosisMultisendLibrary,
      gnosisFallbackLibrary,
      baseVelvetGnosisSafeModuleAddress,
      _owner,
      _threshold
    );
    IVelvetSafeModule(address(module)).setUp(
      abi.encode(vaultAddress, address(_exchangeHandler), address(gnosisMultisendLibrary))
    );

    ERC1967Proxy indexSwap = new ERC1967Proxy(
      baseIndexSwapAddress,
      abi.encodeWithSelector(
        IIndexSwap.init.selector,
        FunctionParameters.IndexSwapInitData({
          _name: initData.name,
          _symbol: initData.symbol,
          _vault: vaultAddress,
          _module: module,
          _oracle: priceOracle,
          _accessController: address(accessController),
          _tokenRegistry: tokenRegistry,
          _exchange: address(_exchangeHandler),
          _iAssetManagerConfig: address(_assetManagerConfig),
          _feeModule: address(_feeModule)
        })
      )
    );

    ERC1967Proxy offChainIndexSwap = new ERC1967Proxy(
      baseOffChainIndexSwapAddress,
      abi.encodeWithSelector(IOffChainIndexSwap.init.selector, address(indexSwap))
    );

    // Index Manager
    IExchange(address(_exchangeHandler)).init(address(accessController), module, priceOracle, tokenRegistry);
    ERC1967Proxy rebalancing = new ERC1967Proxy(
      baseRebalancingAddress,
      abi.encodeWithSelector(IRebalancing.init.selector, IIndexSwap(address(indexSwap)), address(accessController))
    );

    ERC1967Proxy rebalanceAggregator = new ERC1967Proxy(
      baseRebalanceAggregatorAddress,
      abi.encodeWithSelector(
        IRebalanceAggregator.init.selector,
        address(indexSwap),
        address(accessController),
        address(_exchangeHandler),
        tokenRegistry,
        address(_assetManagerConfig),
        vaultAddress
      )
    );

    ERC1967Proxy offChainRebalancing = new ERC1967Proxy(
      baseOffChainRebalancingAddress,
      abi.encodeWithSelector(
        IOffChainRebalance.init.selector,
        IIndexSwap(address(indexSwap)),
        address(accessController),
        address(_exchangeHandler),
        tokenRegistry,
        address(_assetManagerConfig),
        vaultAddress,
        address(rebalanceAggregator)
      )
    );

    IndexSwapInfolList.push(
      IndexSwaplInfo(
        address(indexSwap),
        address(rebalancing),
        address(offChainRebalancing),
        address(rebalanceAggregator),
        msg.sender,
        address(_exchangeHandler),
        address(_assetManagerConfig),
        address(_feeModule),
        address(offChainIndexSwap),
        address(vaultAddress),
        address(module)
      )
    );

    accessController.setUpRoles(
      FunctionParameters.AccessSetup({
        _exchangeHandler: address(_exchangeHandler),
        _index: address(indexSwap),
        _tokenRegistry: tokenRegistry,
        _portfolioCreator: msg.sender,
        _rebalancing: address(rebalancing),
        _offChainRebalancing: address(offChainRebalancing),
        _rebalanceAggregator: address(rebalanceAggregator),
        _feeModule: address(_feeModule),
        _offChainIndexSwap: address(offChainIndexSwap)
      })
    );

    IFeeModule(address(_feeModule)).init(
      address(indexSwap),
      address(_assetManagerConfig),
      tokenRegistry,
      address(accessController)
    );

    emit IndexInfo(IndexSwapInfolList[indexId], indexId, msg.sender);
    indexId = indexId + 1;
  }

  /**
   * @notice This function returns the IndexSwap address at the given index id
   * @param indexfundId Integral id of the index fund whose IndexSwap address is to be retrieved
   * @return Return the IndexSwap address of the fund
   */
  function getIndexList(uint256 indexfundId) external view virtual returns (address) {
    return address(IndexSwapInfolList[indexfundId].indexSwap);
  }

  /**
   * @notice This function is used to upgrade the IndexSwap contract
   * @param _proxy Proxy address
   * @param _newImpl New implementation address
   */
  function upgradeIndexSwap(address[] calldata _proxy, address _newImpl) external virtual onlyOwner {
    _setBaseIndexSwapAddress(_newImpl);
    _upgrade(_proxy, _newImpl);
    emit UpgradeIndexSwap(_newImpl);
  }

  /**
   * @notice This function is used to upgrade the Exchange contract
   * @param _proxy Proxy address
   * @param _newImpl New implementation address
   */
  function upgradeExchange(address[] calldata _proxy, address _newImpl) external virtual onlyOwner {
    _setBaseExchangeHandlerAddress(_newImpl);
    _upgrade(_proxy, _newImpl);
    emit UpgradeExchange(_newImpl);
  }

  /**
   * @notice This function is used to upgrade the AssetManagerConfig contract
   * @param _proxy Proxy address
   * @param _newImpl New implementation address
   */
  function upgradeAssetManagerConfig(address[] calldata _proxy, address _newImpl) external virtual onlyOwner {
    _setBaseAssetManagerConfigAddress(_newImpl);
    _upgrade(_proxy, _newImpl);
    emit UpgradeAssetManagerConfig(_newImpl);
  }

  /**
   * @notice This function is used to upgrade the OffChainRebalance contract
   * @param _proxy Proxy address
   * @param _newImpl New implementation address
   */
  function upgradeOffchainRebalance(address[] calldata _proxy, address _newImpl) external virtual onlyOwner {
    _setBaseOffChainRebalancingAddress(_newImpl);
    _upgrade(_proxy, _newImpl);
    emit UpgradeOffchainRebalance(_newImpl);
  }

  /**
   * @notice This function is used to upgrade the OffChainIndexSwap contract
   * @param _proxy Proxy address
   * @param _newImpl New implementation address
   */
  function upgradeOffChainIndex(address[] calldata _proxy, address _newImpl) external virtual onlyOwner {
    _setBaseOffChainIndexSwapAddress(_newImpl);
    _upgrade(_proxy, _newImpl);
    emit UpgradeOffChainIndex(_newImpl);
  }

  /**
   * @notice This function is used to upgrade the FeeModule contract
   * @param _proxy Proxy address
   * @param _newImpl New implementation address
   */
  function upgradeFeeModule(address[] calldata _proxy, address _newImpl) external virtual onlyOwner {
    _setFeeModuleImplementationAddress(_newImpl);
    _upgrade(_proxy, _newImpl);
    emit UpgradeFeeModule(_newImpl);
  }

  /**
   * @notice This function is used to upgrade the Rebalance Aggregator contract
   * @param _proxy Proxy address
   * @param _newImpl New implementation address
   */
  function upgradeRebalanceAggregator(address[] calldata _proxy, address _newImpl) external virtual onlyOwner {
    _setRebalanceAggregatorAddress(_newImpl);
    _upgrade(_proxy, _newImpl);
    emit UpgradeRebalanceAggregator(_newImpl);
  }

  /**
   * @notice This function is used to upgrade the Rebalance contract
   * @param _proxy Proxy address for the rebalancing contract
   * @param _newImpl New implementation address
   */
  function upgradeRebalance(address[] calldata _proxy, address _newImpl) external virtual onlyOwner {
    _setBaseRebalancingAddress(_newImpl);
    _upgrade(_proxy, _newImpl);
    emit UpgradeRebalance(_newImpl);
  }

  /**
   * @notice This function is the base UUPS upgrade function used to make all the upgrades happen
   * @param _proxy Address of the upgrade proxy contract
   * @param _newImpl Address of the new implementation that is the module to be upgraded to
   */
  function _upgrade(address[] calldata _proxy, address _newImpl) internal virtual onlyOwner {
    if (ITokenRegistry(tokenRegistry).getProtocolState() == false) {
      revert ErrorLibrary.ProtocolNotPaused();
    }
    if (_newImpl == address(0)) {
      revert ErrorLibrary.InvalidAddress();
    }
    for (uint256 i = 0; i < _proxy.length; i++) {
      UUPSUpgradeable(_proxy[i]).upgradeTo(_newImpl);
    }
  }

  /**
   * @notice This function allows us to pause or unpause the index creation state
   * @param _state Boolean parameter to set the index creation state of the factory
   */
  function setIndexCreationState(bool _state) public virtual onlyOwner {
    indexCreationPause = _state;
    emit IndexCreationState(_state);
  }

  /**
   * @notice This function is used to set the base indexswap address
   * @param _indexSwap Address of the IndexSwap module to set as base
   */
  function _setBaseIndexSwapAddress(address _indexSwap) internal {
    baseIndexSwapAddress = _indexSwap;
  }

  /**
   * @notice This function is used to set the base exchange handler address
   * @param _exchange Address of the Exchange module to set as base
   */
  function _setBaseExchangeHandlerAddress(address _exchange) internal {
    baseExchangeHandlerAddress = _exchange;
  }

  /**
   * @notice This function is used to set the base asset manager config address
   * @param _config Address of the AssetManager Config to set as base
   */
  function _setBaseAssetManagerConfigAddress(address _config) internal {
    baseAssetManagerConfigAddress = _config;
  }

  /**
   * @notice This function is used to set the base offchain-rebalance address
   * @param _offchainRebalance Address of the Offchain Rebalance module to set as base
   */
  function _setBaseOffChainRebalancingAddress(address _offchainRebalance) internal {
    baseOffChainRebalancingAddress = _offchainRebalance;
  }

  /**
   * @notice This function is used to set the base offchain-indexswap address
   * @param _offchainIndexSwap Address of the Offchain IndexSwap to set as base
   */
  function _setBaseOffChainIndexSwapAddress(address _offchainIndexSwap) internal {
    baseOffChainIndexSwapAddress = _offchainIndexSwap;
  }

  /**
   * @notice This function is used to set the fee module implementation address
   * @param _feeModule Address of the fee module address to set as base
   */
  function _setFeeModuleImplementationAddress(address _feeModule) internal {
    feeModuleImplementationAddress = _feeModule;
  }

  /**
   * @notice This function is used to set the base rebalance aggregator address
   * @param _rebalanceAggregator Address of the rebalance aggregator module address to set as base
   */
  function _setRebalanceAggregatorAddress(address _rebalanceAggregator) internal {
    baseRebalanceAggregatorAddress = _rebalanceAggregator;
  }

  /**
   * @notice This function is used to set the base rebalancing address
   * @param _rebalance Address of the rebalance module address to set as base
   */
  function _setBaseRebalancingAddress(address _rebalance) internal {
    baseRebalancingAddress = _rebalance;
  }

  /**
   * @notice This function allows us to update gnosis deployment addresses
   * @param _newGnosisSingleton New address of GnosisSingleton
   * @param _newGnosisFallbackLibrary New address of GnosisFallbackLibrary
   * @param _newGnosisMultisendLibrary New address of GnosisMultisendLibrary
   * @param _newGnosisSafeProxyFactory New address of GnosisSafeProxyFactory
   */
  function updateGnosisAddresses(
    address _newGnosisSingleton,
    address _newGnosisFallbackLibrary,
    address _newGnosisMultisendLibrary,
    address _newGnosisSafeProxyFactory
  ) external virtual onlyOwner {
    gnosisSingleton = _newGnosisSingleton;
    gnosisFallbackLibrary = _newGnosisFallbackLibrary;
    gnosisMultisendLibrary = _newGnosisMultisendLibrary;
    gnosisSafeProxyFactory = _newGnosisSafeProxyFactory;

    emit UpdateGnosisAddresses(
      _newGnosisSingleton,
      _newGnosisFallbackLibrary,
      _newGnosisMultisendLibrary,
      _newGnosisSafeProxyFactory
    );
  }

  /**
   * @notice Authorizes upgrade for this contract
   * @param newImplementation Address of the new implementation
   */
  function _authorizeUpgrade(address newImplementation) internal virtual override onlyOwner {}
}