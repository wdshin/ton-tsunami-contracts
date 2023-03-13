import { Address, toNano } from 'ton-core';
import { Oracle } from '../wrappers/Oracle';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { IndexIds } from '../constants';

export async function run(provider: NetworkProvider) {
  const broadcasterAddress = Address.parse('EQCogh0uaL1-p7nBx4eB8yIrH2Pf5qQ5ZUUeS4on5VzAkQHH');

  const oracle = provider.open(
    Oracle.createFromConfig({ broadcasterAddress, indexId: IndexIds.TON }, await compile('Oracle'))
  );

  await oracle.sendDeploy(provider.sender(), toNano('0.05'));

  await provider.waitForDeploy(oracle.address);

  console.log('Oracle address: ');
  console.log(oracle.address.toString());
}
