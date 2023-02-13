// Importing the Immutable X JavaScript SDK and the ethers library
import * as imx from '@imtbl/imx-sdk';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { BigNumber } from '@ethersproject/bignumber';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import { ETHTokenType } from '@imtbl/imx-sdk';

import * as dotenv from 'dotenv';

dotenv.config();
// Defining an asynchronous function "run"
const run = async () => {
  // Setting the URL of the IMX API to connect to the Goerli test network
  const apiAddress = 'https://api.sandbox.x.immutable.com/v1';

  // Setting the private key of the IMX user sending the transaction (empty for now)
  const userPrivateKey = process.env.OWNER_ACCOUNT_PRIVATE_KEY;

  // Connecting to an Ethereum JSON-RPC provider (Infura) on the Goerli network
  const provider = new JsonRpcProvider(
    process.env.INFURA_URL_GOERLI,
  );

  const withdrawAmount = '1000000000000000';
  // Connecting to the Ethereum wallet using the private key and provider
  const ethersSignerWallet = new Wallet(userPrivateKey).connect(provider);
  console.log(ethersSignerWallet);

  // Setting the parameters required to build an IMX client
  const params = {
    starkContractAddress: process.env.STARK_CONTRACT_ADDRESS,
    registrationContractAddress: process.env.REGISTRATION_ADDRESS,
    signer: ethersSignerWallet,
    publicApiUrl: apiAddress,
    gasLimit: process.env.GAS_LIMIT,
    gasPrice: process.env.GAS_PRICE,
  };
  try {
    // Building the IMX client
    const client = await imx.ImmutableXClient.build(params);

    // Get the balance of the wallet
    const balance = await client.getBalance({
      user: client.address,
      tokenAddress: 'ETH',
    });

    console.log(balance);

    // Check if there are sufficient funds in the wallet
    if (balance.balance.lt(BigNumber.from(withdrawAmount))) {
      console.log(
        'Error: Insufficient funds in the wallet to complete the transfer.',
      );
      return;
    }

    //Transferring ETH from the IMX sender to a receiver address
    const results: { id: string; address: string; private_key: string }[] = [];

    createReadStream('wallets.csv')
      .pipe(csv())
      .on('data', data => results.push(data))
      .on('end', async () => {
        //Number of wallets to be funded  
        const transfers = results.slice(0, 2).map(result => ({
          sender: client.address,
          token: {
            type: ETHTokenType.ETH,
            data: {
              decimals: 18,
            },
          },
          receiver: result.address,
          // 0.001 ETH
          quantity: BigNumber.from(withdrawAmount),
        }));

        const res = await Promise.all(transfers.map(transfer => client.transfer(transfer)));
        console.log(res);
      });

  } catch (error) {
    console.error(error);
  }
};

// Logging the result of the transfer
run();
