import { Address, toNano } from 'ton-core';
import { compile, NetworkProvider } from '@ton-community/blueprint';

import { Vamm } from '../wrappers/Vamm/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import { JettonWallet } from '../wrappers/JettonWallet';
import { IndexIds } from '../constants';

export async function run(provider: NetworkProvider) {
  const oracleAddress = Address.parse('EQCmnBaZmlgbURj0GcJCH4foWEuk0O5lWNQDI6B_6wyto-B2');

  const vamm = Vamm.createFromConfig(
    initVammData({
      liquidity: 1_000_000,
      price: 2.23,
      indexId: IndexIds.TON,
      opts: {
        jettonWalletAddress: Address.parse('EQAAehIG5Lsju35hFo9ZuCdsmZf-pRtlpuTQHQC1YKY0CAl2'),
        oracleAddress,
        // @ts-ignore
        extraData: {
          positionWalletCode: await compile('PositionWallet'),
          adminAddress: provider.sender().address!,
        },
      },
    }),
    await compile('Vamm')
  );

  const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');
  const usdcJW = await JettonWallet.createFromMaster(provider.api(), usdcAddr, vamm.address);

  const openedContract = provider.open(vamm);
  await openedContract.sendDeploy(provider.sender(), toNano('0.2'), usdcJW.address);

  await provider.waitForDeploy(vamm.address);

  console.log('Vamm address: ');
  console.log(vamm.address);

  console.log('init amm data:', await openedContract.getAmmData());
}
