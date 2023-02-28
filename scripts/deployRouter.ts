import { Address, toNano } from 'ton-core';
import { Router } from '../wrappers/Router/Router';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { addressToCell, sleep } from '../utils';

export async function run(provider: NetworkProvider) {
  const deployerAddress = Address.parse(
    '0:ADC17461D1241EEFCD189C7D50A94045F3E91849CB66D6CD3FFE0731AD6B3F9A' ??
      'EQCtwXRh0SQe780YnH1QqUBF8-kYSctm1s0__gcxrWs_mjVn'
  );
  const router = Router.createFromConfig(
    {
      vammCode: await compile('Vamm'),
      traderPositionWalletCode: await compile('TraderPositionWallet'),
      adminAddress: deployerAddress,
      whitelistedJettonWalletAddress: Address.parse(
        'EQDQT70Py3hwjh5E9F7kEJfKlt9gofCSA6QJ-UIvZht0l9iL'
      ),
    },
    await compile('Router')
  );

  await provider.deploy(router, toNano('0.05'));
  const openedContract = provider.open(router);

  console.log('Router address: ');
  console.log(
    openedContract.address.toString({ urlSafe: true, bounceable: true })
  );

  const ammAddr = await openedContract.getAmmAddress();

  console.log('Amm address: ');
  console.log(ammAddr.toString({ urlSafe: true, bounceable: true }));

  const usdcAddr = Address.parse(
    'kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb'
  );
  const { stack } = await provider
    .api()
    .callGetMethod(usdcAddr, 'get_wallet_address', [
      { type: 'slice', cell: addressToCell(router.address) },
    ]);
  const jwAddress = stack.readAddress();
  console.log('jwAddress: ');
  console.log(jwAddress);

  const adminAddress = await openedContract.getAmmAddress();

  console.log('adminAddress: ');
  console.log(adminAddress.toString({ urlSafe: true, bounceable: true }));

  // if (!adminAddress.equals(deployerAddress)) {
  //   throw new Error('adminAddress are not equal to deployerAddress');
  // }

  await openedContract.sendSetAmmData(provider.sender(), {
    value: toNano('0.05'),
    balance: 10000,
    price: 2.5,
  });

  await sleep(1500);

  await openedContract.sendSetWhitelistedAddress(provider.sender(), {
    value: toNano('0.05'),
    address: jwAddress,
  });
}
