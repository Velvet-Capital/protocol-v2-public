import { data } from "./BaseTokens";
const fs = require("fs");
async function getData() {
  const baseTokenData: any = [];
  for (let i = 0; i < data.length; i++) {
    const baseData: any = {};
    const aggregator = [];
    baseData.token = data[i].NAME;
    aggregator.push(data[i].BASEADDRESS);
    aggregator.push("0x0000000000000000000000000000000000000348");
    aggregator.push(data[i].AGGREGATOR);
    baseData.address = aggregator;
    // baseData.address = data[i].BASEADDRESS;
    // baseData.handler = "BaseHandler";
    // baseData.rewardToken = "0x0000000000000000000000000000000000000000";
    // baseData.primary = "true";
    baseTokenData.push(baseData);
  }
  fs.writeFileSync("scripts/baseTokenPriceOracleData.json", JSON.stringify(baseTokenData));
}

getData();

// {"token": "BTC" ,"address":["0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c","0x0000000000000000000000000000000000000348","0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf"]   },
