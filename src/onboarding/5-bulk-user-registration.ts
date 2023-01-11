import { AlchemyProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { ImLogger, WinstonLogger } from '@imtbl/imlogging';
import { ImmutableXClient } from '@imtbl/imx-sdk';
const Web3 = require('web3');
var fs = require('fs');

import env from '../config/client';
import { loggerConfig } from '../config/logging';

fs.appendFileSync('wallets.csv', 'id,address,private_key\r\n');

for (let i = 1; i < 5; i++) {
  //Create wallet
  const web3Provider = new Web3.providers.HttpProvider(
    process.env.INFURA_URL_GOERLI,
  );
  const web3 = new Web3(web3Provider);
  const newAccount = web3.eth.accounts.create();
  console.log(newAccount);

  const obj = JSON.stringify(newAccount);
  console.log(obj);

  //Store wallet key and Private Key
  const walletID = newAccount.address;
  const walletKey = newAccount.privateKey;

  // Register with IMX
  const provider = new AlchemyProvider(env.ethNetwork, env.alchemyApiKey);
  const log: ImLogger = new WinstonLogger(loggerConfig);

  const component = '[IMX-USER-REGISTRATION]';

  (async (): Promise<void> => {
    const privateKey = walletKey;

    const user = await ImmutableXClient.build({
      ...env.client,
      signer: new Wallet(privateKey).connect(provider),
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
  })().catch(e => {
    log.error(component, e);
    process.exit(1);
  });

  //id,address,key
  fs.appendFileSync('wallets.csv', + i + "," + walletID + "," + walletKey);
  fs.appendFileSync('wallets.csv', '\r\n');
}
