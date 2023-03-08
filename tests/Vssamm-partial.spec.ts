import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { sleep } from '@ton-community/blueprint/dist/utils';
import { toNano } from 'ton-core';

import { IncreasePositionBody, Vamm } from '../wrappers/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import { PositionData } from '../wrappers/TraderPositionWallet';
import { getAndUnpackPosition, getAndUnpackWithdrawMessage, toStablecoin } from '../utils';
import { extractEvents } from '@ton-community/sandbox/dist/event/Event';

const Direction = {
  long: 1,
  short: 2,
};

const emptyPosition = {
  size: 0n,
  margin: 0n,
  openNotional: 0n,
  lastUpdatedCumulativePremium: 0n,
  fee: 0n,
  lastUpdatedTimestamp: 0n,
};

describe('vAMM should work with positive funding', () => {
  let blockchain: Blockchain;
  let vamm: SandboxContract<Vamm>;
  let longer: SandboxContract<TreasuryContract>;
  let longerPosition: SandboxContract<TreasuryContract>;
  let lastLongerPosition: PositionData;
  let shorter: SandboxContract<TreasuryContract>;
  let shorterPosition: SandboxContract<TreasuryContract>;
  let lastShorterPosition: PositionData;
  let router: SandboxContract<TreasuryContract>;

  beforeAll(async () => {
    blockchain = await Blockchain.create();
    blockchain.verbosity = {
      print: true,
      vmLogs: 'vm_logs',
      blockchainLogs: true,
      debugLogs: true,
    };

    longer = await blockchain.treasury('longer');
    longerPosition = await blockchain.treasury('longerPosition');
    lastLongerPosition = { ...emptyPosition, traderAddress: longer.address };

    shorter = await blockchain.treasury('shorter');
    shorterPosition = await blockchain.treasury('shorterPosition');
    lastShorterPosition = { ...emptyPosition, traderAddress: shorter.address };

    router = await blockchain.treasury('router');
    vamm = blockchain.openContract(
      Vamm.createFromConfig(
        initVammData({ liquidity: 100_000, price: 55, opts: { routerAddr: router.address } }),
        await compile('Vamm')
      )
    );

    const deployer = await blockchain.treasury('deployer');
    await vamm.sendDeploy(deployer.getSender(), toNano('0.5'));
  });

  it('Can open position', async () => {
    const increasePositionBody: IncreasePositionBody = {
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.15),
      amount: toStablecoin(10),
    };
    const increaseResult = await vamm.sendIncreasePosition(longerPosition.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
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
      amount: toStablecoin(5),
    };
    const increaseResult = await vamm.sendIncreasePosition(longerPosition.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      increasePositionBody,
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
    const addMarginResult = await vamm.sendAddMargin(longerPosition.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      amount: toStablecoin(3),
    });

    expect(addMarginResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: longerPosition.address,
    });

    const newPosition = getAndUnpackPosition(addMarginResult.events);
    lastLongerPosition = newPosition;

    expect(newPosition.size).toBe(814882n);
    expect(newPosition.margin).toBe(17946194n);
    expect(newPosition.openNotional).toBe(44838582n);
  });

  it('Can remove margin', async () => {
    const removeMarginResult = await vamm.sendRemoveMargin(longerPosition.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      amount: toStablecoin(2),
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
    const removeMarginResult = await vamm.sendRemoveMargin(longerPosition.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      amount: toStablecoin(110),
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
      amount: toStablecoin(5),
      direction: Direction.short,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.15),
    };
    const increaseResult = await vamm.sendIncreasePosition(shorterPosition.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      increasePositionBody,
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
      amount: toStablecoin(1),
      direction: Direction.short,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.04),
    };
    const increaseResult = await vamm.sendIncreasePosition(shorterPosition.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastShorterPosition,
      increasePositionBody,
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

  it('Can close long position', async () => {
    await sleep(1100);
    const closeResult = await vamm.sendClosePosition(longerPosition.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
    });

    expect(closeResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: longerPosition.address,
    });
    expect(closeResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: router.address,
    });
    const newPosition = getAndUnpackPosition(closeResult.events, 2);
    lastLongerPosition = newPosition;

    console.log('closeResult.events', closeResult.events);

    const withdrawMsg = getAndUnpackWithdrawMessage(closeResult.events, 1);
    expect(withdrawMsg.amount).toBe(15876342n); // 15930146n
  });

  // it('Can close short position', async () => {
  //   await sleep(1100);
  //   const closeResult = await vamm.sendClosePosition(shorterPosition.getSender(), {
  //     value: toNano('0.2'),
  //     oldPosition: lastShorterPosition,
  //     size: absBigint(lastShorterPosition.size),
  //   });

  //   // expect(closeResult.transactions).toHaveTransaction({
  //   //   from: vamm.address,
  //   //   to: longerPosition.address,
  //   // });
  //   expect(closeResult.transactions).toHaveTransaction({
  //     from: vamm.address,
  //     to: router.address,
  //   });
  //   // const newPosition = getAndUnpackPosition(closeResult.events);
  //   // lastLongerPosition = newPosition;

  //   // const withdrawMsg = getAndUnpackWithdrawMessage(closeResult.events, -2);
  //   // expect(withdrawMsg.amount).toBe(5973063n); // 5994549n
  // });

  // it('Can partially close long position', async () => {
  //   const increasePositionBody: IncreasePositionBody = {
  //     direction: Direction.long,
  //     leverage: toStablecoin(3),
  //     minBaseAssetAmount: toStablecoin(0),
  //     amount: toStablecoin(150),
  //   };
  //   const increaseResult = await vamm.sendIncreasePosition(longerPosition.getSender(), {
  //     value: toNano('0.2'),
  //     oldPosition: lastLongerPosition,
  //     increasePositionBody,
  //   });
  //   expect(increaseResult.transactions).toHaveTransaction({
  //     from: vamm.address,
  //     to: longerPosition.address,
  //   });

  //   const p1 = getAndUnpackPosition(increaseResult.events);
  //   expect(p1.size).toBe(8116078n);
  //   expect(p1.margin).toBe(149461937n);
  //   expect(p1.openNotional).toBe(448385811n);

  //   await sleep(1100);
  //   const pcResult = await vamm.sendClosePosition(longerPosition.getSender(), {
  //     value: toNano('0.2'),
  //     oldPosition: lastLongerPosition,
  //     size: toStablecoin(4),
  //     minQuoteAssetAmount: toStablecoin(200),
  //   });

  //   const p2 = getAndUnpackPosition(pcResult.events);
  //   lastLongerPosition = p2;

  //   expect(p2.size).toBe(4116078n);
  //   expect(p2.margin).toBe(75632573n);
  //   expect(p2.openNotional).toBe(226897950n);

  //   const withdrawMsg = getAndUnpackWithdrawMessage(pcResult.events, -2);
  //   expect(withdrawMsg.amount).toBe(73564181n);

  //   const closeResult = await vamm.sendClosePosition(longerPosition.getSender(), {
  //     value: toNano('0.2'),
  //     oldPosition: lastLongerPosition,
  //   });

  //   const withdrawMsg2 = getAndUnpackWithdrawMessage(closeResult.events, -2);
  //   expect(withdrawMsg2.amount).toBe(75360296n);
  // });
});
