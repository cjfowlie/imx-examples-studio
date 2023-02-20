import { AlchemyProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { ImLogger, WinstonLogger } from '@imtbl/imlogging';
import { ImmutableXClient } from '@imtbl/imx-sdk';
const Web3 = require('web3');
const fs = require('fs/promises');

import env from '../config/client';
import { loggerConfig } from '../config/logging';

const web3Provider = new Web3.providers.HttpProvider(process.env.INFURA_URL_GOERLI);
const web3 = new Web3(web3Provider);
const provider = new AlchemyProvider(env.ethNetwork, env.alchemyApiKey);
const log = new WinstonLogger(loggerConfig);

async function createAndRegisterWallet(i: number) {
  // Create wallet
  const newAccount = web3.eth.accounts.create();

  // Store wallet key and Private Key
  const { address: walletID, privateKey: walletKey } = newAccount;

  // Register with IMX
  const component = '[IMX-USER-REGISTRATION]';

  try {
    const user = await ImmutableXClient.build({
      ...env.client,
      signer: new Wallet(walletKey).connect(provider),
    });

    log.info(component, 'Registering user...');

    let existingUser;
    let newUser;
    try {
      // Fetching existing user
      existingUser = await user.getUser({
        user: user.address,
      });
    } catch {
      try {
        // If user doesnt exist, create user
        newUser = await user.registerImx({
          etherKey: user.address,
          starkPublicKey: user.starkPublicKey,
        });
      } catch (error) {
        throw new Error(JSON.stringify(error, null, 2));
      }
    }

    if (existingUser) {
      log.info(component, 'User already exists', user.address);
    } else {
      log.info(component, 'User has been created', user.address);
    }
    console.log(JSON.stringify({ newUser, existingUser }, null, 2));

    // Save wallet ID and private key to file
    await fs.appendFile('wallets.csv', `${i},${walletID},${walletKey}\r\n`);
  } catch (error) {
    console.log("Error completing signing" + error)
    process.exit(1);
  }
}

async function main() {
  await fs.writeFile('wallets.csv', 'id,address,private_key\r\n');

  const promises = [];
  for (let i = 1; i < 5; i++) {
    promises.push(createAndRegisterWallet(i));
  }
  await Promise.all(promises);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
