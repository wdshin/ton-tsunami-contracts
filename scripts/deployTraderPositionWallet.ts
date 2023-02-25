import { toNano } from 'ton-core';
import { TraderPositionWallet } from '../wrappers/TraderPositionWallet';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const traderPositionWallet = TraderPositionWallet.createFromConfig(
        {
            id: Math.floor(Math.random() * 10000),
            counter: 0,
        },
        await compile('TraderPositionWallet')
    );

    await provider.deploy(traderPositionWallet, toNano('0.05'));

    const openedContract = provider.open(traderPositionWallet);

    console.log('ID', await openedContract.getID());
}
