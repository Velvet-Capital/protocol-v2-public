import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import hre from "hardhat";
import { ethers, upgrades, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { tokenAddresses, IAddresses, indexSwapLibrary } from "./Deployments.test";

import {
  AccessController,
  AssetManagerConfig,
  Exchange,
  PriceOracle,
  TokenRegistry,
  VelvetSafeModule,
} from "../typechain";

import { chainIdToAddresses } from "../scripts/networkVariables";
import console from "console";

import Safe, { SafeFactory, SafeAccountConfig, ContractNetworksConfig } from "@gnosis.pm/safe-core-sdk";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import { SafeTransactionDataPartial, GnosisSafeContract, SafeVersion } from "@gnosis.pm/safe-core-sdk-types";


var chai = require("chai");
//use default BigNumber
chai.use(require("chai-bignumber")());

describe.only("Tests for AssetManagerConfig", () => {
  let iaddress: IAddresses;
  let accounts;
  let priceOracle: PriceOracle;
  let vaultAddress: string;
  let velvetSafeModule: VelvetSafeModule;
  let tokenRegistry: TokenRegistry;
  let accessController: AccessController;
  let assetManagerConfig: AssetManagerConfig;
  let exchange: Exchange;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let indexManager: SignerWithAddress;
  let assetManager: SignerWithAddress;
  let investor1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let newSafeAddress:any;
  const forkChainId: any = process.env.FORK_CHAINID;
  const provider = ethers.provider;
  const chainId: any = forkChainId ? forkChainId : 56;
  const addresses = chainIdToAddresses[chainId];

  describe.only("Tests for AssetManagerConfig contract", () => {
    before(async () => {
      const PriceOracle = await ethers.getContractFactory("PriceOracle");
      priceOracle = await PriceOracle.deploy();
      await priceOracle.deployed();

      const TokenRegistry = await ethers.getContractFactory("TokenRegistry");
      tokenRegistry = await TokenRegistry.deploy();
      await tokenRegistry.deployed();

      accounts = await ethers.getSigners();
      [owner, investor1, nonOwner, treasury, addr1, addr2, indexManager, assetManager, ...addrs] = accounts;

      iaddress = await tokenAddresses(priceOracle, true);

      const ZeroExHandler = await ethers.getContractFactory("ZeroExHandler");
      const zeroExHandler = await ZeroExHandler.deploy();
      await zeroExHandler.deployed();

      zeroExHandler.init(iaddress.wbnbAddress, "0xdef1c0ded9bec7f1a1670819833240f027b25eff");

      const IndexOperations = await ethers.getContractFactory("IndexOperations", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      const indexOperations = await IndexOperations.deploy();
      await indexOperations.deployed();

      await tokenRegistry.initialize(
        "100",
        "1000",
        "1000",
        "10000000000000000",
        "500000000000000000000",
        treasury.address,
        addresses.WETH_Address,
        indexOperations.address,
        "1",
      );

      const Exchange = await ethers.getContractFactory("Exchange", {
        libraries: {
          IndexSwapLibrary: indexSwapLibrary.address,
        },
      });
      exchange = await Exchange.deploy();
      await exchange.deployed();

      const VelvetSafeModule = await ethers.getContractFactory("VelvetSafeModule");
      velvetSafeModule = await VelvetSafeModule.deploy();
      await velvetSafeModule.deployed();
      console.log("VelvetSafeModule deployed to: ", velvetSafeModule.address);

      const ethAdapter = new EthersAdapter({
        ethers,
        signer: owner,
      });

      const id = await ethAdapter.getChainId();
      const contractNetworks: ContractNetworksConfig = {
        [id]: {
          multiSendAddress: addresses.MULTI_SEND_ADDRESS,
          safeMasterCopyAddress: addresses.SAFE_MASTER_COPY_ADDRESS,
          safeProxyFactoryAddress: addresses.SAFE_PROXY_FACTORY_ADDRESS,
        },
      };

      const safeFactory = await SafeFactory.create({
        ethAdapter,
        contractNetworks,
        isL1SafeMasterCopy: true,
      });

      const owners = [owner.address];
      const threshold = 1;
      const safeAccountConfig: SafeAccountConfig = {
        owners,
        threshold,
      };

      const safeSdk: Safe = await safeFactory.deploySafe({ safeAccountConfig });
      newSafeAddress = safeSdk.getAddress();
      let safeAddress = newSafeAddress;
      console.log("Gnosis Safe deployed to: ", newSafeAddress);

      let ABI = ["function enableModule(address module)"];
      let abiEncode = new ethers.utils.Interface(ABI);
      let txData = abiEncode.encodeFunctionData("enableModule", [velvetSafeModule.address]);

      const transaction: SafeTransactionDataPartial = {
        to: newSafeAddress,
        value: "0",
        data: txData,
        operation: 0,
        safeTxGas: 0,
        baseGas: 0,
        gasPrice: 0,
        gasToken: "0x0000000000000000000000000000000000000000",
        refundReceiver: "0x0000000000000000000000000000000000000000",
      };
      const safeTransaction = await safeSdk.createTransaction(transaction);

      const txHash = await safeSdk.getTransactionHash(safeTransaction);
      const approveTxResponse = await safeSdk.approveTransactionHash(txHash);
      await approveTxResponse.transactionResponse?.wait();

      const executeTxResponse = await safeSdk.executeTransaction(safeTransaction);
      await executeTxResponse.transactionResponse?.wait();


      const AccessController = await ethers.getContractFactory("AccessController");
      accessController = await AccessController.deploy();
      await accessController.deployed();

      await exchange.init(accessController.address, velvetSafeModule.address, priceOracle.address, tokenRegistry.address);
      const abiEncoder = ethers.utils.defaultAbiCoder;
      await velvetSafeModule.setUp(abiEncoder.encode(["address","address","address"],[newSafeAddress,exchange.address,addresses.gnosisMultisendLibrary]));

      await accessController.grantRole(
        "0xb1fadd3142ab2ad7f1337ea4d97112bcc8337fc11ce5b20cb04ad038adf99819",
        assetManager.address,
      );

      await accessController.grantRole(
        "0x1916b456004f332cd8a19679364ef4be668619658be72c17b7e86697c4ae0f16",
        indexManager.address,
      );

      const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
      assetManagerConfig = await AssetManagerConfig.deploy();
      await assetManagerConfig.deployed();

      await assetManagerConfig.init({
        _managementFee: "100",
        _performanceFee: "10",
        _minInvestmentAmount: "10000000000000000",
        _maxInvestmentAmount: "500000000000000000000",
        _tokenRegistry: tokenRegistry.address,
        _accessController: accessController.address,
        _assetManagerTreasury: treasury.address,
        _whitelistedTokens: [],
        _publicPortfolio: true,
        _transferable: true,
        _transferableToPublic: true,
        _whitelistTokens: false,
      });

      const provider = ethers.getDefaultProvider();
    });

    describe("Test cases for Handler", function () {
      it("should fail to create an index with management fee greater than max fee", async () => {
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig2 = await AssetManagerConfig.deploy();
        await assetManagerConfig2.deployed();
        await expect(
          assetManagerConfig2.init({
            _managementFee: "20000",
            _performanceFee: "10",
            _minInvestmentAmount: "10000000000000000",
            _maxInvestmentAmount: "500000000000000000000",
            _tokenRegistry: tokenRegistry.address,
            _accessController: accessController.address,
            _assetManagerTreasury: treasury.address,
            _whitelistedTokens: [],
            _publicPortfolio: true,
            _transferable: true,
            _transferableToPublic: true,
            _whitelistTokens: false,
          }),
        ).to.be.revertedWithCustomError(assetManagerConfig2, "InvalidFee");
      });

      it("should fail to create an index with management fee greater than max fee", async () => {
        const AssetManagerConfig = await ethers.getContractFactory("AssetManagerConfig");
        const assetManagerConfig2 = await AssetManagerConfig.deploy();
        await assetManagerConfig2.deployed();
        await expect(
          assetManagerConfig2.init({
            _managementFee: "100",
            _performanceFee: "20000",
            _minInvestmentAmount: "10000000000000000",
            _maxInvestmentAmount: "500000000000000000000",
            _tokenRegistry: tokenRegistry.address,
            _accessController: accessController.address,
            _assetManagerTreasury: treasury.address,
            _whitelistedTokens: [],
            _publicPortfolio: true,
            _transferable: true,
            _transferableToPublic: true,
            _whitelistTokens: false,
          }),
        ).to.be.revertedWithCustomError(assetManagerConfig2, "InvalidFee");
      });

      it("Non asset manager should not be able to propose new management fee", async () => {
        await expect(assetManagerConfig.connect(nonOwner).proposeNewManagementFee("200")).to.be.revertedWithCustomError(
          assetManagerConfig,
          "CallerNotAssetManager",
        );
      });

      it("Asset manager should propose new management fee", async () => {
        await assetManagerConfig.connect(assetManager).proposeNewManagementFee("200");
      });

      it("Asset manager should not be able to update management fee before 28 days passed", async () => {
        await expect(assetManagerConfig.connect(assetManager).updateManagementFee()).to.be.revertedWithCustomError(
          assetManagerConfig,
          "TimePeriodNotOver",
        );
      });

      it("Non asset manager should not be able to delete proposed new management fee", async () => {
        await expect(assetManagerConfig.connect(nonOwner).deleteProposedManagementFee()).to.be.revertedWithCustomError(
          assetManagerConfig,
          "CallerNotAssetManager",
        );
      });

      it("Asset manager should be able to delete proposed new management fee", async () => {
        await assetManagerConfig.connect(assetManager).deleteProposedManagementFee();
      });

      it("Non asset manager should not be able to update management fee", async () => {
        await expect(assetManagerConfig.connect(nonOwner).updateManagementFee()).to.be.revertedWithCustomError(
          assetManagerConfig,
          "CallerNotAssetManager",
        );
      });

      it("Asset manager should propose new management fee", async () => {
        await assetManagerConfig.connect(assetManager).proposeNewManagementFee("150");
      });

      it("Asset manager should be able to update management fee after 28 days passed", async () => {
        await network.provider.send("evm_increaseTime", [2419200]);

        await assetManagerConfig.connect(assetManager).updateManagementFee();
      });

      // same for performance

      it("Non asset manager should not be able to propose new performance fee", async () => {
        await expect(
          assetManagerConfig.connect(nonOwner).proposeNewPerformanceFee("200"),
        ).to.be.revertedWithCustomError(assetManagerConfig, "CallerNotAssetManager");
      });

      it("Asset manager should propose new performance fee", async () => {
        await assetManagerConfig.connect(assetManager).proposeNewPerformanceFee("200");
      });

      it("Asset manager should be able to update performance fee before 28 days passed", async () => {
        await expect(assetManagerConfig.connect(assetManager).updatePerformanceFee()).to.be.revertedWithCustomError(
          assetManagerConfig,
          "TimePeriodNotOver",
        );
      });

      it("Non asset manager should not be able to delete proposed new performance fee", async () => {
        await expect(assetManagerConfig.connect(nonOwner).deleteProposedPerformanceFee()).to.be.revertedWithCustomError(
          assetManagerConfig,
          "CallerNotAssetManager",
        );
      });

      it("Asset manager should be able to delete proposed new performance fee", async () => {
        await assetManagerConfig.connect(assetManager).deleteProposedPerformanceFee();
      });

      it("Non asset manager should not be able to update performance fee", async () => {
        await expect(assetManagerConfig.connect(nonOwner).updatePerformanceFee()).to.be.revertedWithCustomError(
          assetManagerConfig,
          "CallerNotAssetManager",
        );
      });

      it("Asset manager should propose new management fee", async () => {
        await assetManagerConfig.connect(assetManager).proposeNewPerformanceFee("150");
      });

      it("Asset manager should be able to update management fee after 28 days passed", async () => {
        await time.increase(2419200);

        await assetManagerConfig.connect(assetManager).updatePerformanceFee();
      });

      // treasury
      it("Non asset manager should not be able to update the asset manager treasury", async () => {
        await expect(
          assetManagerConfig.connect(nonOwner).updateAssetManagerTreasury(owner.address),
        ).to.be.revertedWithCustomError(assetManagerConfig, "CallerNotAssetManager");
      });

      it("Asset manager should not be able to update the asset manager treasury", async () => {
        await assetManagerConfig.connect(assetManager).updateAssetManagerTreasury(owner.address);
      });

      it("Non asset manager should not be able to update the velvet treasury", async () => {
        await expect(tokenRegistry.connect(nonOwner).updateVelvetTreasury(owner.address)).to.be.reverted;
      });

      it("Asset manager should be able to update the velvet treasury", async () => {
        await tokenRegistry.updateVelvetTreasury(owner.address);
      });
    });
  });
});
