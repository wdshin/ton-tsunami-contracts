import { Address, toNano } from 'ton-core';
import { Router } from '../wrappers/Router/Router';
import { NetworkProvider } from '@ton-community/blueprint';
import { sleep } from '../utils';
import { JettonWallet } from '../wrappers/JettonWallet/JettonWallet';

export async function run(provider: NetworkProvider) {
  const router = Router.createFromAddress(
    Address.parse('EQB3ZM4hbAaf3yh12WMEIT1QdPePiDn0Eo9zUV2AKK2-WWmc')
  );

  const openedContract = provider.open(router);

  console.log('Router address: ');
  console.log(openedContract.address.toString({ urlSafe: true, bounceable: true }));

  console.log('Prev token address:');
  const prevjw = await openedContract.getWhitelistedJWAddress();
  console.log(prevjw.toString());

  const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');
  const usdcJW = await JettonWallet.createFromMaster(provider.api(), usdcAddr, router.address);
  console.log('Target token address: ');
  console.log(usdcJW.address.toString());

  if (prevjw.equals(usdcJW.address)) {
    console.warn('Target token address and previous address are equal');
    process.exit(0);
  }

  await openedContract.sendSetWhitelistedAddress(provider.sender(), {
    value: toNano('0.05'),
    address: usdcJW.address,
  });

  await sleep(6000);

  console.log('\nNext token address:');
  const newjw = await openedContract.getWhitelistedJWAddress();
  console.log(newjw.toString());
}
