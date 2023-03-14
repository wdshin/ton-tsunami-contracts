import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { PositionWallet } from '../wrappers/PositionWallet';
import { Vamm } from '../wrappers/Vamm';

export async function run(provider: NetworkProvider) {
  const vammAddress = Address.parse('EQB8Z7j_BJIoEqS3NIMgHJQ336j5gHvd7b3AWe5nRjgY6k78');
  const openedVamm = provider.open(Vamm.createFromAddress(vammAddress));

  const pwAddress = await openedVamm.getTraderPositionAddress(provider.sender().address!);
  const pw = PositionWallet.createFromAddress(pwAddress);
  const openedPW = provider.open(pw);

  const data = await openedPW.getPositionData();

  console.log('positionData', data);

  await openedVamm.sendRemoveMargin(provider.sender(), {
    value: toNano('0.3'),
    amount: data.positionData.margin / 10n,
  });
}
