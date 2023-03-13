import { Address, toNano } from 'ton-core';
import { Oracle } from '../wrappers/Oracle/Oracle';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { configTypeByIndexName, cryptoInitData, forexInitData, IndexIds } from '../constants';
import { Vamm } from '../wrappers/Vamm';
import { initVammData, initVammDataFromConfig } from '../wrappers/Vamm/Vamm.data';
import { JettonWallet } from '../wrappers/JettonWallet/JettonWallet';

export async function run(provider: NetworkProvider) {
  const broadcasterAddress = Address.parse('EQCogh0uaL1-p7nBx4eB8yIrH2Pf5qQ5ZUUeS4on5VzAkQHH');
  const usdcMasterAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');

  const pricesMap = {
    TON: 2.4,
    BTC: 24297.09,
    TSLA: 174.78,
    EUR: 1.07,
  };

  const entries = Object.entries(IndexIds);
  for (let i = 0; i < entries.length; i++) {
    const [indexName, indexId] = entries[i];
    const oracle = provider.open(
      Oracle.createFromConfig({ broadcasterAddress, indexId }, await compile('Oracle'))
    );

    const typedConfig =
      configTypeByIndexName(indexName as keyof typeof IndexIds) === 'crypto'
        ? cryptoInitData
        : forexInitData;

    const fullConfig = initVammDataFromConfig({
      ...typedConfig,
      price: pricesMap[indexName as keyof typeof IndexIds],
      indexId,
      jettonWalletAddress: Address.parse('EQAAehIG5Lsju35hFo9ZuCdsmZf-pRtlpuTQHQC1YKY0CAl2'),
      oracleAddress: oracle.address,
      positionWalletCode: await compile('TraderPositionWallet'),
      adminAddress: provider.sender().address!,
      vaultAddress: provider.sender().address!, // TODO: later add vault address
    });
    const vamm = Vamm.createFromConfig(fullConfig, await compile('Vamm'));

    const usdcJW = await JettonWallet.createFromMaster(
      provider.api(),
      usdcMasterAddr,
      vamm.address
    );

    const openedContract = provider.open(vamm);
    await openedContract.sendDeploy(provider.sender(), toNano('0.2'), usdcJW.address);

    await provider.waitForDeploy(vamm.address);

    console.log(`${indexName} vAMM address: `);
    console.log(vamm.address);

    console.log('init amm data:', await openedContract.getAmmData());
  }
}
