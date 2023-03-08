import '@ton-community/test-utils';
import { compile, sleep } from '@ton-community/blueprint';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { toNano } from 'ton-core';

import { Direction, IncreasePositionBody, Vamm } from '../wrappers/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import { PositionData } from '../wrappers/TraderPositionWallet';
import { toStablecoin } from '../utils';
import { getAndUnpackPosition } from '../utils';

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

  it('Opening and closing positions should change balance', async () => {
    const increasePositionBody: IncreasePositionBody = {
      amount: toStablecoin(10),
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.15),
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

    {
      const ammData = await vamm.getAmmData();
      expect(ammData.balance).toBe(9964129n);
    }

    await sleep(1100);
    const newPosition = getAndUnpackPosition(increaseResult.events);

    await vamm.sendClosePosition(longerPosition.getSender(), {
      value: toNano('0.2'),
      oldPosition: newPosition,
    });

    const ammData = await vamm.getAmmData();
    expect(ammData.balance).toBe(0n);
  });
});
