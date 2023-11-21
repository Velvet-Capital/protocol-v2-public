import { Contract } from "ethers";
import { task, types } from "hardhat/config";
import { DEFENDER_CONTRACT_ADMIN_ADD } from "./task-names";
import { chainIdToAddresses } from "../scripts/networkVariables";
import  contractAddresses  from "../deployment/bsc";
import axios from "axios";
import fs from "fs";
import path from "path";

const { AdminClient } = require('@openzeppelin/defender-admin-client');

task(DEFENDER_CONTRACT_ADMIN_ADD, "Posts each contract address to OpenZeppelin Defender")
  .setAction(async (args, hre) => {
    const API_URL = 'http://api.defender.openzeppelin.com/';

    async function callApi(endpoint: string, key: string, token: string) {
        try {
          
            const response = await axios.get(`${API_URL}${endpoint}`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Api-Key': key,
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data;
        } catch (error) {
            console.error("Error calling API:", error);
            throw error;
        }
}
   // const addressesFilePath = path.join(__dirname, "addresses.json");
    const API_KEY = "2ABqTWXGhXiURENbGm74HdB155MLX2uN";
    const API_SECRET = "yLV7DjmHjcaECFzZbJr14xWr2QLQm9RTDsgZCNhkWQY6HL6oVnRmrtxnMSrYcQWi";
    const client = new AdminClient({ apiKey: API_KEY, apiSecret: API_SECRET });
    console.log(client);
//const proposals = await client.listProposals();
    console.log(await client.listContracts());

   for (const [contractName, address] of Object.entries(contractAddresses)) {
    const addressesFilePath = path.join(__dirname,"../abi/"+contractName+".json" );
    console.log(addressesFilePath);
    const addressesData = JSON.parse(fs.readFileSync(addressesFilePath, "utf-8"));

      const DATA = {
        address: address as string,
        network: "bsc",
        name: contractName,
        abi: JSON.stringify(addressesData) // You can replace this with the actual ABI if needed
      };
   //   console.log(DATA);

      try {

        await client.addContract(DATA);
        // const response = await axios.post(API_URL+"admin/contracts", DATA, {
        //   headers: {
        //     "Accept": "application/json",
        //     "Content-Type": "application/json",
        //     "X-Api-Key": key,
        //     "Authorization": `Bearer ${args.token}`
        //   }
        // });

        console.log(`Successfully posted ${contractName} with address ${address}`);
      } catch (error) {
        console.error(`Error posting ${contractName} with address ${address}:`, error);
      }

    }  
    
    // const output = Object.entries(contractAddresses).map(([contractName, address]) => ({
    //     address: address,
    //     network: "bsc",
    //     name: contractName
    // }));
    
   // console.log(output);
    
  });
