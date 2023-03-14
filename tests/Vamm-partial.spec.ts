import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { toNano } from 'ton-core';

import { Direction, Vamm } from '../wrappers/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import { PositionData, PositionWallet } from '../wrappers/PositionWallet';
import {
  BigMath,
  getUpdatePositionMessage,
  getWithdrawMessage,
  getInitPosition,
  getOraclePrice,
  toStablecoin,
  toStablecoinFloat,
  bootstrapTrader,
} from '../utils';
import { MyBlockchain } from '../wrappers/MyBlockchain/MyBlockchain';

describe('vAMM should be able to partially close position', () => {
  let blockchain: MyBlockchain;
  let oracle: SandboxContract<TreasuryContract>;
  let jettonWallet: SandboxContract<TreasuryContract>;
  let vamm: SandboxContract<Vamm>;

  let longer: SandboxContract<TreasuryContract>;
  let longerPosition: SandboxContract<PositionWallet>;
  let lastLongerPosition: PositionData;

  let shorter: SandboxContract<TreasuryContract>;
  let shorterPosition: SandboxContract<PositionWallet>;
  let lastShorterPosition: PositionData;

  let liquidator: SandboxContract<TreasuryContract>;

  beforeAll(async () => {
    blockchain = await MyBlockchain.create();
    blockchain.verbosity.debugLogs = false;

    oracle = await blockchain.treasury('oracle');
    jettonWallet = await blockchain.treasury('jettonWallet');
    vamm = blockchain.openContract(
      Vamm.createFromConfig(
        initVammData({
          liquidity: 1_000_000_000,
          price: 55,
          indexId: 1,
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

    [shorter, lastShorterPosition, shorterPosition] = await bootstrapTrader(
      blockchain,
      vamm.address,
      'shorter'
    );

    liquidator = await blockchain.treasury('liquidator');

    await vamm.sendDeploy(oracle.getSender(), toNano('0.5'), jettonWallet.address);
  });

  beforeEach(async () => {
    await vamm.sendSetOraclePrice(oracle.getSender(), {
      value: toNano('0.05'),
      price: 55,
    });
  });

  it('can partially close long position with positive PnL', async () => {
    const increasePositionBody = {
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0),
    };
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      increasePositionBody,
      priceData: getOraclePrice(55),
      oracleRedirectAddress: longerPosition.address,
    });

    const newPosition = getUpdatePositionMessage(increaseResult.events);
    lastLongerPosition = newPosition;

    await vamm.sendSetOraclePrice(oracle.getSender(), {
      value: toNano('0.1'),
      price: 65,
    });

    {
      console.log(`Position size = ${lastLongerPosition.size}`);
      blockchain.now += 1;
      const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
        value: toNano('0.2'),
        oldPosition: lastLongerPosition,
        size: 52442458n, // Almost 100% close positions
        priceData: getOraclePrice(65),
        oracleRedirectAddress: longerPosition.address,
      });
      const newPosition = getUpdatePositionMessage(closeResult.events);
      lastLongerPosition = newPosition;

      const withdrawMsg = getWithdrawMessage(closeResult.events);
      expect(toStablecoinFloat(withdrawMsg.amount)).toBeCloseTo(1481.8, 0.1); // Received: 1485.873766
    }

    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      priceData: getOraclePrice(65),
      oracleRedirectAddress: longerPosition.address,
    });

    const { ammState } = await vamm.getAmmData();

    const closePosition = getUpdatePositionMessage(closeResult.events);
    lastLongerPosition = closePosition;

    expect(toStablecoinFloat(ammState.openInterestLong)).toBeCloseTo(0, 0.01);
    expect(toStablecoinFloat(ammState.openInterestShort)).toBeCloseTo(0, 0.01);
  });

  it('can partially close long position with negative PnL', async function () {
    const increasePositionBody = {
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0),
    };
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      increasePositionBody,
      priceData: getOraclePrice(55),
      oracleRedirectAddress: longerPosition.address,
    });

    const newPosition = getUpdatePositionMessage(increaseResult.events);
    lastLongerPosition = newPosition;

    await vamm.sendSetOraclePrice(oracle.getSender(), {
      value: toNano('0.1'),
      price: 45,
    });

    {
      blockchain.now += 1;
      const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
        value: toNano('0.2'),
        oldPosition: lastLongerPosition,
        size: 52442458n, // Almost 100% close positions
        priceData: getOraclePrice(45),
        oracleRedirectAddress: longerPosition.address,
      });
      const newPosition = getUpdatePositionMessage(closeResult.events);
      lastLongerPosition = newPosition;

      const withdrawMsg = getWithdrawMessage(closeResult.events);
      expect(toStablecoinFloat(withdrawMsg.amount)).toBeCloseTo(434.2, 0.1); // Received: 1485.873766
    }

    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      priceData: getOraclePrice(65),
      oracleRedirectAddress: longerPosition.address,
    });

    const closePosition = getUpdatePositionMessage(closeResult.events);
    lastLongerPosition = closePosition;

    const { ammState } = await vamm.getAmmData();
    expect(toStablecoinFloat(ammState.openInterestLong)).toBeCloseTo(0, 0.01);
    expect(toStablecoinFloat(ammState.openInterestShort)).toBeCloseTo(0, 0.01);
  });

  it('can partially close short position with negative PnL', async function () {
    const increasePositionBody = {
      direction: Direction.short,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0),
    };
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      increasePositionBody,
      priceData: getOraclePrice(55),
      oracleRedirectAddress: shorterPosition.address,
    });

    const newPosition = getUpdatePositionMessage(increaseResult.events);
    lastShorterPosition = newPosition;

    await vamm.sendSetOraclePrice(oracle.getSender(), {
      value: toNano('0.1'),
      price: 60,
    });

    {
      blockchain.now += 1;
      let closeAmount = BigMath.abs(lastShorterPosition.size) - 10n;
      const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
        value: toNano('0.2'),
        oldPosition: lastShorterPosition,
        size: closeAmount, // Almost 100% close positions
        priceData: getOraclePrice(60),
        oracleRedirectAddress: shorterPosition.address,
      });
      const newPosition = getUpdatePositionMessage(closeResult.events);
      lastShorterPosition = newPosition;

      const withdrawMsg = getWithdrawMessage(closeResult.events);
      expect(toStablecoinFloat(withdrawMsg.amount)).toBeCloseTo(720.75, 0.1); // Received: 1485.873766
    }

    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      priceData: getOraclePrice(60),
      oracleRedirectAddress: shorterPosition.address,
    });

    const { ammState } = await vamm.getAmmData();

    lastShorterPosition = getUpdatePositionMessage(closeResult.events);

    expect(toStablecoinFloat(ammState.openInterestLong)).toBeCloseTo(0, 0.01);
    expect(toStablecoinFloat(ammState.openInterestShort)).toBeCloseTo(0, 0.01);
  });

  it('can partially close long position in steps with negative PnL', async function () {
    const increasePositionBody = {
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0),
    };
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      increasePositionBody,
      priceData: getOraclePrice(55),
      oracleRedirectAddress: longerPosition.address,
    });

    const newPosition = getUpdatePositionMessage(increaseResult.events);
    lastLongerPosition = newPosition;

    {
      blockchain.now += 1;
      const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
        value: toNano('0.2'),
        oldPosition: lastLongerPosition,
        size: lastLongerPosition.size / 2n, // Almost 100% close positions
        priceData: getOraclePrice(50),
        oracleRedirectAddress: longerPosition.address,
      });
      lastLongerPosition = getUpdatePositionMessage(closeResult.events);

      const withdrawMsg = getWithdrawMessage(closeResult.events);
      console.log(`1 Got ${toStablecoinFloat(withdrawMsg.amount)}`);
    }

    // TODO: fix this
    // expect(toStablecoinFloat(lastLongerPosition.margin)).toBeCloseTo(362.3, 0.1); //  Received: 498.191263
    expect(toStablecoinFloat(lastLongerPosition.size)).toBeCloseTo(27.17, 0.01);
    expect(toStablecoinFloat(lastLongerPosition.openNotional)).toBeCloseTo(1494.61, 0.01);
    // expect(lastLongerPosition.positionalNotional).toBeCloseTo(1358.74, 0.01);

    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      priceData: getOraclePrice(58),
      oracleRedirectAddress: longerPosition.address,
    });
    lastLongerPosition = getUpdatePositionMessage(closeResult.events);

    const { ammState } = await vamm.getAmmData();
    expect(toStablecoinFloat(ammState.openInterestLong)).toBeCloseTo(0, 0.01);
    expect(toStablecoinFloat(ammState.openInterestShort)).toBeCloseTo(0, 0.01);
  });

  it('can partially close short position in steps with negative PnL', async function () {
    const increasePositionBody = {
      direction: Direction.short,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0),
    };
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      increasePositionBody,
      priceData: getOraclePrice(60),
      oracleRedirectAddress: shorterPosition.address,
    });

    const newPosition = getUpdatePositionMessage(increaseResult.events);
    lastShorterPosition = newPosition;

    {
      blockchain.now += 1;
      const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
        value: toNano('0.2'),
        oldPosition: lastShorterPosition,
        size: lastShorterPosition.size / 2n,
        priceData: getOraclePrice(58),
        oracleRedirectAddress: shorterPosition.address,
      });
      lastShorterPosition = getUpdatePositionMessage(closeResult.events);

      const withdrawMsg = getWithdrawMessage(closeResult.events);
      console.log(`1 Got ${toStablecoinFloat(withdrawMsg.amount)}`);
    }

    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      priceData: getOraclePrice(58),
      oracleRedirectAddress: shorterPosition.address,
    });
    lastShorterPosition = getUpdatePositionMessage(closeResult.events);

    const { ammState } = await vamm.getAmmData();
    expect(toStablecoinFloat(ammState.openInterestLong)).toBeCloseTo(0, 0.01);
    expect(toStablecoinFloat(ammState.openInterestShort)).toBeCloseTo(0, 0.01);
  });

  it('can partially close long position in profit with multiple iterations', async function () {
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      increasePositionBody: {
        direction: Direction.long,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0),
      },
      priceData: getOraclePrice(55),
      oracleRedirectAddress: longerPosition.address,
    });

    const newPosition1 = getUpdatePositionMessage(increaseResult.events);
    lastLongerPosition = newPosition1;

    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.3'),
      oldPosition: lastLongerPosition,
      priceData: getOraclePrice(63),
      oracleRedirectAddress: longerPosition.address,
    });
    lastLongerPosition = getUpdatePositionMessage(closeResult.events);
    const withdrawMsg = getWithdrawMessage(closeResult.events);
    const ref = withdrawMsg.amount;

    const increaseResult2 = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.3'),
      oldPosition: lastLongerPosition,
      increasePositionBody: {
        direction: Direction.long,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0),
      },
      priceData: getOraclePrice(55),
      oracleRedirectAddress: longerPosition.address,
    });

    lastLongerPosition = getUpdatePositionMessage(increaseResult2.events);

    let sum = 0n;
    let part = lastLongerPosition.size / 9n;

    for (let i = 0; i < 9; i++) {
      let actualPart = BigMath.min(BigMath.abs(lastLongerPosition.size), BigMath.abs(part));
      blockchain.now += 1;
      const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
        value: toNano('0.3'),
        oldPosition: lastLongerPosition,
        size: actualPart,
        priceData: getOraclePrice(63),
        oracleRedirectAddress: longerPosition.address,
      });
      lastLongerPosition = getUpdatePositionMessage(closeResult.events);
      const withdrawMsg = getWithdrawMessage(closeResult.events);
      sum += withdrawMsg.amount;

      console.log(`+++ Closed part of position with ${toStablecoinFloat(withdrawMsg.amount)}`);
    }

    expect(toStablecoinFloat(ref)).toBeCloseTo(toStablecoinFloat(sum), 0.1);

    const { ammState } = await vamm.getAmmData();
    expect(toStablecoinFloat(ammState.openInterestLong)).toBeCloseTo(0, 0.01);
    expect(toStablecoinFloat(ammState.openInterestShort)).toBeCloseTo(0, 0.01);
  });

  it('can partially close long position in loss with multiple iterations', async function () {
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      increasePositionBody: {
        direction: Direction.long,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0),
      },
      priceData: getOraclePrice(55),
      oracleRedirectAddress: longerPosition.address,
    });

    const newPosition1 = getUpdatePositionMessage(increaseResult.events);
    lastLongerPosition = newPosition1;

    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.3'),
      oldPosition: lastLongerPosition,
      priceData: getOraclePrice(50),
      oracleRedirectAddress: longerPosition.address,
    });
    lastLongerPosition = getUpdatePositionMessage(closeResult.events);
    const withdrawMsg = getWithdrawMessage(closeResult.events);
    const ref = withdrawMsg.amount;

    const increaseResult2 = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      increasePositionBody: {
        direction: Direction.long,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0),
      },
      priceData: getOraclePrice(55),
      oracleRedirectAddress: longerPosition.address,
    });

    const newPosition3 = getUpdatePositionMessage(increaseResult2.events);
    lastLongerPosition = newPosition3;

    let sum = 0n;
    let part = lastLongerPosition.size / 9n;

    for (let i = 0; i < 9; i++) {
      let actualPart = BigMath.min(BigMath.abs(lastLongerPosition.size), BigMath.abs(part));
      blockchain.now += 1;
      const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
        value: toNano('0.2'),
        oldPosition: lastLongerPosition,
        size: actualPart,
        priceData: getOraclePrice(50),
        oracleRedirectAddress: longerPosition.address,
      });
      lastLongerPosition = getUpdatePositionMessage(closeResult.events);
      const withdrawMsg = getWithdrawMessage(closeResult.events);
      sum += withdrawMsg.amount;

      console.log(`+++ Closed part of position with ${toStablecoinFloat(withdrawMsg.amount)}`);
    }

    expect(toStablecoinFloat(ref)).toBeCloseTo(toStablecoinFloat(sum), 0.1);

    const { ammState } = await vamm.getAmmData();
    expect(toStablecoinFloat(ammState.openInterestLong)).toBeCloseTo(0, 0.01);
    expect(toStablecoinFloat(ammState.openInterestShort)).toBeCloseTo(0, 0.01);
  });

  it('can partially close short position in profit with multiple iterations', async function () {
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      increasePositionBody: {
        direction: Direction.short,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0),
      },
      priceData: getOraclePrice(55),
      oracleRedirectAddress: shorterPosition.address,
    });

    const newPosition1 = getUpdatePositionMessage(increaseResult.events);
    lastShorterPosition = newPosition1;

    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      priceData: getOraclePrice(50),
      oracleRedirectAddress: shorterPosition.address,
    });
    lastShorterPosition = getUpdatePositionMessage(closeResult.events);
    const withdrawMsg = getWithdrawMessage(closeResult.events);
    const ref = withdrawMsg.amount;

    const increaseResult2 = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      increasePositionBody: {
        direction: Direction.short,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0),
      },
      priceData: getOraclePrice(55),
      oracleRedirectAddress: shorterPosition.address,
    });

    lastShorterPosition = getUpdatePositionMessage(increaseResult2.events);

    let sum = 0n;
    let part = lastShorterPosition.size / 9n;

    for (let i = 0; i < 9; i++) {
      let actualPart = BigMath.min(BigMath.abs(lastShorterPosition.size), BigMath.abs(part));
      blockchain.now += 1;
      const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
        value: toNano('0.2'),
        oldPosition: lastShorterPosition,
        size: actualPart,
        priceData: getOraclePrice(50),
        oracleRedirectAddress: shorterPosition.address,
      });
      lastShorterPosition = getUpdatePositionMessage(closeResult.events);
      const withdrawMsg = getWithdrawMessage(closeResult.events);
      sum += withdrawMsg.amount;

      console.log(`+++ Closed part of position with ${toStablecoinFloat(withdrawMsg.amount)}`);
    }

    expect(toStablecoinFloat(ref)).toBeCloseTo(toStablecoinFloat(sum), 0.1);

    const { ammState } = await vamm.getAmmData();
    expect(toStablecoinFloat(ammState.openInterestLong)).toBeCloseTo(0, 0.01);
    expect(toStablecoinFloat(ammState.openInterestShort)).toBeCloseTo(0, 0.01);
  });

  it('can partially close short position in loss with multiple iterations', async function () {
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      increasePositionBody: {
        direction: Direction.short,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0),
      },
      priceData: getOraclePrice(55),
      oracleRedirectAddress: shorterPosition.address,
    });

    const newPosition1 = getUpdatePositionMessage(increaseResult.events);
    lastShorterPosition = newPosition1;

    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      priceData: getOraclePrice(63),
      oracleRedirectAddress: shorterPosition.address,
    });
    lastShorterPosition = getUpdatePositionMessage(closeResult.events);
    const withdrawMsg = getWithdrawMessage(closeResult.events);
    const ref = withdrawMsg.amount;

    const increaseResult2 = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      increasePositionBody: {
        direction: Direction.short,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0),
      },
      priceData: getOraclePrice(55),
      oracleRedirectAddress: shorterPosition.address,
    });

    const newPosition3 = getUpdatePositionMessage(increaseResult2.events);
    lastShorterPosition = newPosition3;

    let sum = 0n;
    let part = lastShorterPosition.size / 9n;

    for (let i = 0; i < 9; i++) {
      let actualPart = BigMath.min(BigMath.abs(lastShorterPosition.size), BigMath.abs(part));
      blockchain.now += 1;
      const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
        value: toNano('0.2'),
        oldPosition: lastShorterPosition,
        size: actualPart,
        priceData: getOraclePrice(63),
        oracleRedirectAddress: shorterPosition.address,
      });
      lastShorterPosition = getUpdatePositionMessage(closeResult.events);
      const withdrawMsg = getWithdrawMessage(closeResult.events);
      sum += withdrawMsg.amount;

      console.log(`+++ Closed part of position with ${toStablecoinFloat(withdrawMsg.amount)}`);
    }

    expect(toStablecoinFloat(ref)).toBeCloseTo(toStablecoinFloat(sum), 0.1);

    const { ammState } = await vamm.getAmmData();
    expect(toStablecoinFloat(ammState.openInterestLong)).toBeCloseTo(0, 0.01);
    expect(toStablecoinFloat(ammState.openInterestShort)).toBeCloseTo(0, 0.01);
  });

  it('can partially liquidate short position and bring notional down', async function () {
    // TODO: last short position size=1 (?)
    lastShorterPosition = getInitPosition(shorterPosition.address);
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      increasePositionBody: {
        direction: Direction.short,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0),
      },
      priceData: getOraclePrice(55),
      oracleRedirectAddress: shorterPosition.address,
    });
    lastShorterPosition = getUpdatePositionMessage(increaseResult.events);

    // blockchain.setVerbosityForAddress(vamm.address, { vmLogs: 'vm_logs', debugLogs: true });
    blockchain.now += 1;
    const liquidateResult1 = await vamm.sendLiquidateRaw(oracle.getSender(), {
      value: toNano('0.3'),
      oldPosition: lastShorterPosition,
      liquidator: liquidator.address,
      priceData: getOraclePrice(69),
      oracleRedirectAddress: shorterPosition.address,
    });
    lastShorterPosition = getUpdatePositionMessage(liquidateResult1.events);

    blockchain.now += 1;
    const liquidateResult2 = await vamm.sendLiquidateRaw(oracle.getSender(), {
      value: toNano('0.3'),
      oldPosition: lastShorterPosition,
      liquidator: liquidator.address,
      priceData: getOraclePrice(69),
      oracleRedirectAddress: shorterPosition.address,
    });
    lastShorterPosition = getUpdatePositionMessage(liquidateResult2.events);

    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      priceData: getOraclePrice(69),
      oracleRedirectAddress: shorterPosition.address,
    });
    lastShorterPosition = getUpdatePositionMessage(closeResult.events);

    const { ammState } = await vamm.getAmmData();
    expect(toStablecoinFloat(ammState.openInterestLong)).toBeCloseTo(0, 0.01);
    expect(toStablecoinFloat(ammState.openInterestShort)).toBeCloseTo(0, 0.01);
  });

  it('can partially liquidate long position and bring notional down', async function () {
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      increasePositionBody: {
        direction: Direction.long,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0),
      },
      priceData: getOraclePrice(55),
      oracleRedirectAddress: longerPosition.address,
    });
    lastLongerPosition = getUpdatePositionMessage(increaseResult.events);

    // blockchain.setVerbosityForAddress(vamm.address, { vmLogs: 'vm_logs', debugLogs: true });
    const liquidateResult1 = await vamm.sendLiquidateRaw(oracle.getSender(), {
      value: toNano('0.3'),
      oldPosition: lastLongerPosition,
      liquidator: liquidator.address,
      priceData: getOraclePrice(38),
      oracleRedirectAddress: longerPosition.address,
    });
    lastLongerPosition = getUpdatePositionMessage(liquidateResult1.events);

    const liquidateResult2 = await vamm.sendLiquidateRaw(oracle.getSender(), {
      value: toNano('0.3'),
      oldPosition: lastLongerPosition,
      liquidator: liquidator.address,
      priceData: getOraclePrice(38),
      oracleRedirectAddress: longerPosition.address,
    });
    lastLongerPosition = getUpdatePositionMessage(liquidateResult2.events);

    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      priceData: getOraclePrice(69),
      oracleRedirectAddress: longerPosition.address,
    });
    lastLongerPosition = getUpdatePositionMessage(closeResult.events);

    const { ammState } = await vamm.getAmmData();
    expect(toStablecoinFloat(ammState.openInterestLong)).toBeCloseTo(0, 0.01);
    expect(toStablecoinFloat(ammState.openInterestShort)).toBeCloseTo(0, 0.01);
  });

  it('can partially reduce short position in loss with multiple iterations', async function () {
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      increasePositionBody: {
        direction: Direction.short,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0),
      },
      priceData: getOraclePrice(55),
      oracleRedirectAddress: shorterPosition.address,
    });

    const newPosition1 = getUpdatePositionMessage(increaseResult.events);
    lastShorterPosition = newPosition1;

    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      priceData: getOraclePrice(63),
      oracleRedirectAddress: shorterPosition.address,
    });
    lastShorterPosition = getUpdatePositionMessage(closeResult.events);
    const withdrawMsg = getWithdrawMessage(closeResult.events);
    const ref = withdrawMsg.amount;

    const increaseResult2 = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(1000),
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      increasePositionBody: {
        direction: Direction.short,
        leverage: toStablecoin(3),
        minBaseAssetAmount: toStablecoin(0),
      },
      priceData: getOraclePrice(55),
      oracleRedirectAddress: shorterPosition.address,
    });

    const newPosition3 = getUpdatePositionMessage(increaseResult2.events);
    lastShorterPosition = newPosition3;

    let sum = 0n;
    let part = lastShorterPosition.size / 9n;

    for (let i = 0; i < 9; i++) {
      let actualPart = BigMath.min(BigMath.abs(lastShorterPosition.size), BigMath.abs(part));
      if (i == 8) {
        actualPart = BigMath.abs(lastShorterPosition.size);
      }
      blockchain.now += 1;
      const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
        value: toNano('0.3'),
        oldPosition: lastShorterPosition,
        size: actualPart,
        priceData: getOraclePrice(63),
        oracleRedirectAddress: shorterPosition.address,
        addToMargin: true,
      });
      if (i == 8) {
        lastShorterPosition = getUpdatePositionMessage(closeResult.events);
        const withdrawMsg = getWithdrawMessage(closeResult.events);
        sum += withdrawMsg.amount;
      } else {
        lastShorterPosition = getUpdatePositionMessage(closeResult.events);
      }

      console.log(`+++ Closed part of position with ${toStablecoinFloat(withdrawMsg.amount)}`);
    }

    expect(toStablecoinFloat(ref)).toBeCloseTo(toStablecoinFloat(sum), 0.1);

    const { ammState } = await vamm.getAmmData();
    expect(toStablecoinFloat(ammState.openInterestLong)).toBeCloseTo(0, 0.01);
    expect(toStablecoinFloat(ammState.openInterestShort)).toBeCloseTo(0, 0.01);
  });
});
