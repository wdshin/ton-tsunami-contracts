import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { toNano } from 'ton-core';

import { Vamm } from '../wrappers/Vamm';
import { initVammData } from '../wrappers/Vamm/Vamm.data';
import { PositionData, PositionWallet } from '../wrappers/PositionWallet';
import { OraclePrice } from '../wrappers/Oracle';
import { MyBlockchain } from '../wrappers/MyBlockchain/MyBlockchain';

import { toStablecoin, bootstrapTrader } from '../utils';

const priceData: OraclePrice = {
  price: toStablecoin(55),
  lastUpdateBlockLT: 0,
  lastUpdateTS: 0,
};

describe('vAMM should work with positive funding', () => {
  let blockchain: MyBlockchain;
  let vamm: SandboxContract<Vamm>;

  let longer: SandboxContract<TreasuryContract>;
  let longerPosition: SandboxContract<PositionWallet>;
  let lastLongerPosition: PositionData;

  let jettonWallet: SandboxContract<TreasuryContract>;
  let oracle: SandboxContract<TreasuryContract>;

  beforeAll(async () => {
    blockchain = await MyBlockchain.create();

    oracle = await blockchain.treasury('oracle');
    jettonWallet = await blockchain.treasury('jettonWallet');

    vamm = blockchain.openContract(
      Vamm.createFromConfig(
        initVammData({
          liquidity: 100_000,
          price: 55,
          indexId: 123,
          opts: {
            oracleAddress: oracle.address, // @ts-ignore
            extraData: { positionWalletCode: await compile('PositionWallet') },
          },
        }),
        await compile('Vamm')
      )
    );

    [longer, lastLongerPosition, longerPosition] = await bootstrapTrader(
      blockchain,
      vamm.address,
      'longer'
    );

    const deployer = await blockchain.treasury('deployer');
    await vamm.sendDeploy(deployer.getSender(), toNano('0.5'), jettonWallet.address);
  });

  it('should accept correct message and update funding nextFundingBlockTimestamp', async () => {
    const data = await vamm.getAmmData();

    const pevNextFundingBlockTimestamp = data.fundingState.nextFundingBlockTimestamp;
    const fundingPeriod = data.exchangeSettings.fundingPeriod;
    const targetNextFundingBlockTimestamp =
      Number(pevNextFundingBlockTimestamp) + Number(fundingPeriod);

    blockchain.now += Number(fundingPeriod);
    const result = await vamm.sendPayFundingRaw(oracle.getSender(), {
      value: toNano('0.2'),
      oracleRedirectAddress: longer.address,
      priceData,
      responseAddress: longer.address,
    });

    expect(result.transactions).toHaveTransaction({
      from: vamm.address,
      to: longer.address,
      success: true,
    });

    const { fundingState } = await vamm.getAmmData();

    expect(fundingState.nextFundingBlockTimestamp).toBe(BigInt(targetNextFundingBlockTimestamp));
  });
});
