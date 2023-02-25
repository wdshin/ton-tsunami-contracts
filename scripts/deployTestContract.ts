import { toNano } from 'ton-core';
import { TestContract } from '../wrappers/TestContract';
import { compile, NetworkProvider } from '@ton-community/blueprint';

const stableDecimals: number = 10 ** 6;

function toDecimalBigint(n: number): bigint {
  return BigInt(Math.floor(n * stableDecimals));
}

export async function run(provider: NetworkProvider) {
  const testContract = TestContract.createFromConfig(
    {
      balance: 0,
      oraclePrice: toDecimalBigint(2.36),
      exchangeSettings: {
        fee: toDecimalBigint(0.2),
        rolloverFee: toDecimalBigint(0.3), // 0.3!
        fundingPeriod: 3600n, // 3600
        initMarginRatio: toDecimalBigint(0.2), // 0.2 !
        maintenanceMarginRatio: toDecimalBigint(0.05), // 0.05!
        liquidationFeeRatio: toDecimalBigint(0.025), // 0.025!
        partialLiquidationRatio: toDecimalBigint(0.15), // 0.15!
        spreadLimit: toDecimalBigint(0.04), // 0.04!
        maxPriceImpact: toDecimalBigint(0.03), // 0.03!
        maxPriceSpread: toDecimalBigint(0.01), // 0.01!
        maxOpenNotional: toDecimalBigint(1000000), // 1000000!
        feeToStakersPercent: toDecimalBigint(0.3), // 0.3!
        maxOracleDelay: 1n, // 1
      },
      ammState: {
        quoteAssetReserve: toDecimalBigint(1_000_000), // 1M !
        baseAssetReserve: toDecimalBigint(1_000_000 / 2.36), // 1M / tonPrice (!)
        quoteAssetWeight: toDecimalBigint(1), // 1  !
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
