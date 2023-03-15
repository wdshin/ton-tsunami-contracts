import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { Vamm } from '../wrappers/Vamm';

export async function run(provider: NetworkProvider) {
  const vammAddress = Address.parse('EQCQ54YLh_NwD5qGQMlL_S6WI1C8REBhTP6jjn0EIMSVxj1Q');
  const openedVamm = provider.open(Vamm.createFromAddress(vammAddress));

  await openedVamm.sendPayFunding(provider.sender(), {
    value: toNano('0.25'),
  });
}
