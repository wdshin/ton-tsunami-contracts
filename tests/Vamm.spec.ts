import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import {
  Blockchain,
  OpenedContract,
  TreasuryContract,
} from '@ton-community/sandbox';
import { toNano } from 'ton-core';

import { IncreasePositionBody, Vamm } from '../wrappers/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import {
  PositionData,
  unpackPositionData,
} from '../wrappers/TraderPositionWallet';
import { toStablecoin } from '../utils';

const Direction = {
  long: 1,
  short: 2,
};

describe('Vamm', () => {
  let blockchain: Blockchain;
  let vamm: OpenedContract<Vamm>;
  let longer: OpenedContract<TreasuryContract>;
  let longerPosition: OpenedContract<TreasuryContract>;
  let lastPosition: PositionData;

  beforeAll(async () => {
    blockchain = await Blockchain.create();
    blockchain.verbosity = 'vm_logs';

    longer = await blockchain.treasury('longer');
    longerPosition = await blockchain.treasury('longerPosition');
    vamm = blockchain.openContract(
      Vamm.createFromConfig(
        initVammData({ liquidity: 100_000, price: 55 }),
        await compile('Vamm')
      )
    );

    const deployer = await blockchain.treasury('deployer');
    await deployer.send({
      init: vamm.init!,
      value: toNano('0.5'),
      to: vamm.address,
      bounce: false,
    });
  });

  it('Can open position', async () => {
    const oldPosition: PositionData = {
      size: 0n,
      margin: 0n,
      openNotional: 0n,
      lastUpdatedCumulativePremium: 0n,
      fee: 0n,
      lastUpdatedTimestamp: 0n,
    };
    const increasePositionBody: IncreasePositionBody = {
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.15),
      traderAddress: longer.address,
      amount: toStablecoin(10),
    };

    const increaseResult = await longerPosition.send({
      to: vamm.address,
      value: toNano('0.5'),
      body: Vamm.increasePosition({
        oldPosition,
        increasePositionBody,
      }),
    });
    expect(increaseResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: longerPosition.address,
    });

    const lastTx = increaseResult.events.at(-1);
    expect(lastTx?.type).toBe('message_sent');

    if (lastTx?.type !== 'message_sent') throw new Error('nope');

    const newPosition = unpackPositionData(
      lastTx.body
        .beginParse()
        .skip(32 + 64)
        .preloadRef()
    );

    expect(newPosition.size).toBe(543336n);
    expect(newPosition.margin).toBe(9964129n);
    expect(newPosition.openNotional).toBe(29892387n);
    lastPosition = newPosition;

    const { ammState } = await vamm.getAmmData();

    const totalSize =
      ammState.totalLongPositionSize - ammState.totalShortPositionSize;
    expect(totalSize).toBe(543336n);
    expect(ammState.totalLongPositionSize).toBe(543336n);
    expect(ammState.totalShortPositionSize).toBe(0n);
  });

  it('Can increase position', async () => {
    const increasePositionBody: IncreasePositionBody = {
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.15),
      traderAddress: longer.address,
      amount: toStablecoin(5),
    };
    const increaseResult = await longerPosition.send({
      to: vamm.address,
      value: toNano('0.5'),
      body: Vamm.increasePosition({
        oldPosition: lastPosition,
        increasePositionBody,
      }),
    });

    expect(increaseResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: longerPosition.address,
    });

    const lastTx = increaseResult.events.at(-1);
    expect(lastTx?.type).toBe('message_sent');

    if (lastTx?.type !== 'message_sent') throw new Error('nope');

    const newPosition = unpackPositionData(
      lastTx.body
        .beginParse()
        .skip(32 + 64)
        .preloadRef()
    );

    expect(newPosition.size).toBe(814882n);
    expect(newPosition.margin).toBe(14946194n);
    expect(newPosition.openNotional).toBe(44838582n);
    lastPosition = newPosition;

    const { ammState } = await vamm.getAmmData();

    const totalSize =
      ammState.totalLongPositionSize - ammState.totalShortPositionSize;
    expect(totalSize).toBe(814882n);
    expect(ammState.totalLongPositionSize).toBe(814882n);
    expect(ammState.totalShortPositionSize).toBe(0n);
  });
});
