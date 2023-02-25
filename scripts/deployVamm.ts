import { toNano } from 'ton-core';
import { Vamm } from '../wrappers/Vamm';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const vamm = Vamm.createFromConfig(
        {
            id: Math.floor(Math.random() * 10000),
            counter: 0,
        },
        await compile('Vamm')
    );

    await provider.deploy(vamm, toNano('0.05'));

    const openedContract = provider.open(vamm);

    console.log('ID', await openedContract.getID());
}
