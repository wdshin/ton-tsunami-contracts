import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { toNano } from 'ton-core';

import { Direction, Vamm, VammOpcodes } from '../wrappers/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import { PositionData, PositionWallet } from '../wrappers/PositionWallet';
import { bootstrapTrader, getOraclePrice, toStablecoin } from '../utils';
import { getUpdatePositionMessage } from '../utils';
import { MyBlockchain } from '../wrappers/MyBlockchain/MyBlockchain';

describe('vAMM should handle errors instead of throwing them', () => {
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
          opts: {
            oracleAddress: oracle.address,
            // @ts-ignore
            extraData: { positionWalletCode: await compile('PositionWallet') },
          },
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

  it('Should open long, try short then returm jettons back ', async () => {
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      value: toNano('0.2'),
      amount: toStablecoin(10),
      oldPosition: lastLongerPosition,
      increasePositionBody: {
        direction: Direction.long,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0.15),
      },
      oracleRedirectAddress: longerPosition.address,
      priceData: getOraclePrice(55),
    });

    expect(increaseResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: longerPosition.address,
      body: (x) => x.beginParse().loadUint(32) === VammOpcodes.updatePosition,
    });
    lastLongerPosition = getUpdatePositionMessage(increaseResult.events);

    const shortAmount = toStablecoin(10);
    const tryShortResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      value: toNano('0.25'),
      amount: shortAmount,
      oldPosition: lastLongerPosition,
      increasePositionBody: {
        direction: Direction.short,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0.15),
      },
      oracleRedirectAddress: longerPosition.address,
      priceData: getOraclePrice(55),
    });

    expect(tryShortResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: longerPosition.address,
      body: (x) => x.beginParse().loadUint(32) === VammOpcodes.unlockPosition,
    });

    expect(tryShortResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: jettonWallet.address,
      body: (x) => {
        const cs = x.beginParse();
        const isTransfer = cs.loadUint(32) === VammOpcodes.transfer;
        cs.loadUint(64); // query_id
        const outAmount = cs.loadCoins();
        return isTransfer && outAmount === shortAmount;
      },
    });
  });
});
