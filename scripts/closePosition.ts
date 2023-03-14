import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { PositionWallet } from '../wrappers/PositionWallet';
import { Vamm } from '../wrappers/Vamm';

export async function run(provider: NetworkProvider) {
  const vammAddress = Address.parse('EQB8Z7j_BJIoEqS3NIMgHJQ336j5gHvd7b3AWe5nRjgY6k78');
  const openedVamm = provider.open(Vamm.createFromAddress(vammAddress));

  const tpwAddress = await openedVamm.getTraderPositionAddress(provider.sender().address!);
  const tpw = PositionWallet.createFromAddress(tpwAddress);
  const openedTPW = provider.open(tpw);

  const data = await openedTPW.getPositionData();

  console.log('positionData', data);

  await openedVamm.sendClosePosition(provider.sender(), {
    value: toNano('0.3'),
    size: data.positionData.size,
    minQuoteAssetAmount: 0n,
    addToMargin: false,
  });
}
