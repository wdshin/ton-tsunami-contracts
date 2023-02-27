import { toStablecoin } from '../../utils';
import { VammConfig } from './Vamm.types';

export const initVammData = ({
  liquidity,
  price,
  opts,
}: {
  liquidity: number;
  price: number;
  opts?: Partial<
    Omit<VammConfig, 'oraclePrice' | 'quoteAssetReserve' | 'baseAssetReserve'>
  >;
}) => {
  return {
    balance: opts?.balance ?? 0n,
    oraclePrice: toStablecoin(price),
    exchangeSettings: {
      fee: opts?.exchangeSettings?.fee ?? toStablecoin(0.0012),
      rolloverFee:
        opts?.exchangeSettings?.rolloverFee ?? toStablecoin(0.000001), // 0.3!
      fundingPeriod: opts?.exchangeSettings?.fundingPeriod ?? 3600n, // 3600
      initMarginRatio:
        opts?.exchangeSettings?.initMarginRatio ?? toStablecoin(0.3), // 0.2 !
      maintenanceMarginRatio:
        opts?.exchangeSettings?.maintenanceMarginRatio ?? toStablecoin(0.085), // 0.05!
      liquidationFeeRatio:
        opts?.exchangeSettings?.liquidationFeeRatio ?? toStablecoin(0.01), // 0.025!
      partialLiquidationRatio:
        opts?.exchangeSettings?.partialLiquidationRatio ?? toStablecoin(0.15), // 0.15!
      spreadLimit: opts?.exchangeSettings?.spreadLimit ?? toStablecoin(0.1), // 0.04!
      maxPriceImpact:
        opts?.exchangeSettings?.maxPriceImpact ?? toStablecoin(0.08), // 0.03!
      maxPriceSpread:
        opts?.exchangeSettings?.maxPriceSpread ?? toStablecoin(0.4), // 0.01!
      maxOpenNotional:
        opts?.exchangeSettings?.maxOpenNotional ?? toStablecoin(100_000_000), // 1000000!
      feeToStakersPercent:
        opts?.exchangeSettings?.feeToStakersPercent ?? toStablecoin(0.5), // 0.3!
      maxOracleDelay: opts?.exchangeSettings?.maxOracleDelay ?? 1n, // 1
    },
    ammState: {
      quoteAssetReserve: toStablecoin(liquidity), // 1M !
      baseAssetReserve: toStablecoin(liquidity / price), // 1M / tonPrice (!)
      quoteAssetWeight: opts?.ammState?.quoteAssetWeight ?? toStablecoin(1), // 1  !
      totalLongPositionSize: opts?.ammState?.totalLongPositionSize ?? 0n,
      totalShortPositionSize: opts?.ammState?.totalShortPositionSize ?? 0n,
      openInterestLong: opts?.ammState?.openInterestLong ?? 0n,
      openInterestShort: opts?.ammState?.openInterestShort ?? 0n,
    },
  };
};
