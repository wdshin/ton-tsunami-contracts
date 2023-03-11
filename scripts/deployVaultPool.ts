import { toNano } from 'ton-core';
import { VaultPool } from '../wrappers/VaultPool';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const vaultPool = provider.open(
        VaultPool.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('VaultPool')
        )
    );

    await vaultPool.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(vaultPool.address);

    console.log('ID', await vaultPool.getID());
}
