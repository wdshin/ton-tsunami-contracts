import { toStablecoin } from '../../utils';

export const initVammData = {
  balance: 0n,
  oraclePrice: toStablecoin(2.36),
  exchangeSettings: {
    fee: toStablecoin(0.2),
    rolloverFee: toStablecoin(0.3), // 0.3!
    fundingPeriod: 3600n, // 3600
    initMarginRatio: toStablecoin(0.2), // 0.2 !
    maintenanceMarginRatio: toStablecoin(0.05), // 0.05!
    liquidationFeeRatio: toStablecoin(0.025), // 0.025!
    partialLiquidationRatio: toStablecoin(0.15), // 0.15!
    spreadLimit: toStablecoin(0.04), // 0.04!
    maxPriceImpact: toStablecoin(0.03), // 0.03!
    maxPriceSpread: toStablecoin(0.01), // 0.01!
    maxOpenNotional: toStablecoin(1000000), // 1000000!
    feeToStakersPercent: toStablecoin(0.3), // 0.3!
    maxOracleDelay: 1n, // 1
  },
  ammState: {
    quoteAssetReserve: toStablecoin(1_000_000), // 1M !
    baseAssetReserve: toStablecoin(1_000_000 / 2.36), // 1M / tonPrice (!)
    quoteAssetWeight: toStablecoin(1), // 1  !
    totalLongPositionSize: 0n,
    totalShortPositionSize: 0n,
    openInterestLong: 0n,
    openInterestShort: 0n,
  },
};
