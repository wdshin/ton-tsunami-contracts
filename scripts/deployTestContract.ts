import { toNano } from 'ton-core';
import { TestContract } from '../wrappers/TestContract';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
  const testContract = TestContract.createFromConfig(
    {
      balance: 0,
      oraclePrice: 0,
      exchangeSettings: {
        fee: 0n,
        rolloverFee: 0n,
        fundingPeriod: 0n,
        initMarginRatio: 0n,
        maintenanceMarginRatio: 0n,
        liquidationFeeRatio: 0n,
        partialLiquidationRatio: 0n,
        spreadLimit: 0n,
        maxPriceImpact: 0n,
        maxPriceSpread: 0n,
        maxOpenNotional: 0n,
        feeToStakersPercent: 0n,
        maxOracleDelay: 0n,
      },
      ammState: {
        quoteAssetReserve: 0n,
        baseAssetReserve: 0n,
        quoteAssetWeight: 0n,
        totalLongPositionSize: 0n,
        totalShortPositionSize: 0n,
        openInterestLong: 0n,
        openInterestShort: 0n,
      },
    },
    await compile('TestContract')
  );

  await provider.deploy(testContract, toNano('0.05'));

  const openedContract = provider.open(testContract);

  console.log('ID', await openedContract.getID());
}
