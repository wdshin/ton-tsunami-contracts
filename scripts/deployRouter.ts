import { Address, toNano } from 'ton-core';
import { Router } from '../wrappers/Router/Router';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { sleep } from '../utils';
import { JettonWallet } from '../wrappers/JettonWallet/JettonWallet';

export async function run(provider: NetworkProvider) {
  const deployerAddress = provider.sender().address!;
  const router = Router.createFromConfig(
    {
      vammCode: await compile('Vamm'),
      traderPositionWalletCode: await compile('TraderPositionWallet'),
      adminAddress: deployerAddress,
      whitelistedJettonWalletAddress: Address.parse(
        'EQDfWhm26zr7-6k8uJSLZXv4BCD531eDzPoED34eTknFR6Kd' // any, will be overwritten
      ),
    },
    await compile('Router')
  );

  await provider.deploy(router, toNano('0.05'));
  const openedContract = provider.open(router);

  console.log('Router address: ');
  console.log(openedContract.address.toString({ urlSafe: true, bounceable: true }));

  const ammAddr = await openedContract.getAmmAddress();
  console.log('Amm address: ');
  console.log(ammAddr.toString({ urlSafe: true, bounceable: true }));

  const initRouterData = await openedContract.getRouterData();
  console.log('Router admin address: ');
  console.log(initRouterData.adminAddress.toString());
  console.log('Router token address: ');
  console.log(initRouterData.whitelistedJettonWalletAddress.toString());

  const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');
  const usdcJW = await JettonWallet.createFromMaster(provider.api(), usdcAddr, router.address);
  console.log('Target token address: ');
  console.log(usdcJW.address.toString());

  if (!initRouterData.adminAddress.equals(deployerAddress)) {
    throw new Error('adminAddress are not equal to deployerAddress');
  }

  await openedContract.sendSetAmmData(provider.sender(), {
    value: toNano('0.05'),
    balance: 10000,
    price: 2.5,
  });

  await sleep(5000);

  await openedContract.sendSetWhitelistedAddress(provider.sender(), {
    value: toNano('0.05'),
    address: usdcJW.address,
  });

  await sleep(5000);

  const newjw = await openedContract.getWhitelistedJWAddress();
  console.log('\nNew token address:');
  console.log(newjw.toString());
}
