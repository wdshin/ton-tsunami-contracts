import { Address, toNano } from 'ton-core';
import { VaultWallet } from '../wrappers/VaultWallet';
import { NetworkProvider, sleep } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('VaultWallet address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const vaultWallet = provider.open(VaultWallet.createFromAddress(address));

    const counterBefore = await vaultWallet.getCounter();

    await vaultWallet.sendIncrease(provider.sender(), {
        increaseBy: 1,
        value: toNano('0.05'),
    });

    ui.write('Waiting for counter to increase...');

    let counterAfter = await vaultWallet.getCounter();
    let attempt = 1;
    while (counterAfter === counterBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        counterAfter = await vaultWallet.getCounter();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('Counter increased successfully!');
}
