import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { sleep } from '@ton-community/blueprint/dist/utils';
import { toNano } from 'ton-core';

import { Direction, Vamm } from '../wrappers/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import { PositionData } from '../wrappers/TraderPositionWallet';
import {
  getAndUnpackPosition,
  getAndUnpackWithdrawMessage,
  getInitPosition,
  toStablecoin,
  toStablecoinFloat,
} from '../utils';
import { extractEvents } from '@ton-community/sandbox/dist/event/Event';

describe('vAMM should be able to partially close position', () => {
  let blockchain: Blockchain;
  let router: SandboxContract<TreasuryContract>;
  let vamm: SandboxContract<Vamm>;
  let longer: SandboxContract<TreasuryContract>;
  let longerPosition: SandboxContract<TreasuryContract>;
  let lastLongerPosition: PositionData;
  let shorter: SandboxContract<TreasuryContract>;
  let shorterPosition: SandboxContract<TreasuryContract>;
  let lastShorterPosition: PositionData;

  beforeAll(async () => {
    blockchain = await Blockchain.create();
    // blockchain.verbosity = {
    //   print: true,
    //   vmLogs: 'vm_logs',
    //   blockchainLogs: true,
    //   debugLogs: true,
    // };

    longer = await blockchain.treasury('longer');
    longerPosition = await blockchain.treasury('longerPosition');
    lastLongerPosition = getInitPosition(longer.address);

    shorter = await blockchain.treasury('shorter');
    shorterPosition = await blockchain.treasury('shorterPosition');
    lastShorterPosition = getInitPosition(shorter.address);

    router = await blockchain.treasury('router');
    vamm = blockchain.openContract(
      Vamm.createFromConfig(
        initVammData({ liquidity: 1_000_000_000, price: 55, opts: { routerAddr: router.address } }),
        await compile('Vamm')
      )
    );

    await vamm.sendDeploy(router.getSender(), toNano('0.5'));
  });

  beforeEach(async () => {
    await vamm.sendSetOraclePrice(router.getSender(), {
      value: toNano('0.05'),
      price: toStablecoin(55),
    });
  });

  it('can partially close long position with positive PnL', async () => {
    const increasePositionBody = {
      amount: toStablecoin(1000),
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.15),
    };
    const increaseResult = await vamm.sendIncreasePosition(longerPosition.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
      increasePositionBody,
    });

    const newPosition = getAndUnpackPosition(increaseResult.events);
    lastLongerPosition = newPosition;

    await vamm.sendSetOraclePrice(router.getSender(), {
      value: toNano('0.05'),
      price: toStablecoin(65),
    });

    {
      console.log(`Position size = ${lastLongerPosition.size}`);
      await sleep(1100);
      const closeResult = await vamm.sendClosePosition(longerPosition.getSender(), {
        value: toNano('0.2'),
        oldPosition: lastLongerPosition,
        size: 52442458n, // Almost 100% close positions
      });
      const newPosition = getAndUnpackPosition(closeResult.events, 2);
      lastLongerPosition = newPosition;

      const withdrawMsg = getAndUnpackWithdrawMessage(closeResult.events, 1);
      expect(toStablecoinFloat(withdrawMsg.amount)).toBeCloseTo(1481.8, 0.1); // Received: 1485.873766
    }

    await sleep(1100);
    const closeResult = await vamm.sendClosePosition(longerPosition.getSender(), {
      value: toNano('0.2'),
      oldPosition: lastLongerPosition,
    });

    const { ammState } = await vamm.getAmmData();

    const closePosition = getAndUnpackPosition(closeResult.events, 2);
    lastLongerPosition = closePosition;

    console.log({ ammState });

    expect(toStablecoinFloat(ammState.openInterestLong)).toBeCloseTo(0, 0.01);
    expect(toStablecoinFloat(ammState.openInterestShort)).toBeCloseTo(0, 0.01);
  });
});
