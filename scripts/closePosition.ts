import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { Router } from '../wrappers/Router/Router';
import { TraderPositionWallet } from '../wrappers/TraderPositionWallet';

export async function run(provider: NetworkProvider) {
  const routerAddress = Address.parse('EQBZYxBWMiD1xBOwGnIEktBxX_MaU2OGVR8bWsDG4qCJXSj4');
  const openedRouter = provider.open(Router.createFromAddress(routerAddress));

  const tpwAddress = await openedRouter.getTraderPositionAddress(provider.sender().address!);
  const tpw = TraderPositionWallet.createFromAddress(tpwAddress);
  const openedTPW = provider.open(tpw);

  const { positionData } = await openedTPW.getPositionData();

  console.log('positionData.size', positionData.size);

  // getPositionData
  //     .storeUint(opts.size ?? opts.oldPosition.size, 128)
  //     .storeUint(opts.minQuoteAssetAmount ?? 0, 128)
  //     .storeBit(opts.addToMargin ?? false)
  await openedRouter.sendClosePosition(provider.sender(), {
    value: toNano('0.2'),
    size: positionData.size,
    minQuoteAssetAmount: 0n,
    addToMargin: false,
  });
}
