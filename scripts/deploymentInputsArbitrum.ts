export const inputData = {
  protocolFee: "100",
  maxAssetManagerFee: "5000",
  maxPerformanceFee: "5000",
  velvetTreasury: "0xFc553C451Aac3A823a973bBe5573a12823eaD37F",
  outAsset: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  velvetProtocolFee: "100",
  _protocolFeeBottomConstraint: "30",
  _maxEntryFee: "500",
  _maxExitFee: "500",
  maxInvestmentAmount: "50000000000000000000",
  minInvestmentAmount: "10000000000000000",
  assetManagerTreasury: "0xFc553C451Aac3A823a973bBe5573a12823eaD37F",
  velvetManagerAddress: "0xFc553C451Aac3A823a973bBe5573a12823eaD37F",
  pancakeSwapRouterAddress: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
  rewardVault: "0xFc553C451Aac3A823a973bBe5573a12823eaD37F",
  wBNB: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  cooldownPeriod: "60",
  gnosisSingleton: "0x3E5c63644E683549055b9Be8653de26E0B4CD36E",
  gnosisFallbackLibrary: "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4",
  gnosisMultisendLibrary: "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761",
  gnosisSafeProxyFactory: "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2",
  moduleProxyFactory: "0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B",
};


export const tokenRegistryTokenInfo = [
  {
    token: "BUSD",
    address: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
    handler: "0x7064dE13C05daA9D491CFa9c0afC5683c8A5845b",
    primary: true,
  },
  {
    token: "USDT",
    address: "0x55d398326f99059fF775485246999027B3197955",
    handler: "0x7064dE13C05daA9D491CFa9c0afC5683c8A5845b",
    primary: true,
  },
  {
    token: "BTC",
    address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    handler: "0x7064dE13C05daA9D491CFa9c0afC5683c8A5845b",
    primary: true,
  },
  {
    token: "WBNB",
    address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
    handler: "0x7064dE13C05daA9D491CFa9c0afC5683c8A5845b",
    primary: true,
  },
  {
    token: "vBNB",
    address: "0xA07c5b74C9B40447a954e1466938b865b6BBea36",
    handler: "0x8E5341CafBBa53411bc343E85d7E25668AA3a5D8",
    primary: false,
  },
  {
    token: "vETH",
    address: "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
    handler: "0x8E5341CafBBa53411bc343E85d7E25668AA3a5D8",
    primary: false,
  },
  {
    token: "vLINK",
    address: "0x650b940a1033B8A1b1873f78730FcFC73ec11f1f",
    handler: "0x8E5341CafBBa53411bc343E85d7E25668AA3a5D8",
    primary: false,
  },
  {
    token: "qBNB",
    address: "0x5aF1b6cA84693Cc8E733C8273Ba260095B3D05CA",
    handler: "0xA9D18D6e6d2ABF701Ad3C42014866303aBe05c02",
    primary: false,
  },
  {
    token: "qETH",
    address: "0x88131dd9f6A78d3d23aBcF4960D91913d2dC2307",
    handler: "0xA9D18D6e6d2ABF701Ad3C42014866303aBe05c02",
    primary: false,
  },
  {
    token: "PSwap_WBNB_BUSDLP",
    address: "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16",
    handler: "0x568b8CA4f729435032a875210611775C6437997B",
    primary: false,
  },
  {
    token: "PSwap_Cake_WBNBLP",
    address: "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0",
    handler: "0x568b8CA4f729435032a875210611775C6437997B",
    primary: false,
  },
  {
    token: "BSwap_WBNB_BUSDLP",
    address: "0xaCAac9311b0096E04Dfe96b6D87dec867d3883Dc",
    handler: "0x39ae0bdf7BDa2FB86539e0e1E317DA5777Ac8276",
    primary: false,
  },
  {
    token: "BSwap_BUSDT_BUSDLP",
    address: "0xDA8ceb724A06819c0A5cDb4304ea0cB27F8304cF",
    handler: "0x39ae0bdf7BDa2FB86539e0e1E317DA5777Ac8276",
    primary: false,
  },
  {
    token: "ApeSwap_WBNB_BUSD",
    address: "0x51e6D27FA57373d8d4C256231241053a70Cb1d93",
    handler: "0x8d2c0A851147a0044879d426E690757bE33bBb82",
    primary: false,
  },
  {
    token: "ApeSwap_ETH_BTCB",
    address: "0xc6EA23E8aDAf03E700be3AA50bE30ECd39B7bF49",
    handler: "0x8d2c0A851147a0044879d426E690757bE33bBb82",
    primary: false,
  },
  {
    token: "ApeSwap_ETH_WBNB",
    address: "0xA0C3Ef24414ED9C9B456740128d8E63D016A9e11",
    handler: "0x8d2c0A851147a0044879d426E690757bE33bBb82",
    primary: false,
  },
  {
    token: "ibBNB_Address",
    address: "0xd7d069493685a581d27824fc46eda46b7efc0063",
    handler: "0xF810e2d2c4309DF8923Fe2B4c4cAb0F882De7A13",
    primary: false,
  },
  {
    token: "ibBTCB_Address",
    address: "0x08FC9Ba2cAc74742177e0afC3dC8Aed6961c24e7",
    handler: "0xF810e2d2c4309DF8923Fe2B4c4cAb0F882De7A13",
    primary: false,
  },
  {
    token: "MAIN_LP_BUSD",
    address: "0xF319947eCe3823b790dd87b0A509396fE325745a",
    handler: "0x8c1B6E4dF699Af961856A3D433BFc9d94163E552",
    primary: false,
  },
  {
    token: "MAIN_LP_DAI",
    address: "0x9D0a463D5dcB82008e86bF506eb048708a15dd84",
    handler: "0x8c1B6E4dF699Af961856A3D433BFc9d94163E552",
    primary: false,
  },
  {
    token: "oBNB",
    address: "0x34878F6a484005AA90E7188a546Ea9E52b538F6f",
    handler: "0x3f2E540a66aFD19b3f767110A4c94549DF1DC589",
    primary: false,
  },
  {
    token: "oETH",
    address: "0xaA1b1E1f251610aE10E4D553b05C662e60992EEd",
    handler: "0x3f2E540a66aFD19b3f767110A4c94549DF1DC589",
    primary: false,
  },
  {
    token: "oBTCB",
    address: "0x5fce5D208DC325ff602c77497dC18F8EAdac8ADA",
    handler: "0x3f2E540a66aFD19b3f767110A4c94549DF1DC589",
    primary: false,
  },
  {
    token: "wmxLP_BUSD_pool",
    address: "0x6E85A35fFfE1326e230411f4f3c31c493B05263C",
    handler: "0xf05eAAB4605DC5F3A28906a20E2B750E6A875d33",
    primary: false,
  },
  {
    token: "wmxLP_USDT_pool",
    address: "0x1964FfE993d1DA4cA0c717C9eA16A7846b4f13aB",
    handler: "0xf05eAAB4605DC5F3A28906a20E2B750E6A875d33",
    primary: false,
  },
];

