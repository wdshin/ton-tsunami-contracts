import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { Router } from '../wrappers/Router/Router';
import { toStablecoin } from '../utils';
import { JettonWallet } from '../wrappers/JettonWallet/JettonWallet';

const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');
const fakeUsdAddr = Address.parse('kQDuLkq23W-n4U200Ppqn-6ZLcGa2CTqa3KKgrMB0ZpwqUO_');
const Direction = { long: 1, short: 2 };

export async function run(provider: NetworkProvider) {
  const routerAddress = Address.parse('EQBZYxBWMiD1xBOwGnIEktBxX_MaU2OGVR8bWsDG4qCJXSj4');

  const openedRouter = provider.open(Router.createFromAddress(routerAddress));
  const positionAddres = await openedRouter.getTraderPositionAddress(provider.sender().address!);
  console.log('Position address');
  console.log(positionAddres.toString());

  const usdcJW = await JettonWallet.createFromMaster(
    provider.api(),
    usdcAddr,
    provider.sender().address!
  );
  const openedJW = provider.open(usdcJW);

  const forwardPayload = Router.increasePosition({
    direction: Direction.long,
    leverage: toStablecoin(3),
    minBaseAssetAmount: toStablecoin(0.15),
  });

  // const usdfJW = await JettonWallet.createFromMaster(
  //   provider.api(),
  //   fakeUsdAddr,
  //   provider.sender().address!
  // );
  // const openedFakeJW = provider.open(usdfJW);

  // await openedFakeJW.sendTransfer(provider.sender(), toNano('0.3'), {
  //   amount: toStablecoin(100),
  //   destination: routerAddress,
  //   forwardAmount: toNano('0.255'),
  //   forwardPayload,
  // });

  await openedJW.sendTransfer(provider.sender(), toNano('0.3'), {
    amount: toStablecoin(1000),
    destination: routerAddress,
    forwardAmount: toNano('0.25'),
    responseDestination: provider.sender().address,
    forwardPayload,
  });
}
