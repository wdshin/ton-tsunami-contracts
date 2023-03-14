import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { toNano } from 'ton-core';

import { Direction, IncreasePositionBody, Vamm } from '../wrappers/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import { PositionData } from '../wrappers/PositionWallet';
import { getInitPosition, getOraclePrice, toStablecoin } from '../utils';
import { getAndUnpackPosition } from '../utils';
import { MyBlockchain } from '../wrappers/MyBlockchain/MyBlockchain';

describe('vAMM should work with positive funding', () => {
  let blockchain: MyBlockchain;
  let vamm: SandboxContract<Vamm>;
  let longer: SandboxContract<TreasuryContract>;
  let longerPosition: SandboxContract<TreasuryContract>;
  let lastLongerPosition: PositionData;
  let jettonWallet: SandboxContract<TreasuryContract>;
  let oracle: SandboxContract<TreasuryContract>;

  beforeAll(async () => {
    blockchain = await MyBlockchain.create();
    blockchain.verbosity = {
      print: true,
      vmLogs: 'vm_logs',
      blockchainLogs: true,
      debugLogs: true,
    };

    jettonWallet = await blockchain.treasury('jettonWallet');
    oracle = await blockchain.treasury('oracle');

    longer = await blockchain.treasury('longer');
    longerPosition = await blockchain.treasury('longerPosition');
    lastLongerPosition = getInitPosition(longer.address);

    vamm = blockchain.openContract(
      Vamm.createFromConfig(
        initVammData({
          liquidity: 100_000,
          price: 55,
          indexId: 100,
          opts: { oracleAddress: oracle.address },
        }),
        await compile('Vamm')
      )
    );

    const deployer = await blockchain.treasury('deployer');
    await vamm.sendDeploy(deployer.getSender(), toNano('0.5'), jettonWallet.address);
  });

  it('Opening and closing positions should change balance', async () => {
    const increasePositionBody: IncreasePositionBody = {
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.15),
    };
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      value: toNano('0.2'),
      amount: toStablecoin(10),
      oldPosition: lastLongerPosition,
      increasePositionBody,
      oracleRedirectAddress: longerPosition.address,
      priceData: getOraclePrice(55),
    });

    expect(increaseResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: longerPosition.address,
    });

    {
      const ammData = await vamm.getAmmData();
      expect(ammData.balance).toBe(9964129n);
    }

    blockchain.now += 1;
    const newPosition = getAndUnpackPosition(increaseResult.events);

    await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: newPosition,
      oracleRedirectAddress: longerPosition.address,
      priceData: getOraclePrice(55),
    });

    const ammData = await vamm.getAmmData();
    expect(ammData.balance).toBe(0n);
  });
});