var js2 = {
  BaseHandler: "0x7064dE13C05daA9D491CFa9c0afC5683c8A5845b",
  VenusHandler: "0x8E5341CafBBa53411bc343E85d7E25668AA3a5D8",
  LiqeeHandler: "0xA9D18D6e6d2ABF701Ad3C42014866303aBe05c02",
  AlpacaHandler: "0xF810e2d2c4309DF8923Fe2B4c4cAb0F882De7A13",
  PancakeSwapLPHandler: "0x568b8CA4f729435032a875210611775C6437997B",
  BiSwapLPHandler: "0x39ae0bdf7BDa2FB86539e0e1E317DA5777Ac8276",
  ApeSwapLPHandler: "0x8d2c0A851147a0044879d426E690757bE33bBb82",
  WombatHandler: "0x8c1B6E4dF699Af961856A3D433BFc9d94163E552",
  ApeSwapLendingHandler: "0x3f2E540a66aFD19b3f767110A4c94549DF1DC589",
  WombexHandler: "0xf05eAAB4605DC5F3A28906a20E2B750E6A875d33",
};
//just for refence
export const tokens= [
  {
      "symbol": "GMX",
      "name": "GMX",
      "address": "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a.png",
      "coingeckoId": "gmx",
      "listedIn": [
          "coingecko",
          "1inch",
          "openocean",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "TLPT",
      "name": "tLPT",
      "address": "0xfaC38532829fDD744373fdcd4708Ab90fA0c4078",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/26972/thumb/tenderLPT.png?1661152923",
      "coingeckoId": "tlpt",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "CARBON",
      "name": "Carboncoin",
      "address": "0xfa42DA1bd08341537a44a4ca9D236D1c00A98b40",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cloudstorage.openocean.finance/images/1637832686338_7422730180325647.png",
      "coingeckoId": null,
      "listedIn": [
          "openocean",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "LINK",
      "name": "Chainlink",
      "address": "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x514910771af9ca656af840dff83e8264ecf986ca.png",
      "coingeckoId": "chainlink",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance",
          "xyfinance"
      ]
  },
  {
      "symbol": "CREAM",
      "name": "Cream",
      "address": "0xf4D48Ce3ee1Ac3651998971541bAdbb9A14D7234",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cryptologos.cc/logos/cream-finance-cream-logo.png",
      "coingeckoId": "cream-2",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "RGT",
      "name": "Rari Governance",
      "address": "0xef888bcA6AB6B1d26dbeC977C455388ecd794794",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://etherscan.io/token/images/RariGovernanceToken_32.png",
      "coingeckoId": "rari-governance-token",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "ACRV",
      "name": "Aladdin cvxCRV",
      "address": "0xebf1F92D4384118bFb91B4496660a95931c92861",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/25395/thumb/Sv06cFHS_400x400.jpg?1651707422",
      "coingeckoId": "aladdin-cvxcrv",
      "listedIn": [
          "coingecko",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "AUC",
      "name": "Auctus",
      "address": "0xea986d33eF8a20A96120ecc44dBdD49830192043",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/2165/thumb/Auc_Discord_Avatar1.png?1618983355",
      "coingeckoId": "auctus",
      "listedIn": [
          "coingecko",
          "arbitrum_bridge",
          "rubic"
      ]
  },
  {
      "symbol": "ELK",
      "name": "Elk",
      "address": "0xeEeEEb57642040bE42185f49C52F7E9B38f8eeeE",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xeeeeeb57642040be42185f49c52f7e9b38f8eeee.png",
      "coingeckoId": null,
      "listedIn": [
          "1inch",
          "rubic",
          "lifinance",
          "elkfinance"
      ]
  },
  {
      "symbol": "NYAN",
      "name": "ArbiNYAN",
      "address": "0xeD3fB761414DA74b74F33e5c5a1f78104b188DfC",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cloudstorage.openocean.finance/images/1638170899569_12235125291982096.png",
      "coingeckoId": "arbinyan",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "AWETH",
      "name": "Aave WETH",
      "address": "0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/17238/thumb/aWETH_2x.png?1626940782",
      "coingeckoId": "aave-weth",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "ALTA",
      "name": "Alta Finance",
      "address": "0xe0cCa86B254005889aC3a81e737f56a14f4A38F5",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/18713/thumb/AFN-token-Altafin-200.png?1633079552",
      "coingeckoId": "alta-finance",
      "listedIn": [
          "coingecko",
          "lifinance"
      ]
  },
  {
      "symbol": "DEFI5",
      "name": "DEFI Top 5 Tokens Index",
      "address": "0xdeBa25AF35e4097146d7629055E0EC3C71706324",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/13691/thumb/thGDKHo.png?1610959947",
      "coingeckoId": null,
      "listedIn": [
          "arbitrum_bridge",
          "rubic"
      ]
  },
  {
      "symbol": "KSW",
      "name": "KillSwitch",
      "address": "0xdc7179416c08c15f689d9214A3BeC2Dd003DeABc",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/20215/thumb/logo_%2824%29.png?1636670633",
      "coingeckoId": "killswitch",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "Z2O",
      "name": "ZeroTwOhm",
      "address": "0xdb96f8efd6865644993505318cc08FF9C42fb9aC",
      "decimals": 9,
      "chainId": 42161,
      "logoURI": "https://cloudstorage.openocean.finance/images/1637928264168_1276740912855694.png",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "openocean",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "SWPR",
      "name": "Swapr",
      "address": "0xdE903E2712288A1dA82942DDdF2c20529565aC30",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/18740/thumb/swapr.jpg?1633516501",
      "coingeckoId": "swapr",
      "listedIn": [
          "coingecko",
          "1inch",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "HONEY",
      "name": "Honey Pot BeeKeepers",
      "address": "0xdE31e75182276738B0c025daa8F80020A4F2fbFE",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/18380/thumb/ac6fTCfDQDIV.jpg?1631695015",
      "coingeckoId": "honey-pot-beekeepers",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "SUSHI",
      "name": "Sushi",
      "address": "0xd4d42F0b6DEF4CE0383636770eF773390d85c61A",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x6b3595068778dd592e39a122f4f5a5cf09c90fe2.png",
      "coingeckoId": "sushi",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance",
          "xyfinance"
      ]
  },
  {
      "symbol": "DBL",
      "name": "Doubloon",
      "address": "0xd3f1Da62CAFB7E7BC6531FF1ceF6F414291F03D3",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/23660/thumb/galleon-sky.png?1651744892",
      "coingeckoId": "doubloon",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "USX",
      "name": "dForce USD",
      "address": "0xcd14C3A2ba27819B352aae73414A26e2b366dC50",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://etherscan.io/token/images/dforceusd_32.png",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "NFTI",
      "name": "Scalara NFT Index",
      "address": "0xcFe3FBc98D80f7Eca0bC76cD1F406A19dD425896",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xcfe3fbc98d80f7eca0bc76cd1f406a19dd425896.png",
      "coingeckoId": "scalara-nft-index",
      "listedIn": [
          "coingecko",
          "1inch",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "WOO",
      "name": "WOO Network",
      "address": "0xcAFcD85D8ca7Ad1e1C6F82F651fA15E33AEfD07b",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/12921/thumb/w2UiemF__400x400.jpg?1603670367",
      "coingeckoId": "woo-network",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "deETH",
      "name": "deBridge Ether",
      "address": "0xcAB86F6Fb6d1C2cBeeB97854A0C023446A075Fe3",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xcab86f6fb6d1c2cbeeb97854a0c023446a075fe3.png",
      "coingeckoId": null,
      "listedIn": [
          "1inch",
          "openocean",
          "lifinance"
      ]
  },
  {
      "symbol": "NFD",
      "name": "Feisty Doge NFT",
      "address": "0xc9c2B86CD4cdbAB70cd65D22EB044574c3539F6c",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://etherscan.io/token/images/feistydoge_32.png",
      "coingeckoId": null,
      "listedIn": [
          "arbitrum_bridge",
          "lifinance"
      ]
  },
  {
      "symbol": "HOP",
      "name": "Hop Protocol",
      "address": "0xc5102fE9359FD9a28f877a67E36B0F050d81a3CC",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xc5102fe9359fd9a28f877a67e36b0f050d81a3cc.png",
      "coingeckoId": "hop-protocol",
      "listedIn": [
          "coingecko",
          "1inch",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "CREDA",
      "name": "CreDA",
      "address": "0xc136E6B376a9946B156db1ED3A34b08AFdAeD76d",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/arbitrum/assets/0xc136E6B376a9946B156db1ED3A34b08AFdAeD76d/logo.png",
      "coingeckoId": "creda",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "RAI",
      "name": "Rai Reflex Index",
      "address": "0xaeF5bbcbFa438519a5ea80B4c7181B4E78d419f2",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://etherscan.io/token/images/raireflexindex_32.png",
      "coingeckoId": null,
      "listedIn": [
          "arbitrum_bridge",
          "lifinance"
      ]
  },
  {
      "symbol": "MATTER",
      "name": "AntiMatter",
      "address": "0xaaA62D9584Cbe8e4D68A43ec91BfF4fF1fAdB202",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://etherscan.io/token/images/antimatter_32.png",
      "coingeckoId": "antimatter",
      "listedIn": [
          "coingecko",
          "arbitrum_bridge",
          "rubic"
      ]
  },
  {
      "symbol": "DF",
      "name": "dForce",
      "address": "0xaE6aab43C4f3E0cea4Ab83752C278f8dEbabA689",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/9709/thumb/xlGxxIjI_400x400.jpg?1571006794",
      "coingeckoId": "dforce-token",
      "listedIn": [
          "coingecko",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "TNGL",
      "name": "Tangle",
      "address": "0xa943F863fA69ff4F6D9022843Fb861BBEe45B2ce",
      "decimals": 9,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/18312/thumb/tangle.PNG?1631510159",
      "coingeckoId": "tangle",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "VSTA",
      "name": "Vesta Finance",
      "address": "0xa684cd057951541187f288294a1e1C2646aA2d24",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cloudstorage.openocean.finance/images/1648808309036_20667985804740718.jpg",
      "coingeckoId": "vesta-finance",
      "listedIn": [
          "coingecko",
          "openocean",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "LYS",
      "name": "LYS Capital",
      "address": "0xa4f595Ba35161c9fFE3db8c03991B9C2CBB26C6b",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/20863/thumb/1637613107-lys-logo-cg-200pix.png?1637805637",
      "coingeckoId": "lys-capital",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "GNO",
      "name": "Gnosis",
      "address": "0xa0b862F60edEf4452F25B4160F177db44DeB6Cf1",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x6810e776880c02933d47db1b9fc05908e5386b96.png",
      "coingeckoId": "gnosis",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance",
          "elkfinance"
      ]
  },
  {
      "symbol": "USDT",
      "name": "Tether",
      "address": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      "decimals": 6,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png",
      "coingeckoId": "tether",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance",
          "xyfinance",
          "elkfinance"
      ]
  },
  {
      "symbol": "MGN",
      "name": "Mugen Finance",
      "address": "0xFc77b86F3ADe71793E1EEc1E7944DB074922856e",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/27340/thumb/Group_2915.jpg?1663549948",
      "coingeckoId": "mugen-finance",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "UNI",
      "name": "Uniswap",
      "address": "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x1f9840a85d5af5bf1d1762f925bdaddc4201f984.png",
      "coingeckoId": "uniswap",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "USDC",
      "name": "USD Coin",
      "address": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      "decimals": 6,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png",
      "coingeckoId": "usd-coin",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance",
          "xyfinance",
          "elkfinance"
      ]
  },
  {
      "symbol": "MIM",
      "name": "Magic Internet Money",
      "address": "0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a.png",
      "coingeckoId": "magic-internet-money",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "rubic",
          "lifinance",
          "xyfinance"
      ]
  },
  {
      "symbol": "sSPELL",
      "name": "Staked Spell Token",
      "address": "0xF7428FFCb2581A2804998eFbB036A43255c8A8D3",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/logos/main/network/arbitrum/0xF7428FFCb2581A2804998eFbB036A43255c8A8D3.jpg",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "lifinance"
      ]
  },
  {
      "symbol": "HDX",
      "name": "Hydranet",
      "address": "0xF4fe727C855c2D395852ca43F645caB4b504Af23",
      "decimals": 9,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/25177/thumb/HDXdarkblueInv.png?1652694650",
      "coingeckoId": "hydranet",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "MNTO",
      "name": "Minato",
      "address": "0xF0DFAD1817b5ba73726B02Ab34dd4B4B00bcD392",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/24622/thumb/MNTO_200x200.png?1648448664",
      "coingeckoId": "minato",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "DUSD",
      "name": "DigitalDollar",
      "address": "0xF0B5cEeFc89684889e5F7e0A7775Bd100FcD3709",
      "decimals": 6,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/ethereum/assets/0xF0B5cEeFc89684889e5F7e0A7775Bd100FcD3709/logo.png",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "XTK",
      "name": "xToken",
      "address": "0xF0A5717Ec0883eE56438932b0fe4A20822735fBa",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/14089/thumb/xToken.png?1614226407",
      "coingeckoId": "xtoken",
      "listedIn": [
          "coingecko",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "O3",
      "name": "O3 Swap",
      "address": "0xEe9801669C6138E84bD50dEB500827b776777d28",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/arbitrum/assets/0xEe9801669C6138E84bD50dEB500827b776777d28/logo.png",
      "coingeckoId": "o3-swap",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "WMEMO",
      "name": "Wonderful Memories",
      "address": "0xECf2ADafF1De8A512f6e8bfe67a2C836EDb25Da3",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/22392/thumb/wMEMO.png?1665832927",
      "coingeckoId": "wrapped-memory",
      "listedIn": [
          "coingecko",
          "lifinance"
      ]
  },
  {
      "symbol": "FOREX",
      "name": "handle fi",
      "address": "0xDb298285FE4C5410B05390cA80e8Fbe9DE1F259B",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/18533/thumb/handle.fiFOREXLogoDark200x200.png?1632755675",
      "coingeckoId": "handle-fi",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "DAI",
      "name": "Dai",
      "address": "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png",
      "coingeckoId": "dai",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance",
          "xyfinance",
          "elkfinance"
      ]
  },
  {
      "symbol": "USDS",
      "name": "Sperax USD",
      "address": "0xD74f5255D557944cf7Dd0E45FF521520002D5748",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xd74f5255d557944cf7dd0e45ff521520002d5748.png",
      "coingeckoId": "sperax-usd",
      "listedIn": [
          "coingecko",
          "1inch",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "ICE",
      "name": "Ice Token",
      "address": "0xCB58418Aa51Ba525aEF0FE474109C0354d844b7c",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/logos/main/network/arbitrum/0xCB58418Aa51Ba525aEF0FE474109C0354d844b7c.jpg",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "lifinance"
      ]
  },
  {
      "symbol": "MYC",
      "name": "Mycelium",
      "address": "0xC74fE4c715510Ec2F8C61d70D397B32043F55Abe",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xc74fe4c715510ec2f8c61d70d397b32043f55abe.png",
      "coingeckoId": "mycelium",
      "listedIn": [
          "coingecko",
          "1inch",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "OSEA",
      "name": "Omnisea",
      "address": "0xC72633F995e98Ac3BB8a89e6a9C4Af335C3D6E44",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/26475/thumb/293837892_407994084681555_3167689470652146992_n.png?1658195766",
      "coingeckoId": "omnisea",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "DXD",
      "name": "DXdao",
      "address": "0xC3Ae0333F0F34aa734D5493276223d95B8F9Cb37",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xa1d65e8fb6e87b60feccbc582f7f97804b725521.png",
      "coingeckoId": "dxdao",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "BADGER",
      "name": "Badger DAO",
      "address": "0xBfa641051Ba0a0Ad1b0AcF549a89536A0D76472E",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x3472a5a71965499acd81997a54bba8d852c6e53d.png",
      "coingeckoId": "badger-dao",
      "listedIn": [
          "coingecko",
          "1inch",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "FUSE",
      "name": "Fuse Token",
      "address": "0xBDeF0E9ef12E689F366fe494A7A7D0dad25D9286",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/10347/thumb/vUXKHEe.png?1601523640",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "NDX",
      "name": "Indexed Finance",
      "address": "0xB965029343D55189c25a7f3e0c9394DC0F5D41b1",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/13546/thumb/indexed-light.74bb5471.png?1609712728",
      "coingeckoId": "indexed-finance",
      "listedIn": [
          "coingecko",
          "arbitrum_bridge",
          "rubic"
      ]
  },
  {
      "symbol": "BRC",
      "name": "Brinc Finance",
      "address": "0xB5de3f06aF62D8428a8BF7b4400Ea42aD2E0bc53",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/26116/thumb/76469697.png?1655937532",
      "coingeckoId": "brinc-finance",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "IMO",
      "name": "Ideamarket",
      "address": "0xB41bd4C99dA73510d9e081C5FADBE7A27Ac1F814",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/arbitrum/assets/0xB41bd4C99dA73510d9e081C5FADBE7A27Ac1F814/logo.png",
      "coingeckoId": "ideamarket",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "BUCK",
      "name": "Arbucks",
      "address": "0xAFD871f684F21Ab9D7137608C71808f83D75e6fc",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/arbitrum/assets/0xAFD871f684F21Ab9D7137608C71808f83D75e6fc/logo.png",
      "coingeckoId": "arbucks",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "DEGEN",
      "name": "DEGEN Index",
      "address": "0xAE6e3540E97b0b9EA8797B157B510e133afb6282",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/14143/thumb/alpha_logo.png?1614651244",
      "coingeckoId": "degen-index",
      "listedIn": [
          "coingecko",
          "arbitrum_bridge",
          "rubic"
      ]
  },
  {
      "symbol": "SUSD",
      "name": "sUSD",
      "address": "0xA970AF1a584579B618be4d69aD6F73459D112F95",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/5013/thumb/sUSD.png?1616150765",
      "coingeckoId": "nusd",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "DVF",
      "name": "Rhino fi",
      "address": "0xA7Aa2921618e3D63dA433829d448b58C9445A4c3",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://etherscan.io/token/images/dvf_32.png",
      "coingeckoId": "rhinofi",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "TCR",
      "name": "Tracer DAO",
      "address": "0xA72159FC390f0E3C6D415e658264c7c4051E9b87",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/18271/thumb/tracer_logo.png?1631176676",
      "coingeckoId": "tracer-dao",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "WCHI",
      "name": "Wrapped CHI",
      "address": "0xA64eCCe74F8CdB7a940766B71f1b108BAC69851a",
      "decimals": 8,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/2091/thumb/xaya_logo-1.png?1547036406",
      "coingeckoId": null,
      "listedIn": [
          "arbitrum_bridge",
          "rubic"
      ]
  },
  {
      "symbol": "ARVAULT",
      "name": "ArVault",
      "address": "0xA6219B4Bf4B861A2b1C02da43b2aF266186eDC04",
      "decimals": 9,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/arbitrum/assets/0xA6219B4Bf4B861A2b1C02da43b2aF266186eDC04/logo.png",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "lifinance"
      ]
  },
  {
      "symbol": "ARBIS",
      "name": "Arbis Finance",
      "address": "0x9f20de1fc9b161b34089cbEAE888168B44b03461",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/arbitrum/assets/0x9f20de1fc9b161b34089cbEAE888168B44b03461/logo.png",
      "coingeckoId": "arbis-finance",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "XDO",
      "name": "xDollar",
      "address": "0x9eF758aC000a354479e538B8b2f01b917b8e89e7",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cloudstorage.openocean.finance/images/1637831645816_6024340081244819.png",
      "coingeckoId": null,
      "listedIn": [
          "openocean",
          "lifinance"
      ]
  },
  {
      "symbol": "ASCEND",
      "name": "Ascension Protocol",
      "address": "0x9e724698051DA34994F281bD81C3E7372d1960AE",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/16019/thumb/icon200.png?1622612188",
      "coingeckoId": "ascension-protocol",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "FXS",
      "name": "Frax Share",
      "address": "0x9d2F299715D94d8A7E6F5eaa8E654E8c74a988A7",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cloudstorage.openocean.finance/images/1648904710979_811680259074864.png",
      "coingeckoId": "frax-share",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "IMX",
      "name": "Impermax  OLD ",
      "address": "0x9c67eE39e3C4954396b9142010653F17257dd39C",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://etherscan.io/token/images/impermax_32.png",
      "coingeckoId": "impermax",
      "listedIn": [
          "coingecko",
          "arbitrum_bridge",
          "rubic"
      ]
  },
  {
      "symbol": "ALN",
      "name": "Aluna",
      "address": "0x9b3fa2A7C3EB36d048A5d38d81E7fAFC6bc47B25",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/14379/thumb/uaLoLU8c_400x400_%281%29.png?1627873106",
      "coingeckoId": "aluna",
      "listedIn": [
          "coingecko",
          "arbitrum_bridge",
          "rubic"
      ]
  },
  {
      "symbol": "MULTI",
      "name": "Multichain",
      "address": "0x9Fb9a33956351cf4fa040f65A13b835A3C8764E3",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/22087/thumb/1_Wyot-SDGZuxbjdkaOeT2-A.png?1640764238",
      "coingeckoId": "multichain",
      "listedIn": [
          "coingecko",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "MATH",
      "name": "MATH",
      "address": "0x99F40b01BA9C469193B360f72740E416B17Ac332",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x08d967bb0134f2d07f7cfb6e246680c53927dd30.png",
      "coingeckoId": "math",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "BIFI",
      "name": "Beefy Finance",
      "address": "0x99C409E5f62E4bd2AC142f17caFb6810B8F0BAAE",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/arbitrum/assets/0x99C409E5f62E4bd2AC142f17caFb6810B8F0BAAE/logo.png",
      "coingeckoId": "beefy-finance",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "VISR",
      "name": "Visor",
      "address": "0x995C235521820f2637303Ca1970c7c044583df44",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/14381/thumb/visor_logo.png?1615782828",
      "coingeckoId": "visor",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "EUX",
      "name": "dForce EUR",
      "address": "0x969131D8ddC06C2Be11a13e6E7fACF22CF57d95e",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://etherscan.io/token/images/dforceeur_32.png",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "PICKLE",
      "name": "Pickle Finance",
      "address": "0x965772e0E9c84b6f359c8597C891108DcF1c5B1A",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://etherscan.io/token/images/pickle_32.png",
      "coingeckoId": "pickle-finance",
      "listedIn": [
          "coingecko",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "SWPR",
      "name": "Swapr",
      "address": "0x955b9fe60a5b5093df9Dc4B1B18ec8e934e77162",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/icons/master/token/swpr.jpg",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "lifinance"
      ]
  },
  {
      "symbol": "LIQD",
      "name": "Liquid Finance",
      "address": "0x93C15cd7DE26f07265f0272E0b831C5D7fAb174f",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x93c15cd7de26f07265f0272e0b831c5d7fab174f.png",
      "coingeckoId": "liquid-finance",
      "listedIn": [
          "coingecko",
          "1inch",
          "lifinance"
      ]
  },
  {
      "symbol": "MAGNET",
      "name": "Magnethereum",
      "address": "0x8eD4191F81F1e1D24a8a1195267D024d9358c9d7",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/Magnethereum/MyFiles/main/magnethereum.jpg",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "lifinance"
      ]
  },
  {
      "symbol": "AMY",
      "name": "Amy Finance Token",
      "address": "0x8Fbd420956FDD301f4493500fd0BCaAa80f2389C",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cloudstorage.openocean.finance/images/1637893005424_2740901520185888.png",
      "coingeckoId": null,
      "listedIn": [
          "openocean",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "NITRODOGE",
      "name": "nitroDOGE",
      "address": "0x8E75DafEcf75de7747A05B0891177ba03333a166",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/27161/thumb/nitrodoge_2.png?1662280112",
      "coingeckoId": "nitrodoge",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "GOHM",
      "name": "Governance OHM",
      "address": "0x8D9bA570D6cb60C7e3e0F31343Efe75AB8E65FB1",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/21129/small/token_wsOHM_logo.png?1638764900",
      "coingeckoId": "governance-ohm",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "lifinance",
          "xyfinance"
      ]
  },
  {
      "symbol": "FLUID",
      "name": "FluidFi",
      "address": "0x876Ec6bE52486Eeec06bc06434f3E629D695c6bA",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/ethereum/assets/0x876Ec6bE52486Eeec06bc06434f3E629D695c6bA/logo.png",
      "coingeckoId": "fluidfi",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "OMIC",
      "name": "Omicron",
      "address": "0x86b3353387F560295a8Fa7902679735E5f076Bd5",
      "decimals": 9,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/19954/thumb/YHCCP1e.png?1636339997",
      "coingeckoId": "omicron",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "ARBYS",
      "name": "Arbys",
      "address": "0x86A1012d437BBFf84fbDF62569D12d4FD3396F8c",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/arbitrum/assets/0x86A1012d437BBFf84fbDF62569D12d4FD3396F8c/logo.png",
      "coingeckoId": "arbys",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "FXUSD",
      "name": "handleUSD",
      "address": "0x8616E8EA83f048ab9A5eC513c9412Dd2993bcE3F",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/26954/thumb/fxUSDLogo_200px-200px.png?1660988882",
      "coingeckoId": "handleusd",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "AGVE",
      "name": "Agave",
      "address": "0x848e0BA28B637e8490D88BaE51fA99C87116409B",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/14146/thumb/agve.png?1614659384",
      "coingeckoId": "agave-token",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "YFI",
      "name": "yearn finance",
      "address": "0x82e3A8F066a6989666b031d916c43672085b1582",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cryptologos.cc/logos/yearn-finance-yfi-logo.png",
      "coingeckoId": "yearn-finance",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "WETH",
      "name": "WETH",
      "address": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png",
      "coingeckoId": "weth",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance",
          "xyfinance",
          "elkfinance"
      ]
  },
  {
      "symbol": "ADAI",
      "name": "Aave DAI",
      "address": "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/14242/thumb/aDAI.84b6c41f.png?1615528749",
      "coingeckoId": "aave-dai",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "CVOL",
      "name": "Crypto Volatility",
      "address": "0x8096aD3107715747361acefE685943bFB427C722",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/24008/thumb/govi-dao.03ef3083.png?1646029661",
      "coingeckoId": "crypto-volatility-token",
      "listedIn": [
          "coingecko",
          "lifinance"
      ]
  },
  {
      "symbol": "DHT",
      "name": "dHEDGE DAO",
      "address": "0x8038F3C971414FD1FC220bA727F2D4A0fC98cb65",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xca1207647ff814039530d7d35df0e1dd2e91fa84.png",
      "coingeckoId": "dhedge-dao",
      "listedIn": [
          "coingecko",
          "1inch",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "0XBTC",
      "name": "0xBitcoin",
      "address": "0x7cb16cb78ea464aD35c8a50ABF95dff3c9e09d5d",
      "decimals": 8,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/4454/thumb/0xbtc.png?1561603765",
      "coingeckoId": "oxbitcoin",
      "listedIn": [
          "coingecko",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "SDT",
      "name": "Stake DAO",
      "address": "0x7bA4a00d54A07461D9DB2aEF539e91409943AdC9",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/13724/thumb/stakedao_logo.jpg?1611195011",
      "coingeckoId": "stake-dao",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "PPEGG",
      "name": "Parrot Egg",
      "address": "0x78055dAA07035Aa5EBC3e5139C281Ce6312E1b22",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/arbitrum/assets/0x78055dAA07035Aa5EBC3e5139C281Ce6312E1b22/logo.png",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "lifinance"
      ]
  },
  {
      "symbol": "DEUSDC",
      "name": "deUSDC",
      "address": "0x76b44e0Cf9bD024dbEd09E1785DF295D59770138",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/26669/thumb/deUSDC.png?1659509853",
      "coingeckoId": "deusdc",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "SDL",
      "name": "Saddle Finance",
      "address": "0x75C9bC761d88f70156DAf83aa010E84680baF131",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x75c9bc761d88f70156daf83aa010e84680baf131.png",
      "coingeckoId": "saddle-finance",
      "listedIn": [
          "coingecko",
          "1inch",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "PERP",
      "name": "Perpetual",
      "address": "0x753D224bCf9AAFaCD81558c32341416df61D3DAC",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/12381/thumb/60d18e06844a844ad75901a9_mark_only_03.png?1628674771",
      "coingeckoId": null,
      "listedIn": [
          "arbitrum_bridge",
          "lifinance"
      ]
  },
  {
      "symbol": "BSGG",
      "name": "BETSWAP.GG",
      "address": "0x750bfe8490175c2A9A9387b19Aa2AaE2d75dB638",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://s2.coinmarketcap.com/static/img/coins/64x64/17169.png",
      "coingeckoId": null,
      "listedIn": [
          "RouterProtocol",
          "lifinance"
      ]
  },
  {
      "symbol": "wsOHM",
      "name": "Wrapped sOHM",
      "address": "0x739ca6D71365a08f584c8FC4e1029045Fa8ABC4B",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x739ca6d71365a08f584c8fc4e1029045fa8abc4b.png",
      "coingeckoId": null,
      "listedIn": [
          "1inch",
          "sushiswap",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "AUSDT",
      "name": "Aave USDT",
      "address": "0x6ab707Aca953eDAeFBc4fD23bA73294241490620",
      "decimals": 6,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/14243/thumb/aUSDT.78f5faae.png?1615528400",
      "coingeckoId": "aave-usdt",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "CNFI",
      "name": "Connect Financial",
      "address": "0x6F5401c53e2769c858665621d22DDBF53D8d27c5",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/13592/thumb/cf-logo-iconic-black.png?1644479524",
      "coingeckoId": "connect-financial",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "DPX",
      "name": "Dopex",
      "address": "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x6c2c06790b3e3e3c38e12ee22f8183b37a13ee55.png",
      "coingeckoId": "dopex",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance",
          "xyfinance"
      ]
  },
  {
      "symbol": "L2PAD",
      "name": "L2PAD",
      "address": "0x6Ba4edd6dB54eD34d53D8d8883E599C4dba009fb",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/23694/thumb/l2pad_200x200.png?1645080419",
      "coingeckoId": "l2pad",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "DODO",
      "name": "DODO",
      "address": "0x69Eb4FA4a2fbd498C257C57Ea8b7655a2559A581",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://etherscan.io/token/images/dodo_32.png",
      "coingeckoId": "dodo",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "POP",
      "name": "Popcorn",
      "address": "0x68eAd55C258d6fa5e46D67fc90f53211Eab885BE",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/21438/thumb/pop-1_200_x_200.png?1662607611",
      "coingeckoId": "popcorn",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "STG",
      "name": "Stargate Finance",
      "address": "0x6694340fc020c5E6B96567843da2df01b2CE1eb6",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x6694340fc020c5e6b96567843da2df01b2ce1eb6.png",
      "coingeckoId": "stargate-finance",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "VST",
      "name": "Vesta Stable",
      "address": "0x64343594Ab9b56e99087BfA6F2335Db24c2d1F17",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x64343594ab9b56e99087bfa6f2335db24c2d1f17.png",
      "coingeckoId": "vesta-stable",
      "listedIn": [
          "coingecko",
          "1inch",
          "openocean",
          "lifinance"
      ]
  },
  {
      "symbol": "USX",
      "name": "dForce USD",
      "address": "0x641441c631e2F909700d2f41FD87F0aA6A6b4EDb",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/17422/thumb/usx_32.png?1627600920",
      "coingeckoId": "token-dforce-usd",
      "listedIn": [
          "coingecko",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "AUSDC",
      "name": "Aave USDC",
      "address": "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
      "decimals": 6,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/14318/thumb/aUSDC.e260d492.png?1615527797",
      "coingeckoId": "aave-usdc",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "WSTETH",
      "name": "Wrapped stETH",
      "address": "0x5979D7b546E38E414F7E9822514be443A4800529",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x5979d7b546e38e414f7e9822514be443a4800529.png",
      "coingeckoId": "wrapped-steth",
      "listedIn": [
          "coingecko",
          "1inch",
          "openocean",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "GMX",
      "name": "GMX",
      "address": "0x590020B1005b8b25f1a2C82c5f743c540dcfa24d",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": null,
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "arbitrum_bridge",
          "lifinance"
      ]
  },
  {
      "symbol": "QSD",
      "name": "QIAN Second Generation Dollar",
      "address": "0x5837d843D49ffdefC78Fe09B5F371427c917946F",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/17985/thumb/QSD_.png?1630029729",
      "coingeckoId": "qian-second-generation-dollar",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "KROM",
      "name": "Kromatika",
      "address": "0x55fF62567f09906A85183b866dF84bf599a4bf70",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/20541/thumb/KROM_Transparent.png?1641398421",
      "coingeckoId": "kromatika",
      "listedIn": [
          "coingecko",
          "lifinance"
      ]
  },
  {
      "symbol": "SPA",
      "name": "Sperax",
      "address": "0x5575552988A3A80504bBaeB1311674fCFd40aD4B",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": null,
      "coingeckoId": "sperax",
      "listedIn": [
          "coingecko",
          "arbitrum_bridge",
          "rubic"
      ]
  },
  {
      "symbol": "OVR",
      "name": "OVR",
      "address": "0x55704A0e9E2eb59E176C5b69655DbD3DCDCFc0F0",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/13429/thumb/ovr_logo.png?1608518911",
      "coingeckoId": null,
      "listedIn": [
          "arbitrum_bridge",
          "rubic"
      ]
  },
  {
      "symbol": "MAGIC",
      "name": "Magic",
      "address": "0x539bdE0d7Dbd336b79148AA742883198BBF60342",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/18623/small/Magic.png?1635755672",
      "coingeckoId": "magic",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance",
          "xyfinance"
      ]
  },
  {
      "symbol": "MTA",
      "name": "Meta",
      "address": "0x5298Ee77A8f9E226898403eBAC33e68a62F770A0",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/11846/thumb/mStable.png?1594950533",
      "coingeckoId": null,
      "listedIn": [
          "arbitrum_bridge",
          "rubic"
      ]
  },
  {
      "symbol": "PREMIA",
      "name": "Premia",
      "address": "0x51fC0f6660482Ea73330E414eFd7808811a57Fa2",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x6399c842dd2be3de30bf99bc7d1bbf6fa3650e70.png",
      "coingeckoId": "premia",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "PLS",
      "name": "PlutusDAO",
      "address": "0x51318B7D00db7ACc4026C88c3952B66278B6A67F",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/25326/small/M6nUndNU_400x400.jpg?1651233987",
      "coingeckoId": "plutusdao",
      "listedIn": [
          "coingecko",
          "rubic",
          "lifinance",
          "xyfinance"
      ]
  },
  {
      "symbol": "MCB",
      "name": "MUX Protocol",
      "address": "0x4e352cF164E64ADCBad318C3a1e222E9EBa4Ce42",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x4e352cf164e64adcbad318c3a1e222e9eba4ce42.png",
      "coingeckoId": "mcdex",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "NISHIB",
      "name": "NitroShiba",
      "address": "0x4DAD357726b41bb8932764340ee9108cC5AD33a0",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/27288/thumb/nishib_logo.png?1663143249",
      "coingeckoId": "nitroshiba",
      "listedIn": [
          "coingecko",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "TUSD",
      "name": "TrueUSD",
      "address": "0x4D15a3A2286D883AF0AA1B3f21367843FAc63E07",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://images.prismic.io/tusd-homepage/fb4d581a-95ed-404c-b9de-7ab1365c1386_%E5%9B%BE%E5%B1%82+1.png",
      "coingeckoId": "true-usd",
      "listedIn": [
          "coingecko",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "FST",
      "name": "Futureswap",
      "address": "0x488cc08935458403a0458e45E20c0159c8AB2c92",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://etherscan.io/token/images/futureswap2_32.png",
      "coingeckoId": "futureswap",
      "listedIn": [
          "coingecko",
          "arbitrum_bridge",
          "rubic"
      ]
  },
  {
      "symbol": "LRC",
      "name": "Loopring",
      "address": "0x46d0cE7de6247b0A95f67b43B589b4041BaE7fbE",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cryptologos.cc/logos/loopring-lrc-logo.png",
      "coingeckoId": "loopring",
      "listedIn": [
          "coingecko",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "ETHRISE",
      "name": "ETHRISE",
      "address": "0x46D06cf8052eA6FdbF71736AF33eD23686eA1452",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/26761/thumb/ETHRISE.png?1660036893",
      "coingeckoId": "ethrise",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "DOG",
      "name": "The Doge NFT",
      "address": "0x4425742F1EC8D98779690b5A3A6276Db85Ddc01A",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://etherscan.io/token/images/thedogenft_32.png",
      "coingeckoId": "the-doge-nft",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "EVO",
      "name": "EVO",
      "address": "0x42006Ab57701251B580bDFc24778C43c9ff589A1",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/25088/large/evoToken.png?1650269135",
      "coingeckoId": null,
      "listedIn": [
          "dfyn",
          "RouterProtocol"
      ]
  },
  {
      "symbol": "CELR",
      "name": "Celer Network",
      "address": "0x3a8B787f78D775AECFEEa15706D4221B40F345AB",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/4379/thumb/Celr.png?1554705437",
      "coingeckoId": "celer-network",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "MIMATIC",
      "name": "MAI",
      "address": "0x3F56e0c36d275367b8C502090EDF38289b3dEa0d",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xa3fa99a148fa48d14ed51d610c367c61876997f1.png",
      "coingeckoId": "mimatic",
      "listedIn": [
          "coingecko",
          "RouterProtocol",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "SPELL",
      "name": "Spell",
      "address": "0x3E6648C5a70A150A88bCE65F4aD4d506Fe15d2AF",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x3e6648c5a70a150a88bce65f4ad4d506fe15d2af.png",
      "coingeckoId": "spell-token",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance",
          "xyfinance"
      ]
  },
  {
      "symbol": "LAND",
      "name": "Land",
      "address": "0x3CD1833Ce959E087D0eF0Cb45ed06BffE60F23Ba",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x9d986a3f147212327dd658f712d5264a73a1fdb0.png",
      "coingeckoId": null,
      "listedIn": [
          "1inch",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "ROOBEE",
      "name": "Roobee",
      "address": "0x3BD2dFd03BC7c3011ed7fb8c4d0949B382726cee",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/8791/thumb/Group_11.png?1580344629",
      "coingeckoId": "roobee",
      "listedIn": [
          "coingecko",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "PHONON",
      "name": "Phonon DAO",
      "address": "0x39A49bc5017Fc668299Cd32e734C9269aCc35295",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/22308/thumb/ezgif-2-e7fb84364d.png?1641449852",
      "coingeckoId": "phonon-dao",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "ZYX",
      "name": "ZYX",
      "address": "0x377c6E37633e390aEf9AFB4F5E0B16689351EeD4",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/11964/thumb/zyx.png?1596454904",
      "coingeckoId": "zyx",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "PANA",
      "name": "PANA DAO",
      "address": "0x369eB8197062093a20402935D3a707b4aE414E9D",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/27031/thumb/pana_logo.png?1661495937",
      "coingeckoId": "pana-dao",
      "listedIn": [
          "coingecko",
          "lifinance"
      ]
  },
  {
      "symbol": "PL2",
      "name": "Plenny",
      "address": "0x3642c0680329ae3e103E2B5AB29DDfed4d43CBE5",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": null,
      "coingeckoId": null,
      "listedIn": [
          "1inch",
          "sushiswap",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "COMP",
      "name": "Compound",
      "address": "0x354A6dA3fcde098F8389cad84b0182725c6C91dE",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xc00e94cb662c3520282e6f5717214004a7f26888.png",
      "coingeckoId": "compound-governance-token",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "XUSD",
      "name": "xDollar Stablecoin",
      "address": "0x3509f19581aFEDEff07c53592bc0Ca84e4855475",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cloudstorage.openocean.finance/images/1637892796159_3482286577377456.png",
      "coingeckoId": "xdollar-stablecoin",
      "listedIn": [
          "coingecko",
          "openocean",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "RDPX",
      "name": "Dopex Rebate",
      "address": "0x32Eb7902D4134bf98A28b963D26de779AF92A212",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/16659/small/rDPX_200x200_Coingecko.png?1624614475",
      "coingeckoId": "dopex-rebate-token",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance",
          "xyfinance"
      ]
  },
  {
      "symbol": "STRP",
      "name": "Strips Finance",
      "address": "0x326c33FD1113c1F29B35B4407F3d6312a8518431",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://etherscan.io/token/images/strips_32.png",
      "coingeckoId": "strips-finance",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "CTSI",
      "name": "Cartesi",
      "address": "0x319f865b287fCC10b30d8cE6144e8b6D1b476999",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://elk.finance/tokens/logos/arbitrum/0x319f865b287fCC10b30d8cE6144e8b6D1b476999/logo.png",
      "coingeckoId": "cartesi",
      "listedIn": [
          "coingecko",
          "rubic",
          "elkfinance"
      ]
  },
  {
      "symbol": "WBTC",
      "name": "Wrapped Bitcoin",
      "address": "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
      "decimals": 8,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png",
      "coingeckoId": "wrapped-bitcoin",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance",
          "xyfinance"
      ]
  },
  {
      "symbol": "MKR",
      "name": "Maker",
      "address": "0x2e9a6Df78E42a30712c10a9Dc4b1C8656f8F2879",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2.png",
      "coingeckoId": "maker",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "MAGIC",
      "name": "MagicLand",
      "address": "0x2c852D3334188BE136bFC540EF2bB8C37b590BAD",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/18844/thumb/logo_-_2021-10-07T141625.399.png?1633587397",
      "coingeckoId": "magic-token",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "L2DAO",
      "name": "Layer2DAO",
      "address": "0x2CaB3abfC1670D1a452dF502e216a66883cDf079",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/23699/thumb/Khp7Y4Sn.png?1645081048",
      "coingeckoId": "layer2dao",
      "listedIn": [
          "coingecko",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "STBZ",
      "name": "Stabilize",
      "address": "0x2C110867CA90e43D372C1C2E92990B00EA32818b",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/12753/thumb/icon.png?1608771101",
      "coingeckoId": "stabilize",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "GRT",
      "name": "The Graph",
      "address": "0x23A941036Ae778Ac51Ab04CEa08Ed6e2FE103614",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xc944e90c64b2c07662a292be6244bdf05cda44a7.png",
      "coingeckoId": "the-graph",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "FLUX",
      "name": "Flux Protocol",
      "address": "0x2338a5d62E9A766289934e8d2e83a443e8065b83",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cryptologos.cc/logos/zel-flux-logo.png",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "arbitrum_bridge",
          "lifinance"
      ]
  },
  {
      "symbol": "DERI",
      "name": "Deri Protocol",
      "address": "0x21E60EE73F17AC0A411ae5D690f908c3ED66Fe12",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/13931/thumb/200vs200.jpg?1627649443",
      "coingeckoId": "deri-protocol",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "deUSDC",
      "name": "deBridge USD Coin",
      "address": "0x1dDcaa4Ed761428ae348BEfC6718BCb12e63bFaa",
      "decimals": 6,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x1ddcaa4ed761428ae348befc6718bcb12e63bfaa_2.png",
      "coingeckoId": null,
      "listedIn": [
          "1inch",
          "openocean",
          "lifinance"
      ]
  },
  {
      "symbol": "aMoon",
      "name": "ArbiMoon",
      "address": "0x1a7BD9EDC36Fb2b3c0852bcD7438c2A957Fd7Ad5",
      "decimals": 9,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/ArbiMoonXyz/MyFiles/main/arbimoon.jpg",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "lifinance"
      ]
  },
  {
      "symbol": "NIFLOKI",
      "name": "NitroFloki",
      "address": "0x1FAe2A29940015632f2a6CE006dFA7E3225515A7",
      "decimals": 9,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/28038/thumb/nifloki.png?1667198797",
      "coingeckoId": "nitrofloki",
      "listedIn": [
          "coingecko",
          "lifinance"
      ]
  },
  {
      "symbol": "BFR",
      "name": "Buffer Token",
      "address": "0x1A5B0aaF478bf1FDA7b934c76E7692D722982a6D",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cloudstorage.openocean.finance/images/1668519619894_7648242062364901.jpg",
      "coingeckoId": "ibuffer-token",
      "listedIn": [
          "coingecko",
          "openocean",
          "rubic"
      ]
  },
  {
      "symbol": "ALINK",
      "name": "Aave LINK",
      "address": "0x191c10Aa4AF7C30e871E70C95dB0E4eb77237530",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/14315/thumb/aLINK.412c6589.png?1615527827",
      "coingeckoId": "aave-link",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "FRAX",
      "name": "Frax",
      "address": "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x17fc002b466eec40dae837fc4be5c67993ddbd6f.png",
      "coingeckoId": "frax",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "lifinance",
          "xyfinance"
      ]
  },
  {
      "symbol": "UMAMI",
      "name": "Umami",
      "address": "0x1622bF67e6e5747b81866fE0b85178a93C7F86e3",
      "decimals": 9,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/arbitrum/assets/0x1622bF67e6e5747b81866fE0b85178a93C7F86e3/logo.png",
      "coingeckoId": "umami-finance",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "ADOGE",
      "name": "ArbiDoge",
      "address": "0x155f0DD04424939368972f4e1838687d6a831151",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/icons/master/token/doge.jpg",
      "coingeckoId": "arbidoge",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "EMAX",
      "name": "EthereumMax",
      "address": "0x123389C2f0e9194d9bA98c21E63c375B67614108",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x123389c2f0e9194d9ba98c21e63c375b67614108.png",
      "coingeckoId": "ethereummax",
      "listedIn": [
          "coingecko",
          "1inch",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "CRV",
      "name": "Curve DAO",
      "address": "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xd533a949740bb3306d119cc777fa900ba034cd52.png",
      "coingeckoId": "curve-dao-token",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance",
          "elkfinance"
      ]
  },
  {
      "symbol": "PBTC",
      "name": "pTokens BTC",
      "address": "0x115D8bF0a53e751f8A472F88D587944EC1C8CA6D",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/25861/thumb/wMTpRljt_400x400.png?1654228097",
      "coingeckoId": "ptokens-btc-2",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "JONES",
      "name": "Jones DAO",
      "address": "0x10393c20975cF177a3513071bC110f7962CD67da",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/23290/small/3c8c2ed8-afb3-4b67-9937-5493acd88b50.jpg?1648597625",
      "coingeckoId": "jones-dao",
      "listedIn": [
          "coingecko",
          "openocean",
          "rubic",
          "lifinance",
          "xyfinance"
      ]
  },
  {
      "symbol": "HND",
      "name": "Hundred Finance",
      "address": "0x10010078a54396F62c96dF8532dc2B4847d47ED3",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cloudstorage.openocean.finance/images/1637892347363_6124669428880605.png",
      "coingeckoId": "hundred-finance",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "ALCH",
      "name": "Alchemy",
      "address": "0x0e15258734300290a651FdBAe8dEb039a8E7a2FA",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/14719/thumb/sbEW5W8.png?1617939648",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "ZIPT",
      "name": "Zippie",
      "address": "0x0F61B24272AF65EACF6adFe507028957698e032F",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xedd7c94fd7b4971b916d15067bc454b9e1bad980.png",
      "coingeckoId": null,
      "listedIn": [
          "1inch",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "BOND",
      "name": "BarnBridge Governance Token",
      "address": "0x0D81E50bC677fa67341c44D7eaA9228DEE64A4e1",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cryptologos.cc/logos/barnbridge-bond-logo.png",
      "coingeckoId": null,
      "listedIn": [
          "arbitrum_bridge",
          "rubic"
      ]
  },
  {
      "symbol": "RDNT",
      "name": "Radiant Capital",
      "address": "0x0C4681e6C0235179ec3D4F4fc4DF3d14FDD96017",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0x0c4681e6c0235179ec3d4f4fc4df3d14fdd96017.png",
      "coingeckoId": "radiant-capital",
      "listedIn": [
          "coingecko",
          "1inch",
          "openocean",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "IUSD",
      "name": "iZUMi Bond USD",
      "address": "0x0A3BB08b3a15A19b4De82F8AcFc862606FB69A2D",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/25388/thumb/iusd-logo-symbol-10k%E5%A4%A7%E5%B0%8F.png?1651660620",
      "coingeckoId": "izumi-bond-usd",
      "listedIn": [
          "coingecko",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "ARBY",
      "name": "Adamant Token",
      "address": "0x09ad12552ec45f82bE90B38dFE7b06332A680864",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://raw.githubusercontent.com/sushiswap/assets/master/blockchains/arbitrum/assets/0x09ad12552ec45f82bE90B38dFE7b06332A680864/logo.png",
      "coingeckoId": null,
      "listedIn": [
          "sushiswap",
          "lifinance"
      ]
  },
  {
      "symbol": "SYN",
      "name": "Synapse",
      "address": "0x080F6AEd32Fc474DD5717105Dba5ea57268F46eb",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/18024/thumb/synapse_social_icon.png?1663921797",
      "coingeckoId": "synapse-2",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "GOVI",
      "name": "GOVI",
      "address": "0x07E49d5dE43DDA6162Fa28D24d5935C151875283",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/13875/thumb/GOVI.png?1612451531",
      "coingeckoId": null,
      "listedIn": [
          "arbitrum_bridge",
          "lifinance"
      ]
  },
  {
      "symbol": "QSD",
      "name": " QIAN second generation dollar",
      "address": "0x07AaA29E63FFEB2EBf59B33eE61437E1a91A3bb2",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://cloudstorage.openocean.finance/images/1637832211908_8528681646600584.png",
      "coingeckoId": null,
      "listedIn": [
          "openocean",
          "lifinance"
      ]
  },
  {
      "symbol": "AWBTC",
      "name": "Aave WBTC",
      "address": "0x078f358208685046a11C85e8ad32895DED33A249",
      "decimals": 8,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/14244/thumb/aWBTC.41453c2a.png?1615528721",
      "coingeckoId": "aave-wbtc",
      "listedIn": [
          "coingecko",
          "rubic"
      ]
  },
  {
      "symbol": "KUN",
      "name": "Chemix Ecology Governance",
      "address": "0x04cb2d263a7489f02d813eaaB9Ba1bb8466347F2",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/13177/thumb/kun_logo.png?1605923919",
      "coingeckoId": "chemix-ecology-governance-token",
      "listedIn": [
          "coingecko",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "BAL",
      "name": "Balancer",
      "address": "0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xba100000625a3754423978a60c9317c58a424e3d.png",
      "coingeckoId": "balancer",
      "listedIn": [
          "coingecko",
          "1inch",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "AGVE",
      "name": "Agave",
      "address": "0x03b95f1C84Af0607afd5dD87ca1FDE7572aa827F",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://elk.finance/tokens/logos/arbitrum/0x03b95f1C84Af0607afd5dD87ca1FDE7572aa827F/logo.png",
      "coingeckoId": null,
      "listedIn": [
          "arbitrum_bridge",
          "elkfinance"
      ]
  },
  {
      "symbol": "CAP",
      "name": "Cap",
      "address": "0x031d35296154279DC1984dCD93E392b1f946737b",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://assets.coingecko.com/coins/images/11775/thumb/CAP.png?1594083244",
      "coingeckoId": "cap",
      "listedIn": [
          "coingecko",
          "sushiswap",
          "openocean",
          "arbitrum_bridge",
          "rubic",
          "lifinance"
      ]
  },
  {
      "symbol": "ETH",
      "name": "Ethereum",
      "address": "0x0000000000000000000000000000000000000000",
      "decimals": 18,
      "chainId": 42161,
      "logoURI": "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png",
      "coingeckoId": "ethereum",
      "listedIn": [
          "1inch",
          "openocean",
          "rubic",
          "lifinance",
          "xyfinance"
      ]
  }
];
// jsut for refence
export const baseTokens =[
  {
    "token": "GMX",
    "address": "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "TLPT",
    "address": "0xfaC38532829fDD744373fdcd4708Ab90fA0c4078",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "CARBON",
    "address": "0xfa42DA1bd08341537a44a4ca9D236D1c00A98b40",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "LINK",
    "address": "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "CREAM",
    "address": "0xf4D48Ce3ee1Ac3651998971541bAdbb9A14D7234",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "RGT",
    "address": "0xef888bcA6AB6B1d26dbeC977C455388ecd794794",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ACRV",
    "address": "0xebf1F92D4384118bFb91B4496660a95931c92861",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "AUC",
    "address": "0xea986d33eF8a20A96120ecc44dBdD49830192043",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ELK",
    "address": "0xeEeEEb57642040bE42185f49C52F7E9B38f8eeeE",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "NYAN",
    "address": "0xeD3fB761414DA74b74F33e5c5a1f78104b188DfC",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "AWETH",
    "address": "0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ALTA",
    "address": "0xe0cCa86B254005889aC3a81e737f56a14f4A38F5",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DEFI5",
    "address": "0xdeBa25AF35e4097146d7629055E0EC3C71706324",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "KSW",
    "address": "0xdc7179416c08c15f689d9214A3BeC2Dd003DeABc",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "Z2O",
    "address": "0xdb96f8efd6865644993505318cc08FF9C42fb9aC",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "SWPR",
    "address": "0xdE903E2712288A1dA82942DDdF2c20529565aC30",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "HONEY",
    "address": "0xdE31e75182276738B0c025daa8F80020A4F2fbFE",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "SUSHI",
    "address": "0xd4d42F0b6DEF4CE0383636770eF773390d85c61A",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DBL",
    "address": "0xd3f1Da62CAFB7E7BC6531FF1ceF6F414291F03D3",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "USX",
    "address": "0xcd14C3A2ba27819B352aae73414A26e2b366dC50",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "NFTI",
    "address": "0xcFe3FBc98D80f7Eca0bC76cD1F406A19dD425896",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "WOO",
    "address": "0xcAFcD85D8ca7Ad1e1C6F82F651fA15E33AEfD07b",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "deETH",
    "address": "0xcAB86F6Fb6d1C2cBeeB97854A0C023446A075Fe3",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "NFD",
    "address": "0xc9c2B86CD4cdbAB70cd65D22EB044574c3539F6c",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "HOP",
    "address": "0xc5102fE9359FD9a28f877a67E36B0F050d81a3CC",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "CREDA",
    "address": "0xc136E6B376a9946B156db1ED3A34b08AFdAeD76d",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "RAI",
    "address": "0xaeF5bbcbFa438519a5ea80B4c7181B4E78d419f2",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MATTER",
    "address": "0xaaA62D9584Cbe8e4D68A43ec91BfF4fF1fAdB202",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DF",
    "address": "0xaE6aab43C4f3E0cea4Ab83752C278f8dEbabA689",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "TNGL",
    "address": "0xa943F863fA69ff4F6D9022843Fb861BBEe45B2ce",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "VSTA",
    "address": "0xa684cd057951541187f288294a1e1C2646aA2d24",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "LYS",
    "address": "0xa4f595Ba35161c9fFE3db8c03991B9C2CBB26C6b",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "GNO",
    "address": "0xa0b862F60edEf4452F25B4160F177db44DeB6Cf1",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "USDT",
    "address": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MGN",
    "address": "0xFc77b86F3ADe71793E1EEc1E7944DB074922856e",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "UNI",
    "address": "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "USDC",
    "address": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MIM",
    "address": "0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "sSPELL",
    "address": "0xF7428FFCb2581A2804998eFbB036A43255c8A8D3",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "HDX",
    "address": "0xF4fe727C855c2D395852ca43F645caB4b504Af23",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MNTO",
    "address": "0xF0DFAD1817b5ba73726B02Ab34dd4B4B00bcD392",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DUSD",
    "address": "0xF0B5cEeFc89684889e5F7e0A7775Bd100FcD3709",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "XTK",
    "address": "0xF0A5717Ec0883eE56438932b0fe4A20822735fBa",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "O3",
    "address": "0xEe9801669C6138E84bD50dEB500827b776777d28",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "WMEMO",
    "address": "0xECf2ADafF1De8A512f6e8bfe67a2C836EDb25Da3",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "FOREX",
    "address": "0xDb298285FE4C5410B05390cA80e8Fbe9DE1F259B",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DAI",
    "address": "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "USDS",
    "address": "0xD74f5255D557944cf7Dd0E45FF521520002D5748",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ICE",
    "address": "0xCB58418Aa51Ba525aEF0FE474109C0354d844b7c",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MYC",
    "address": "0xC74fE4c715510Ec2F8C61d70D397B32043F55Abe",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "OSEA",
    "address": "0xC72633F995e98Ac3BB8a89e6a9C4Af335C3D6E44",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DXD",
    "address": "0xC3Ae0333F0F34aa734D5493276223d95B8F9Cb37",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "BADGER",
    "address": "0xBfa641051Ba0a0Ad1b0AcF549a89536A0D76472E",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "FUSE",
    "address": "0xBDeF0E9ef12E689F366fe494A7A7D0dad25D9286",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "NDX",
    "address": "0xB965029343D55189c25a7f3e0c9394DC0F5D41b1",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "BRC",
    "address": "0xB5de3f06aF62D8428a8BF7b4400Ea42aD2E0bc53",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "IMO",
    "address": "0xB41bd4C99dA73510d9e081C5FADBE7A27Ac1F814",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "BUCK",
    "address": "0xAFD871f684F21Ab9D7137608C71808f83D75e6fc",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DEGEN",
    "address": "0xAE6e3540E97b0b9EA8797B157B510e133afb6282",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "SUSD",
    "address": "0xA970AF1a584579B618be4d69aD6F73459D112F95",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DVF",
    "address": "0xA7Aa2921618e3D63dA433829d448b58C9445A4c3",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "TCR",
    "address": "0xA72159FC390f0E3C6D415e658264c7c4051E9b87",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "WCHI",
    "address": "0xA64eCCe74F8CdB7a940766B71f1b108BAC69851a",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ARVAULT",
    "address": "0xA6219B4Bf4B861A2b1C02da43b2aF266186eDC04",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ARBIS",
    "address": "0x9f20de1fc9b161b34089cbEAE888168B44b03461",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "XDO",
    "address": "0x9eF758aC000a354479e538B8b2f01b917b8e89e7",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ASCEND",
    "address": "0x9e724698051DA34994F281bD81C3E7372d1960AE",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "FXS",
    "address": "0x9d2F299715D94d8A7E6F5eaa8E654E8c74a988A7",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "IMX",
    "address": "0x9c67eE39e3C4954396b9142010653F17257dd39C",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ALN",
    "address": "0x9b3fa2A7C3EB36d048A5d38d81E7fAFC6bc47B25",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MULTI",
    "address": "0x9Fb9a33956351cf4fa040f65A13b835A3C8764E3",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MATH",
    "address": "0x99F40b01BA9C469193B360f72740E416B17Ac332",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "BIFI",
    "address": "0x99C409E5f62E4bd2AC142f17caFb6810B8F0BAAE",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "VISR",
    "address": "0x995C235521820f2637303Ca1970c7c044583df44",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "EUX",
    "address": "0x969131D8ddC06C2Be11a13e6E7fACF22CF57d95e",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "PICKLE",
    "address": "0x965772e0E9c84b6f359c8597C891108DcF1c5B1A",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "SWPR",
    "address": "0x955b9fe60a5b5093df9Dc4B1B18ec8e934e77162",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "LIQD",
    "address": "0x93C15cd7DE26f07265f0272E0b831C5D7fAb174f",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MAGNET",
    "address": "0x8eD4191F81F1e1D24a8a1195267D024d9358c9d7",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "AMY",
    "address": "0x8Fbd420956FDD301f4493500fd0BCaAa80f2389C",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "NITRODOGE",
    "address": "0x8E75DafEcf75de7747A05B0891177ba03333a166",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "GOHM",
    "address": "0x8D9bA570D6cb60C7e3e0F31343Efe75AB8E65FB1",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "FLUID",
    "address": "0x876Ec6bE52486Eeec06bc06434f3E629D695c6bA",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "OMIC",
    "address": "0x86b3353387F560295a8Fa7902679735E5f076Bd5",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ARBYS",
    "address": "0x86A1012d437BBFf84fbDF62569D12d4FD3396F8c",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "FXUSD",
    "address": "0x8616E8EA83f048ab9A5eC513c9412Dd2993bcE3F",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "AGVE",
    "address": "0x848e0BA28B637e8490D88BaE51fA99C87116409B",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "YFI",
    "address": "0x82e3A8F066a6989666b031d916c43672085b1582",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "WETH",
    "address": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ADAI",
    "address": "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "CVOL",
    "address": "0x8096aD3107715747361acefE685943bFB427C722",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DHT",
    "address": "0x8038F3C971414FD1FC220bA727F2D4A0fC98cb65",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "0XBTC",
    "address": "0x7cb16cb78ea464aD35c8a50ABF95dff3c9e09d5d",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "SDT",
    "address": "0x7bA4a00d54A07461D9DB2aEF539e91409943AdC9",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "PPEGG",
    "address": "0x78055dAA07035Aa5EBC3e5139C281Ce6312E1b22",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DEUSDC",
    "address": "0x76b44e0Cf9bD024dbEd09E1785DF295D59770138",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "SDL",
    "address": "0x75C9bC761d88f70156DAf83aa010E84680baF131",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "PERP",
    "address": "0x753D224bCf9AAFaCD81558c32341416df61D3DAC",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "BSGG",
    "address": "0x750bfe8490175c2A9A9387b19Aa2AaE2d75dB638",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "wsOHM",
    "address": "0x739ca6D71365a08f584c8FC4e1029045Fa8ABC4B",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "AUSDT",
    "address": "0x6ab707Aca953eDAeFBc4fD23bA73294241490620",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "CNFI",
    "address": "0x6F5401c53e2769c858665621d22DDBF53D8d27c5",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DPX",
    "address": "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "L2PAD",
    "address": "0x6Ba4edd6dB54eD34d53D8d8883E599C4dba009fb",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DODO",
    "address": "0x69Eb4FA4a2fbd498C257C57Ea8b7655a2559A581",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "POP",
    "address": "0x68eAd55C258d6fa5e46D67fc90f53211Eab885BE",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "STG",
    "address": "0x6694340fc020c5E6B96567843da2df01b2CE1eb6",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "VST",
    "address": "0x64343594Ab9b56e99087BfA6F2335Db24c2d1F17",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "USX",
    "address": "0x641441c631e2F909700d2f41FD87F0aA6A6b4EDb",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "AUSDC",
    "address": "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "WSTETH",
    "address": "0x5979D7b546E38E414F7E9822514be443A4800529",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "GMX",
    "address": "0x590020B1005b8b25f1a2C82c5f743c540dcfa24d",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "QSD",
    "address": "0x5837d843D49ffdefC78Fe09B5F371427c917946F",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "KROM",
    "address": "0x55fF62567f09906A85183b866dF84bf599a4bf70",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "SPA",
    "address": "0x5575552988A3A80504bBaeB1311674fCFd40aD4B",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "OVR",
    "address": "0x55704A0e9E2eb59E176C5b69655DbD3DCDCFc0F0",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MAGIC",
    "address": "0x539bdE0d7Dbd336b79148AA742883198BBF60342",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MTA",
    "address": "0x5298Ee77A8f9E226898403eBAC33e68a62F770A0",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "PREMIA",
    "address": "0x51fC0f6660482Ea73330E414eFd7808811a57Fa2",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "PLS",
    "address": "0x51318B7D00db7ACc4026C88c3952B66278B6A67F",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MCB",
    "address": "0x4e352cF164E64ADCBad318C3a1e222E9EBa4Ce42",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "NISHIB",
    "address": "0x4DAD357726b41bb8932764340ee9108cC5AD33a0",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "TUSD",
    "address": "0x4D15a3A2286D883AF0AA1B3f21367843FAc63E07",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "FST",
    "address": "0x488cc08935458403a0458e45E20c0159c8AB2c92",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "LRC",
    "address": "0x46d0cE7de6247b0A95f67b43B589b4041BaE7fbE",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ETHRISE",
    "address": "0x46D06cf8052eA6FdbF71736AF33eD23686eA1452",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DOG",
    "address": "0x4425742F1EC8D98779690b5A3A6276Db85Ddc01A",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "EVO",
    "address": "0x42006Ab57701251B580bDFc24778C43c9ff589A1",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "CELR",
    "address": "0x3a8B787f78D775AECFEEa15706D4221B40F345AB",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MIMATIC",
    "address": "0x3F56e0c36d275367b8C502090EDF38289b3dEa0d",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "SPELL",
    "address": "0x3E6648C5a70A150A88bCE65F4aD4d506Fe15d2AF",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "LAND",
    "address": "0x3CD1833Ce959E087D0eF0Cb45ed06BffE60F23Ba",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ROOBEE",
    "address": "0x3BD2dFd03BC7c3011ed7fb8c4d0949B382726cee",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "PHONON",
    "address": "0x39A49bc5017Fc668299Cd32e734C9269aCc35295",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ZYX",
    "address": "0x377c6E37633e390aEf9AFB4F5E0B16689351EeD4",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "PANA",
    "address": "0x369eB8197062093a20402935D3a707b4aE414E9D",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "PL2",
    "address": "0x3642c0680329ae3e103E2B5AB29DDfed4d43CBE5",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "COMP",
    "address": "0x354A6dA3fcde098F8389cad84b0182725c6C91dE",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "XUSD",
    "address": "0x3509f19581aFEDEff07c53592bc0Ca84e4855475",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "RDPX",
    "address": "0x32Eb7902D4134bf98A28b963D26de779AF92A212",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "STRP",
    "address": "0x326c33FD1113c1F29B35B4407F3d6312a8518431",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "CTSI",
    "address": "0x319f865b287fCC10b30d8cE6144e8b6D1b476999",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "WBTC",
    "address": "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MKR",
    "address": "0x2e9a6Df78E42a30712c10a9Dc4b1C8656f8F2879",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "MAGIC",
    "address": "0x2c852D3334188BE136bFC540EF2bB8C37b590BAD",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "L2DAO",
    "address": "0x2CaB3abfC1670D1a452dF502e216a66883cDf079",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "STBZ",
    "address": "0x2C110867CA90e43D372C1C2E92990B00EA32818b",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "GRT",
    "address": "0x23A941036Ae778Ac51Ab04CEa08Ed6e2FE103614",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "FLUX",
    "address": "0x2338a5d62E9A766289934e8d2e83a443e8065b83",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "DERI",
    "address": "0x21E60EE73F17AC0A411ae5D690f908c3ED66Fe12",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "deUSDC",
    "address": "0x1dDcaa4Ed761428ae348BEfC6718BCb12e63bFaa",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "aMoon",
    "address": "0x1a7BD9EDC36Fb2b3c0852bcD7438c2A957Fd7Ad5",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "NIFLOKI",
    "address": "0x1FAe2A29940015632f2a6CE006dFA7E3225515A7",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "BFR",
    "address": "0x1A5B0aaF478bf1FDA7b934c76E7692D722982a6D",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ALINK",
    "address": "0x191c10Aa4AF7C30e871E70C95dB0E4eb77237530",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "FRAX",
    "address": "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "UMAMI",
    "address": "0x1622bF67e6e5747b81866fE0b85178a93C7F86e3",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ADOGE",
    "address": "0x155f0DD04424939368972f4e1838687d6a831151",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "EMAX",
    "address": "0x123389C2f0e9194d9bA98c21E63c375B67614108",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "CRV",
    "address": "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "PBTC",
    "address": "0x115D8bF0a53e751f8A472F88D587944EC1C8CA6D",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "JONES",
    "address": "0x10393c20975cF177a3513071bC110f7962CD67da",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "HND",
    "address": "0x10010078a54396F62c96dF8532dc2B4847d47ED3",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ALCH",
    "address": "0x0e15258734300290a651FdBAe8dEb039a8E7a2FA",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ZIPT",
    "address": "0x0F61B24272AF65EACF6adFe507028957698e032F",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "BOND",
    "address": "0x0D81E50bC677fa67341c44D7eaA9228DEE64A4e1",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "RDNT",
    "address": "0x0C4681e6C0235179ec3D4F4fc4DF3d14FDD96017",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "IUSD",
    "address": "0x0A3BB08b3a15A19b4De82F8AcFc862606FB69A2D",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ARBY",
    "address": "0x09ad12552ec45f82bE90B38dFE7b06332A680864",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "SYN",
    "address": "0x080F6AEd32Fc474DD5717105Dba5ea57268F46eb",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "GOVI",
    "address": "0x07E49d5dE43DDA6162Fa28D24d5935C151875283",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "QSD",
    "address": "0x07AaA29E63FFEB2EBf59B33eE61437E1a91A3bb2",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "AWBTC",
    "address": "0x078f358208685046a11C85e8ad32895DED33A249",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "KUN",
    "address": "0x04cb2d263a7489f02d813eaaB9Ba1bb8466347F2",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "BAL",
    "address": "0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "AGVE",
    "address": "0x03b95f1C84Af0607afd5dD87ca1FDE7572aa827F",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "CAP",
    "address": "0x031d35296154279DC1984dCD93E392b1f946737b",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  },
  {
    "token": "ETH",
    "address": "0x0000000000000000000000000000000000000000",
    "handler": "0x0000000000000000000000000000000000000000",
    "rewardToken": "0x0000000000000000000000000000000000000000",
    "primary": true
  }
];