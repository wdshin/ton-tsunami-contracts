import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';

import { Oracle, OracleOpcodes, unpackOraclePrice } from '../wrappers/Oracle';

describe('Oracle', () => {
  let code: Cell;
  let blockchain: Blockchain;
  let oracle: SandboxContract<Oracle>;
  let broadcaster: SandboxContract<TreasuryContract>;
  let attacker: SandboxContract<TreasuryContract>;
  let getter: SandboxContract<TreasuryContract>;

  beforeAll(async () => {
    code = await compile('Oracle');
    blockchain = await Blockchain.create();
    broadcaster = await blockchain.treasury('broadcaster');
    attacker = await blockchain.treasury('attacker');
    getter = await blockchain.treasury('getter');

    oracle = blockchain.openContract(
      Oracle.createFromConfig({ broadcasterAddress: broadcaster.address, indexId: 1 }, code)
    );

    const deployer = await blockchain.treasury('deployer');

    const deployResult = await oracle.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: oracle.address,
      deploy: true,
    });
  });

  it('should change price', async () => {
    const prevData = await oracle.getOracleData();
    expect(prevData.priceData.price).toEqual(0n);

    await oracle.sendSetPrice(broadcaster.getSender(), { price: 100n, value: toNano('0.05') });

    const nextData = await oracle.getOracleData();
    expect(nextData.priceData.price).toEqual(100n);
  });

  it("should not change price after attacker's call", async () => {
    await oracle.sendSetPrice(attacker.getSender(), { price: 42n, value: toNano('0.05') });

    const nextData = await oracle.getOracleData();
    expect(nextData.priceData.price).not.toEqual(42n);
    expect(nextData.priceData.price).toEqual(100n);
  });

  it('should provide price', async () => {
    const reqResult = await oracle.sendRequestPrice(getter.getSender(), {
      redirectAddress: broadcaster.address,
      value: toNano('0.05'),
    });
    expect(reqResult.transactions).toHaveTransaction({
      from: oracle.address,
      to: broadcaster.address,
    });

    const responseMessage = reqResult.events.at(-1);
    expect(responseMessage?.type).toEqual('message_sent');
    if (responseMessage?.type !== 'message_sent') throw new Error('Response was not sent');
    const cs = responseMessage.body.beginParse();

    expect(cs.loadUint(32)).toEqual(OracleOpcodes.oraclePriceResponse);

    expect(cs.loadAddress().equals(getter.address)).toEqual(true);

    const priceData = unpackOraclePrice(cs.loadRef());

    expect(priceData.price).toEqual(100n);
  });
});
