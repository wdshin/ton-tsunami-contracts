import { Address, Cell } from 'ton-core';
import { getCurrentTimestamp, toStablecoin } from '../../utils';
import { FundingMode, VammConfig } from './Vamm.types';

export function initVammData({
  liquidity,
  price,
  indexId,
  opts,
}: {
  liquidity: number;
  price: number;
  indexId: number;
  opts?: Partial<Omit<VammConfig, 'quoteAssetReserve' | 'baseAssetReserve'>>;
}): VammConfig {
  return {
    balance: opts?.balance ?? 0n,
    oracleAddress:
      opts?.oracleAddress ?? Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
    jettonWalletAddress:
      opts?.jettonWalletAddress ??
      Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
    exchangeSettings: {
      fee: opts?.exchangeSettings?.fee ?? toStablecoin(0.0012),
      rolloverFee: opts?.exchangeSettings?.rolloverFee ?? toStablecoin(0.000001), // 0.3!
      fundingPeriod: opts?.exchangeSettings?.fundingPeriod ?? 3600n, // 3600
      initMarginRatio: opts?.exchangeSettings?.initMarginRatio ?? toStablecoin(0.3), // 0.2 !
      maintenanceMarginRatio: opts?.exchangeSettings?.maintenanceMarginRatio ?? toStablecoin(0.085), // 0.05!
      liquidationFeeRatio: opts?.exchangeSettings?.liquidationFeeRatio ?? toStablecoin(0.01), // 0.025!
      partialLiquidationRatio:
        opts?.exchangeSettings?.partialLiquidationRatio ?? toStablecoin(0.15), // 0.15!
      spreadLimit: opts?.exchangeSettings?.spreadLimit ?? toStablecoin(0.1), // 0.04!
      maxPriceImpact: opts?.exchangeSettings?.maxPriceImpact ?? toStablecoin(0.08), // 0.03!
      maxPriceSpread: opts?.exchangeSettings?.maxPriceSpread ?? toStablecoin(0.4), // 0.01!
      maxOpenNotional: opts?.exchangeSettings?.maxOpenNotional ?? toStablecoin(100_000_000), // 1000000!
      feeToStakersPercent: opts?.exchangeSettings?.feeToStakersPercent ?? toStablecoin(0.5), // 0.3!
      maxOracleDelay: opts?.exchangeSettings?.maxOracleDelay ?? 1n, // 1
    },
    ammState: {
      quoteAssetReserve: opts?.ammState?.quoteAssetReserve ?? toStablecoin(liquidity), // 1M !
      baseAssetReserve: opts?.ammState?.baseAssetReserve ?? toStablecoin(liquidity / price), // 1M / tonPrice (!)
      quoteAssetWeight: opts?.ammState?.quoteAssetWeight ?? toStablecoin(1), // 1  !
      totalLongPositionSize: opts?.ammState?.totalLongPositionSize ?? 0n,
      totalShortPositionSize: opts?.ammState?.totalShortPositionSize ?? 0n,
      openInterestLong: opts?.ammState?.openInterestLong ?? 0n,
      openInterestShort: opts?.ammState?.openInterestShort ?? 0n,
    },
    fundingState: {
      latestLongCumulativePremiumFraction:
        opts?.fundingState?.latestLongCumulativePremiumFraction ?? 0n,
      latestShortCumulativePremiumFraction:
        opts?.fundingState?.latestShortCumulativePremiumFraction ?? 0n,
      nextFundingBlockTimestamp:
        opts?.fundingState?.nextFundingBlockTimestamp ?? BigInt(getCurrentTimestamp()),
      fundingMode: opts?.fundingState?.fundingMode ?? FundingMode.ASYMMETRIC,
      longFundingRate: opts?.fundingState?.longFundingRate ?? 0n,
      shortFundingRate: opts?.fundingState?.shortFundingRate ?? 0n,
    },
    extraData: {
      vaultAddress:
        opts?.extraData?.vaultAddress ??
        Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
      adminAddress:
        opts?.extraData?.adminAddress ??
        Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
      paused: false,
      closedOnly: false,
      indexId: indexId,
      positionWalletCode: opts?.extraData?.positionWalletCode ?? new Cell(),
    },
  };
}
