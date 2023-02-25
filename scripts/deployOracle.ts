import { toNano } from 'ton-core';
import { Oracle } from '../wrappers/Oracle';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const oracle = Oracle.createFromConfig(
        {
            id: Math.floor(Math.random() * 10000),
            counter: 0,
        },
        await compile('Oracle')
    );

    await provider.deploy(oracle, toNano('0.05'));

    const openedContract = provider.open(oracle);

    console.log('ID', await openedContract.getID());
}
