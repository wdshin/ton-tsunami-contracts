import { toNano } from 'ton-core';
import { Vamm } from '../wrappers/Vamm/Vamm';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { initVammData } from '../wrappers/Vamm/Vamm.data';

export async function run(provider: NetworkProvider) {
  const vamm = Vamm.createFromConfig(initVammData, await compile('Vamm'));

  await provider.deploy(vamm, toNano('0.05'));

  const openedContract = provider.open(vamm);
  console.log('init amm data:', await openedContract.getAmmData());
}
