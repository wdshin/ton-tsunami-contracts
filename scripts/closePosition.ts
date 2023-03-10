import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { Router } from '../wrappers/Router/Router';
import { TraderPositionWallet } from '../wrappers/TraderPositionWallet';

export async function run(provider: NetworkProvider) {
  const routerAddress = Address.parse('EQD235QccnFL3T3ZaHewQe-UNROmhJjn3QDqtNQJQbGWsVuk');
  const openedRouter = provider.open(Router.createFromAddress(routerAddress));

  const tpwAddress = await openedRouter.getTraderPositionAddress(provider.sender().address!);
  const tpw = TraderPositionWallet.createFromAddress(tpwAddress);
  const openedTPW = provider.open(tpw);

  const data = await openedTPW.getPositionData();

  console.log('positionData', data);

  await openedRouter.sendClosePosition(provider.sender(), {
    value: toNano('0.3'),
    size: data.positionData.size,
    minQuoteAssetAmount: 0n,
    addToMargin: false,
  });
}
