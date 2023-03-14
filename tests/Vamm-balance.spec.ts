import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { toNano } from 'ton-core';

import { Direction, IncreasePositionBody, Vamm } from '../wrappers/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import { PositionData, PositionWallet } from '../wrappers/PositionWallet';
import { bootstrapTrader, getOraclePrice, toStablecoin } from '../utils';
import { getUpdatePositionMessage } from '../utils';
import { MyBlockchain } from '../wrappers/MyBlockchain/MyBlockchain';

describe('vAMM should work with positive funding', () => {
  let blockchain: MyBlockchain;
  let vamm: SandboxContract<Vamm>;
  let longer: SandboxContract<TreasuryContract>;
  let longerPosition: SandboxContract<PositionWallet>;
  let lastLongerPosition: PositionData;
  let jettonWallet: SandboxContract<TreasuryContract>;
  let oracle: SandboxContract<TreasuryContract>;

  beforeAll(async () => {
    blockchain = await MyBlockchain.create();

    jettonWallet = await blockchain.treasury('jettonWallet');
    oracle = await blockchain.treasury('oracle');

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

    [longer, lastLongerPosition, longerPosition] = await bootstrapTrader(
      blockchain,
      vamm.address,
      'longer'
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
    const newPosition = getUpdatePositionMessage(increaseResult.events);

    {
      const ammData = await vamm.getAmmData();
      expect(ammData.balance).toBe(9964129n);
    }

    blockchain.now += 1;
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
