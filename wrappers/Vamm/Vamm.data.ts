import { Address, Cell } from 'ton-core';
import { getCurrentTimestamp, toStablecoin } from '../../utils';
import { FundingMode, VammConfig } from './Vamm.types';

// export const forexInitData = {
//   liquidity: 100000000,
//   fundingPeriod: 3600,
//   initMarginRatio: 0.01,
//   maintenanceMarginRatio: 0.0025,
//   liquidationFeeRatio: 0.001,
//   fee: 0.0008,
//   spreadLimit: 0.01,
//   maxPriceImpact: 0.005,
//   partialLiquidationRatio: 0.15,
//   maxPriceSpread: 0.01,
//   maxOpenNotional: 1000000,
//   feeToStakersPercent: 0.3,
//   maxOracleDelay: 10,
//   rolloverFee: 0.3,
//   fundingMode: 2,
// };

export function initVammData({
  liquidity,
  price,
  indexId,
  fundingPeriod,
  initMarginRatio,
  maintenanceMarginRatio,
  liquidationFeeRatio,
  fee,
  spreadLimit,
  maxPriceImpact,
  partialLiquidationRatio,
  maxPriceSpread,
  maxOpenNotional,
  feeToStakersPercent,
  maxOracleDelay,
  rolloverFee,
  fundingMode,
  opts,
}: {
  liquidity: number;
  price: number;
  indexId: number;
  fundingPeriod?: number;
  initMarginRatio?: bigint;
  maintenanceMarginRatio?: bigint;
  liquidationFeeRatio?: bigint;
  fee?: bigint;
  spreadLimit?: number;
  maxPriceImpact?: number;
  partialLiquidationRatio?: number;
  maxPriceSpread?: number;
  maxOpenNotional?: number;
  feeToStakersPercent?: number;
  maxOracleDelay?: number;
  rolloverFee?: number;
  fundingMode?: number;
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
      fundingPeriod: fundingPeriod ?? opts?.exchangeSettings?.fundingPeriod ?? 3600n, // 3600
      initMarginRatio:
        initMarginRatio ?? opts?.exchangeSettings?.initMarginRatio ?? toStablecoin(0.3), // 0.2 !
      maintenanceMarginRatio:
        maintenanceMarginRatio ??
        opts?.exchangeSettings?.maintenanceMarginRatio ??
        toStablecoin(0.085), // 0.05!
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

type InitVammDataFromConfig = {
  liquidity: number;
  price: number;
  indexId: number;
  fundingPeriod: number;
  initMarginRatio: number;
  maintenanceMarginRatio: number;
  liquidationFeeRatio: number;
  fee: number;
  spreadLimit: number;
  maxPriceImpact: number;
  partialLiquidationRatio: number;
  maxPriceSpread: number;
  maxOpenNotional: number;
  feeToStakersPercent: number;
  maxOracleDelay: number;
  rolloverFee: number;
  fundingMode: number;
  vaultAddress: Address;
  adminAddress: Address;
  oracleAddress: Address;
  jettonWalletAddress: Address;
  positionWalletCode: Cell;
};
export function initVammDataFromConfig(config: InitVammDataFromConfig): VammConfig {
  return {
    balance: 0n,
    oracleAddress: config.oracleAddress,
    jettonWalletAddress: config.jettonWalletAddress,
    exchangeSettings: {
      fee: toStablecoin(config.fee),
      rolloverFee: toStablecoin(config.rolloverFee),
      fundingPeriod: config.fundingPeriod,
      initMarginRatio: toStablecoin(config.initMarginRatio),
      maintenanceMarginRatio: toStablecoin(config.maintenanceMarginRatio),
      liquidationFeeRatio: toStablecoin(config.liquidationFeeRatio),
      partialLiquidationRatio: toStablecoin(config.partialLiquidationRatio),
      spreadLimit: toStablecoin(config.spreadLimit),
      maxPriceImpact: toStablecoin(config.maxPriceImpact),
      maxPriceSpread: toStablecoin(config.maxPriceSpread),
      maxOpenNotional: toStablecoin(config.maxOpenNotional),
      feeToStakersPercent: toStablecoin(config.feeToStakersPercent),
      maxOracleDelay: config.maxOracleDelay,
    },
    ammState: {
      quoteAssetReserve: toStablecoin(config.liquidity),
      baseAssetReserve: toStablecoin(config.liquidity / config.price),
      quoteAssetWeight: toStablecoin(1), // 1  !
      totalLongPositionSize: 0n,
      totalShortPositionSize: 0n,
      openInterestLong: 0n,
      openInterestShort: 0n,
    },
    fundingState: {
      latestLongCumulativePremiumFraction: 0n,
      latestShortCumulativePremiumFraction: 0n,
      nextFundingBlockTimestamp: BigInt(getCurrentTimestamp()),
      fundingMode: config.fundingMode,
      longFundingRate: 0n,
      shortFundingRate: 0n,
    },
    extraData: {
      vaultAddress: config.vaultAddress,
      adminAddress: config.adminAddress,
      paused: false,
      closedOnly: false,
      indexId: config.indexId,
      positionWalletCode: config.positionWalletCode,
    },
  };
}
