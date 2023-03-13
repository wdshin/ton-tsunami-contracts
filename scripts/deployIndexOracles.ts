import { Address, toNano } from 'ton-core';
import { Oracle } from '../wrappers/Oracle/Oracle';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { IndexIds } from '../constants';

export async function run(provider: NetworkProvider) {
  const broadcasterAddress = Address.parse('EQCogh0uaL1-p7nBx4eB8yIrH2Pf5qQ5ZUUeS4on5VzAkQHH');

  const entries = Object.entries(IndexIds);
  for (let i = 0; i < entries.length; i++) {
    const [indexName, indexId] = entries[i];
    const oracle = provider.open(
      Oracle.createFromConfig({ broadcasterAddress, indexId }, await compile('Oracle'))
    );

    await oracle.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(oracle.address);

    console.log(`${indexName} Oracle address: `);
    console.log(oracle.address.toString());
  }
}
