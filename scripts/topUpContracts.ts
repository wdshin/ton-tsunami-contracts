import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { toStablecoin } from '../utils';
import { JettonWallet } from '../wrappers/JettonWallet';

const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');

export async function run(provider: NetworkProvider) {
  const contractsAdresses = [
    'EQCJWp7H2N-RaUjxWLG6AEPlCjC29e_oC_e3KjAhEiG7XNFX',
    'EQDGsyGzqW3ZHU6WWATWCwhW3X6iGrxztCfgUX3NTBDzW4JX',
    'EQALYbTVLbmbJ1Qe72g0DokECMAXjeQcLY35aDyVbYPe9BRC',
    'EQCudugq9W3_Kx1V-9YApIk_mzJplq_haWhEQgpCJ-EAgMsc',
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
