import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { toStablecoin } from '../utils';
import { JettonWallet } from '../wrappers/JettonWallet';

const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');

export async function run(provider: NetworkProvider) {
  const contractsAdresses = [
    'EQCo6ux4pn8J818iENcocGca7wn0vX3YWJX0gJLcNIGx5lUp',
    'EQBhGRXeRlA11sI1ZUbo4-3GpXzKoKUjVdAAqwp3WUj2vRyn',
    'EQD98awwWyzIGSS7zCpBQMCfFjzL2Pqq-pewfz68JNfv9Sj6',
    'EQC7AShcQ-NPc7-xN4Ht_tBF_1b3q4XQsLKnLRZQWrIBKRZW',
  ];

  const usdcJW = await JettonWallet.createFromMaster(
    provider.api(),
    usdcAddr,
    provider.sender().address!
  );
  const openedJW = provider.open(usdcJW);

  for (let contract of contractsAdresses) {
    const rawAmount = 1_000_000_000;
    const amount = toStablecoin(rawAmount);
    console.log(contract);
    const destination = Address.parse(contract);

    await openedJW.sendTransfer(provider.sender(), toNano('0.1'), {
      amount,
      destination,
      forwardAmount: toNano('0'),
      responseDestination: destination,
    });

    console.log(`Credited ${rawAmount} USDC to ${contract}`);
  }
}
