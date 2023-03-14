import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { toNano } from 'ton-core';

import { Direction, Vamm } from '../wrappers/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import { PositionData } from '../wrappers/PositionWallet';
import {
  getAndUnpackWithdrawMessage,
  getInitPosition,
  getOraclePrice,
  toStablecoin,
  toStablecoinFloat,
} from '../utils';
import { getAndUnpackPosition } from '../utils';
import { MyBlockchain } from '../wrappers/MyBlockchain/MyBlockchain';

describe('vAMM should be able to liquidate underwater long position', () => {
  let blockchain: MyBlockchain;
  let vamm: SandboxContract<Vamm>;

  let longer: SandboxContract<TreasuryContract>;
  let longerPosition: SandboxContract<TreasuryContract>;
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

    longer = await blockchain.treasury('longer');
    longerPosition = await blockchain.treasury('longerPosition');
    lastLongerPosition = getInitPosition(longer.address);

    vamm = blockchain.openContract(
      Vamm.createFromConfig(
        initVammData({
          liquidity: 100_000_000,
          price: 1.23,
          indexId: 100,
          opts: { oracleAddress: oracle.address },
        }),
        await compile('Vamm')
      )
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
    lastLongerPosition = getAndUnpackPosition(increaseResult.events);
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

    lastLongerPosition = getAndUnpackPosition(liquidateResult1.events, 2);
    balanceOfLiq += getAndUnpackWithdrawMessage(liquidateResult1.events, 1).amount;

    const liquidateResult2 = await vamm.sendLiquidateRaw(oracle.getSender(), {
      value: toNano('0.3'),
      oldPosition: lastLongerPosition,
      liquidator: liquidator.address,
      priceData: getOraclePrice(0.85),
      oracleRedirectAddress: longerPosition.address,
    });
    lastLongerPosition = getAndUnpackPosition(liquidateResult2.events, 2);
    balanceOfLiq += getAndUnpackWithdrawMessage(liquidateResult2.events, 1).amount;

    const liquidateResult3 = await vamm.sendLiquidateRaw(oracle.getSender(), {
      value: toNano('0.3'),
      oldPosition: lastLongerPosition,
      liquidator: liquidator.address,
      priceData: getOraclePrice(0.85),
      oracleRedirectAddress: longerPosition.address,
    });
    lastLongerPosition = getAndUnpackPosition(liquidateResult3.events, 2);
    balanceOfLiq += getAndUnpackWithdrawMessage(liquidateResult3.events, 1).amount;

    expect(toStablecoinFloat(balanceOfLiq)).toBeCloseTo(7.25, 0.1);
  });
});
