import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { toStablecoin } from '../utils';
import { JettonWallet } from '../wrappers/JettonWallet';

const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');

export async function run(provider: NetworkProvider) {
  const contractsAdresses = [
    'EQA8fmNWMCNmil-L0Ga3b_OS2lwUZlAut3cVZ80A_CeGjdg3',
    'EQAzIi9kHd7DWXrSoOQdkaPJTDTIXG0PEUel8MVOPxIXHrP9',
    'EQCZM4nIlFlAMWReuyXRId6p_Gq_oGi0rmymarZF5YflsJ6n',
    'EQBKzIhz7j6GRB8ODhjt77me42GFkib5xOaJqQwXyHpG6VY1',
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
