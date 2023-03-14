import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { toNano } from 'ton-core';

import { Direction, Vamm } from '../wrappers/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import { PositionData, PositionWallet } from '../wrappers/PositionWallet';
import {
  getWithdrawMessage,
  getOraclePrice,
  toStablecoin,
  toStablecoinFloat,
  bootstrapTrader,
} from '../utils';
import { getUpdatePositionMessage } from '../utils';
import { MyBlockchain } from '../wrappers/MyBlockchain/MyBlockchain';

describe('vAMM should be able to liquidate underwater long position', () => {
  let blockchain: MyBlockchain;
  let vamm: SandboxContract<Vamm>;

  let longer: SandboxContract<TreasuryContract>;
  let longerPosition: SandboxContract<PositionWallet>;
  let lastLongerPosition: PositionData;

  let jettonWallet: SandboxContract<TreasuryContract>;
  let oracle: SandboxContract<TreasuryContract>;
  let liquidator: SandboxContract<TreasuryContract>;

  beforeAll(async () => {
    blockchain = await MyBlockchain.create();
    // blockchain.verbosity = {
    //   print: true,
    //   vmLogs: 'vm_logs',
    //   blockchainLogs: true,
    //   debugLogs: true,
    // };

    jettonWallet = await blockchain.treasury('jettonWallet');
    oracle = await blockchain.treasury('oracle');
    liquidator = await blockchain.treasury('liquidator');

    vamm = blockchain.openContract(
      Vamm.createFromConfig(
        initVammData({
          liquidity: 100_000_000,
          price: 1.23,
          indexId: 100,
          opts: {
            oracleAddress: oracle.address, // @ts-ignore
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

  it('Can open long position', async () => {
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      value: toNano('0.2'),
      amount: toStablecoin(1000),
      oldPosition: lastLongerPosition,
      increasePositionBody: {
        direction: Direction.long,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(50),
      },
      oracleRedirectAddress: longerPosition.address,
      priceData: getOraclePrice(1.23),
    });
    lastLongerPosition = getUpdatePositionMessage(increaseResult.events);
  });

  it('Can partially liquidate long position', async function () {
    let balanceOfLiq = 0n;
    const liquidateResult1 = await vamm.sendLiquidateRaw(oracle.getSender(), {
      value: toNano('0.3'),
      oldPosition: lastLongerPosition,
      liquidator: liquidator.address,
      priceData: getOraclePrice(0.85),
      oracleRedirectAddress: longerPosition.address,
    });

    lastLongerPosition = getUpdatePositionMessage(liquidateResult1.events);
    balanceOfLiq += getWithdrawMessage(liquidateResult1.events).amount;

    const liquidateResult2 = await vamm.sendLiquidateRaw(oracle.getSender(), {
      value: toNano('0.3'),
      oldPosition: lastLongerPosition,
      liquidator: liquidator.address,
      priceData: getOraclePrice(0.85),
      oracleRedirectAddress: longerPosition.address,
    });
    lastLongerPosition = getUpdatePositionMessage(liquidateResult2.events);
    balanceOfLiq += getWithdrawMessage(liquidateResult2.events).amount;

    const liquidateResult3 = await vamm.sendLiquidateRaw(oracle.getSender(), {
      value: toNano('0.3'),
      oldPosition: lastLongerPosition,
      liquidator: liquidator.address,
      priceData: getOraclePrice(0.85),
      oracleRedirectAddress: longerPosition.address,
    });
    lastLongerPosition = getUpdatePositionMessage(liquidateResult3.events);
    balanceOfLiq += getWithdrawMessage(liquidateResult3.events).amount;

    expect(toStablecoinFloat(balanceOfLiq)).toBeCloseTo(7.25, 0.1);
  });
});
