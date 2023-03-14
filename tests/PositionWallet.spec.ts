import '@ton-community/test-utils';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { compile } from '@ton-community/blueprint';
import { toNano } from 'ton-core';

import {
  PositionWallet,
  PositionWalletErrors,
  unpackPositionData,
} from '../wrappers/PositionWallet';
import { getCurrentTimestamp } from '../utils';

describe('PositionWallet', () => {
  let positionWallet: SandboxContract<PositionWallet>;
  let vamm: SandboxContract<TreasuryContract>;
  let trader: SandboxContract<TreasuryContract>;

  beforeAll(async () => {
    const blockchain = await Blockchain.create();
    vamm = await blockchain.treasury('vamm');
    trader = await blockchain.treasury('trader');

    positionWallet = blockchain.openContract(
      PositionWallet.createEmpty(vamm.address, trader.address, await compile('PositionWallet'))
    );

    const deployer = await blockchain.treasury('deployer');
    await positionWallet.sendDeploy(deployer.getSender(), toNano('0.05'));
  });

  it('should provide position data price with trader address', async () => {
    const result = await positionWallet.sendProvidePosition(vamm.getSender(), {
      value: toNano('0.05'),
      redirectAddress: vamm.address,
    });

    expect(result.transactions).toHaveTransaction({
      from: positionWallet.address,
      to: vamm.address,
    });
    const responseMessage = result.events.at(-1);
    expect(responseMessage?.type).toEqual('message_sent');
    if (responseMessage?.type !== 'message_sent') throw new Error('Response was not sent');
    const cs = responseMessage.body.beginParse();

    const outData = unpackPositionData(cs.preloadRef());

    expect(outData.size).toEqual(0n);
    expect(outData.lastUpdatedTimestamp).toEqual(0n);
    expect(outData.traderAddress.equals(trader.address)).toEqual(true);
  });

  it('should reject next provide request without unlock', async () => {
    const result = await positionWallet.sendProvidePosition(vamm.getSender(), {
      value: toNano('0.05'),
      redirectAddress: vamm.address,
    });

    expect(result.transactions).toHaveTransaction({
      from: vamm.address,
      to: positionWallet.address,
      exitCode: PositionWalletErrors.busy,
    });
    const data = await positionWallet.getPositionData();
    expect(data.isBusy).toEqual(true);
  });

  it('should unlock position', async () => {
    const result = await positionWallet.sendUnlockPosition(vamm.getSender(), {
      value: toNano('0.05'),
    });

    expect(result.transactions).toHaveTransaction({
      from: vamm.address,
      to: positionWallet.address,
      success: true,
    });

    const data = await positionWallet.getPositionData();
    expect(data.isBusy).toEqual(false);
  });

  it('should provide then update position', async () => {
    await positionWallet.sendProvidePosition(vamm.getSender(), {
      value: toNano('0.05'),
      redirectAddress: vamm.address,
    });

    const newPositionData = {
      size: 100n,
      traderAddress: trader.address,
      lastUpdatedTimestamp: BigInt(getCurrentTimestamp()),
      openNotional: 100n,
      lastUpdatedCumulativePremium: 200n,
      fee: 12n,
      margin: 10000n,
    };
    const result = await positionWallet.sendUpdatePosition(vamm.getSender(), {
      value: toNano('0.05'),
      positionData: newPositionData,
    });

    const data = await positionWallet.getPositionData();
    expect(data.isBusy).toEqual(false);
    expect(data.positionData.traderAddress.equals(trader.address)).toEqual(true);
    const rawData = {
      ...data.positionData,
      traderAddress: data.positionData.traderAddress.toString(),
    };
    const targetRawData = {
      ...newPositionData,
      traderAddress: newPositionData.traderAddress.toString(),
    };
    expect(rawData).toEqual(targetRawData);
  });

  it('should be unlocked only by vamm', async () => {
    await positionWallet.sendProvidePosition(vamm.getSender(), {
      value: toNano('0.05'),
      redirectAddress: vamm.address,
    });

    const tryUnlockRes = await positionWallet.sendUnlockPosition(trader.getSender(), {
      value: toNano('0.05'),
    });

    expect(tryUnlockRes.transactions).toHaveTransaction({
      from: trader.address,
      to: positionWallet.address,
      exitCode: PositionWalletErrors.notAnAmm,
    });

    const data1 = await positionWallet.getPositionData();
    expect(data1.isBusy).toEqual(true);

    await positionWallet.sendUnlockPosition(vamm.getSender(), {
      value: toNano('0.05'),
    });

    const data2 = await positionWallet.getPositionData();
    expect(data2.isBusy).toEqual(false);
  });
});
