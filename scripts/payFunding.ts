import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { Vamm } from '../wrappers/Vamm';

export async function run(provider: NetworkProvider) {
  const vammAddress = Address.parse('EQCGa-QN7KkHqYyOky1SMt05yePQXNZ35lSER83L4xfXpPPg');
  const openedVamm = provider.open(Vamm.createFromAddress(vammAddress));

  await openedVamm.sendPayFunding(provider.sender(), {
    value: toNano('0.25'),
  });
}
