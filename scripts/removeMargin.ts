import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { PositionWallet } from '../wrappers/PositionWallet';
import { Vamm } from '../wrappers/Vamm';

export async function run(provider: NetworkProvider) {
  const vammAddress = Address.parse('EQBPyN6qQvB2LpmKIk4sCzz162pItiHLnS91E_cuRFxkRomm');
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
