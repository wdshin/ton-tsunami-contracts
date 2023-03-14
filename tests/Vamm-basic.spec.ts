import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { extractEvents } from '@ton-community/sandbox/dist/event/Event';
import { toNano } from 'ton-core';

import { Direction, IncreasePositionBody, Vamm } from '../wrappers/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import { PositionData } from '../wrappers/PositionWallet';
import { OraclePrice } from '../wrappers/Oracle';
import { MyBlockchain } from '../wrappers/MyBlockchain/MyBlockchain';

import {
  getAndUnpackPosition,
  getAndUnpackWithdrawMessage,
  getInitPosition,
  toStablecoin,
} from '../utils';

const priceData: OraclePrice = {
  price: toStablecoin(55),
  lastUpdateBlockLT: 0,
  lastUpdateTS: 0,
};

describe('vAMM should work with positive funding', () => {
  let blockchain: MyBlockchain;
  let vamm: SandboxContract<Vamm>;
  let longer: SandboxContract<TreasuryContract>;
  let longerPosition: SandboxContract<TreasuryContract>;
  let lastLongerPosition: PositionData;
  let shorter: SandboxContract<TreasuryContract>;
  let shorterPosition: SandboxContract<TreasuryContract>;
  let lastShorterPosition: PositionData;
  let jettonWallet: SandboxContract<TreasuryContract>;
  let oracle: SandboxContract<TreasuryContract>;

  beforeAll(async () => {
    blockchain = await MyBlockchain.create();
    // blockchain.verbosity = {
    //   print: true,
    //   vmLogs: 'vm_logs',
    //   blockchainLogs: true,
    //   debugLogs: true,
    // };

    oracle = await blockchain.treasury('oracle');
    jettonWallet = await blockchain.treasury('jettonWallet');
    longer = await blockchain.treasury('longer');
    longerPosition = await blockchain.treasury('longerPosition');
    lastLongerPosition = getInitPosition(longer.address);

    shorter = await blockchain.treasury('shorter');
    shorterPosition = await blockchain.treasury('shorterPosition');
    lastShorterPosition = getInitPosition(shorter.address);

    vamm = blockchain.openContract(
      Vamm.createFromConfig(
        initVammData({
          liquidity: 100_000,
          price: 55,
          indexId: 123,
          opts: { oracleAddress: oracle.address },
        }),
        await compile('Vamm')
      )
    );

    const deployer = await blockchain.treasury('deployer');
    await vamm.sendDeploy(deployer.getSender(), toNano('0.5'), jettonWallet.address);
  });

  it('Can open position', async () => {
    const increasePositionBody: IncreasePositionBody = {
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.15),
    };
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      value: toNano('0.2'),
      amount: toStablecoin(10),
      oldPosition: lastLongerPosition,
      priceData,
      oracleRedirectAddress: longerPosition.address,
      increasePositionBody,
    });
    expect(increaseResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: longerPosition.address,
    });

    const newPosition = getAndUnpackPosition(increaseResult.events);

    expect(newPosition.size).toBe(543336n);
    expect(newPosition.margin).toBe(9964129n);
    expect(newPosition.openNotional).toBe(29892387n);
    lastLongerPosition = newPosition;

    const { ammState } = await vamm.getAmmData();

    const totalSize = ammState.totalLongPositionSize - ammState.totalShortPositionSize;
    expect(totalSize).toBe(543336n);
    expect(ammState.totalLongPositionSize).toBe(543336n);
    expect(ammState.totalShortPositionSize).toBe(0n);
  });

  it('Can increase position', async () => {
    const increasePositionBody: IncreasePositionBody = {
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.15),
    };
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(5),
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      increasePositionBody,
      priceData,
      oracleRedirectAddress: longerPosition.address,
    });

    expect(increaseResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: longerPosition.address,
    });

    const newPosition = getAndUnpackPosition(increaseResult.events);

    expect(newPosition.size).toBe(814882n);
    expect(newPosition.margin).toBe(14946194n);
    expect(newPosition.openNotional).toBe(44838582n);
    lastLongerPosition = newPosition;

    const { ammState } = await vamm.getAmmData();

    const totalSize = ammState.totalLongPositionSize - ammState.totalShortPositionSize;
    expect(totalSize).toBe(814882n);
    expect(ammState.totalLongPositionSize).toBe(814882n);
    expect(ammState.totalShortPositionSize).toBe(0n);
  });

  it('Can add margin', async () => {
    const addMarginResult = await vamm.sendAddMargin(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      amount: toStablecoin(3),
      priceData,
      oracleRedirectAddress: longerPosition.address,
    });

    expect(addMarginResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: longerPosition.address,
    });

    lastLongerPosition = getAndUnpackPosition(addMarginResult.events);

    expect(lastLongerPosition.size).toBe(814882n);
    expect(lastLongerPosition.margin).toBe(17946194n);
    expect(lastLongerPosition.openNotional).toBe(44838582n);
  });

  it('Can remove margin', async () => {
    const removeMarginResult = await vamm.sendRemoveMargin(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      amount: toStablecoin(2),
      priceData,
      oracleRedirectAddress: longerPosition.address,
    });

    expect(removeMarginResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: longerPosition.address,
    });

    const newPosition = getAndUnpackPosition(removeMarginResult.events);
    lastLongerPosition = newPosition;

    expect(newPosition.size).toBe(814882n);
    expect(newPosition.margin).toBe(15946194n);
    expect(newPosition.openNotional).toBe(44838582n);
  });

  it('Can not remove too much margin', async () => {
    const removeMarginResult = await vamm.sendRemoveMargin(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      amount: toStablecoin(110),
      priceData,
      oracleRedirectAddress: longerPosition.address,
    });

    const events = extractEvents(removeMarginResult.transactions.at(-1)!);
    const updatePositionSended = events.some((event) => {
      if (event.type === 'message_sent') {
        return event.from === vamm.address && event.to === longerPosition.address;
      }
      return false;
    });
    expect(updatePositionSended).toBe(false);
  });

  it('Can open short position', async () => {
    const increasePositionBody: IncreasePositionBody = {
      direction: Direction.short,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.15),
    };
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      increasePositionBody,
      amount: toStablecoin(5),
      priceData,
      oracleRedirectAddress: shorterPosition.address,
    });

    expect(increaseResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: shorterPosition.address,
    });

    const newPosition = getAndUnpackPosition(increaseResult.events);
    lastShorterPosition = newPosition;

    expect(newPosition.size).toBe(-271546n);
    expect(newPosition.margin).toBe(4982065n);
    expect(newPosition.openNotional).toBe(14946195n);
  });

  it('Can increase short position', async () => {
    const increasePositionBody: IncreasePositionBody = {
      direction: Direction.short,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.04),
    };
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      increasePositionBody,
      amount: toStablecoin(1),
      priceData,
      oracleRedirectAddress: shorterPosition.address,
    });

    expect(increaseResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: shorterPosition.address,
    });
    const newPosition = getAndUnpackPosition(increaseResult.events);
    lastShorterPosition = newPosition;

    expect(newPosition.size).toBe(-325865n);
    expect(newPosition.margin).toBe(5978478n);
    expect(newPosition.openNotional).toBe(17935434n);
  });

  it('Can pay funding', async () => {
    blockchain.now += 60 + 1;
    await vamm.sendPayFundingRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oracleRedirectAddress: longer.address,
      priceData,
    });
  });

  it('Can close long position', async () => {
    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      priceData,
      oracleRedirectAddress: longerPosition.address,
    });

    expect(closeResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: longerPosition.address,
    });
    expect(closeResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: jettonWallet.address,
    });

    const newPosition = getAndUnpackPosition(closeResult.events, 2);
    lastLongerPosition = newPosition;

    const withdrawMsg = getAndUnpackWithdrawMessage(closeResult.events, 1);
    expect(withdrawMsg.amount).toBe(15876342n);
  });

  it('Can close short position', async () => {
    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      priceData,
      oracleRedirectAddress: shorterPosition.address,
    });

    expect(closeResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: shorterPosition.address,
    });
    expect(closeResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: jettonWallet.address,
    });
    const newPosition = getAndUnpackPosition(closeResult.events, 2);
    lastShorterPosition = newPosition;

    const withdrawMsg = getAndUnpackWithdrawMessage(closeResult.events, 1);
    expect(withdrawMsg.amount).toBe(5973063n); // 5994549n
  });

  it('Can partially close long position', async () => {
    const increasePositionBody = {
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0),
    };
    const increaseResult = await vamm.sendIncreasePosition(oracle.getSender(), {
      amount: toStablecoin(150),
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      increasePositionBody,
      priceData,
      oracleRedirectAddress: longerPosition.address,
    });
    expect(increaseResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: longerPosition.address,
    });

    const p1 = getAndUnpackPosition(increaseResult.events);
    lastLongerPosition = p1;
    expect(p1.size).toBe(8116078n);
    expect(p1.margin).toBe(149461937n);
    expect(p1.openNotional).toBe(448385811n);

    blockchain.now += 1;
    const pcResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      size: toStablecoin(4),
      minQuoteAssetAmount: toStablecoin(200),
      priceData,
      oracleRedirectAddress: longerPosition.address,
    });

    const p2 = getAndUnpackPosition(pcResult.events, 2);
    lastLongerPosition = p2;

    expect(p2.size).toBe(4116078n);
    expect(p2.margin).toBe(75632573n);
    expect(p2.openNotional).toBe(226897950n);

    const withdrawMsg = getAndUnpackWithdrawMessage(pcResult.events, 1);
    expect(withdrawMsg.amount).toBe(73564181n);

    blockchain.now += 1;
    const closeResult = await vamm.sendClosePositionRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      priceData,
      oracleRedirectAddress: longerPosition.address,
    });

    const withdrawMsg2 = getAndUnpackWithdrawMessage(closeResult.events, 1);
    expect(withdrawMsg2.amount).toBe(75360296n);
  });
});
