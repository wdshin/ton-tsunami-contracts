import { toNano } from 'ton-core';
import { Router } from '../wrappers/Router';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
  const router = Router.createFromConfig(
    {
      id: Math.floor(Math.random() * 10000),
      counter: 0,
    },
    await compile('Router')
  );

  await provider.deploy(router, toNano('0.05'));

  const openedContract = provider.open(router);

  console.log('ID', await openedContract.getID());
}
