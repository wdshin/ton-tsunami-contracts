import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { Router } from '../wrappers/Router/Router';
import { TraderPositionWallet } from '../wrappers/TraderPositionWallet';

export async function run(provider: NetworkProvider) {
  const routerAddress = Address.parse('EQDsFSqXy8CCIYvYkVErL3TlNa-V47uge8SkIBY4qSTrc3Ds');
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
