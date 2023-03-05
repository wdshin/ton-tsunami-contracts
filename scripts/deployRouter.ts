import { Address, toNano } from 'ton-core';
import { Router } from '../wrappers/Router/Router';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { JettonWallet } from '../wrappers/JettonWallet/JettonWallet';

export async function run(provider: NetworkProvider) {
  const deployerAddress = provider.sender().address!;
  const router = Router.createFromConfig(
    {
      vammCode: await compile('Vamm'),
      traderPositionWalletCode: await compile('TraderPositionWallet'),
      adminAddress: deployerAddress,
      whitelistedJettonWalletAddress: Address.parse(
        'EQAEDydQwnlfAEgcAgK89WLTsKHhz28G_nxQWuf3lEQzpx8q' // any, will be overwritten
      ),
    },
    await compile('Router')
  );
  const openedContract = provider.open(router);

  const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');
  const usdcJW = await JettonWallet.createFromMaster(provider.api(), usdcAddr, router.address);
  await openedContract.sendDeploy(
    provider.sender(),
    toNano('0.05'),
    Router.tempSetWhitelistedAddress({ address: usdcJW.address })
  );
  await provider.waitForDeploy(router.address);

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

  if (!initRouterData.adminAddress.equals(deployerAddress)) {
    throw new Error('adminAddress are not equal to deployerAddress');
  }

  await openedContract.sendSetAmmData(provider.sender(), {
    value: toNano('0.1'),
    balance: 10000,
    price: 2.5,
  });
}
