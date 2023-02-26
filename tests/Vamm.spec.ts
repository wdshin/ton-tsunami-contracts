import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { Blockchain } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';

import { IncreasePositionBody, Vamm } from '../wrappers/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import {
  PositionData,
  unpackPositionData,
} from '../wrappers/TraderPositionWallet';
import { toStablecoin } from '../utils';

describe('Vamm', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('Vamm');
  });

  it('should increase position', async () => {
    const blockchain = await Blockchain.create();
    blockchain.verbosity = 'vm_logs';

    const vamm = blockchain.openContract(
      Vamm.createFromConfig(initVammData, code)
    );

    const deployer = await blockchain.treasury('deployer');

    await deployer.send({
      init: vamm.init!,
      value: toNano('0.5'),
      to: vamm.address,
      bounce: false,
    });

    const trader = await blockchain.treasury('trader');

    const oldPosition: PositionData = {
      size: 0n,
      margin: 0n,
      openNotional: 0n,
      lastUpdatedCumulativePremium: 0n,
      fee: 0n,
      lastUpdatedTimestamp: 0n,
    };
    const increasePositionBody: IncreasePositionBody = {
      direction: 1,
      leverage: toStablecoin(2),
      minBaseAssetAmount: toStablecoin(10),
      traderAddress: trader.address,
    };

    const increaser = await blockchain.treasury('increaser');

    const increaseResult = await increaser.send({
      to: vamm.address,
      value: toNano('0.5'),
      body: Vamm.increasePosition({
        amount: toStablecoin(200),
        oldPosition,
        increasePositionBody,
      }),
    });

    expect(increaseResult.transactions).toHaveTransaction({
      from: vamm.address,
      to: increaser.address,
    });

    const lastTx = increaseResult.events.at(-1);

    if (lastTx?.type === 'message_sent') {
      const newPosition = unpackPositionData(lastTx.body);
      console.log({ oldPosition });
      console.log({ newPosition });
    }
  });
});
