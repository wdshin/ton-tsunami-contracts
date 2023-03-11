import { toNano } from 'ton-core';
import { VaultWallet } from '../wrappers/VaultWallet';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const vaultWallet = provider.open(
        VaultWallet.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('VaultWallet')
        )
    );

    await vaultWallet.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(vaultWallet.address);

    console.log('ID', await vaultWallet.getID());
}
