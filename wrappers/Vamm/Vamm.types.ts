import { Address } from 'ton';

export const VammOpcodes = {
  increasePosition: 0xa55bf923,
  closePosition: 0x5cc03add,
  tempSetPrice: 0xe4f733dc,
};

export type ExchangeSettings = {
  fee: bigint;
  rolloverFee: bigint;
  fundingPeriod: bigint;
  initMarginRatio: bigint;
  maintenanceMarginRatio: bigint;
  liquidationFeeRatio: bigint;
  partialLiquidationRatio: bigint;
  spreadLimit: bigint;
  maxPriceImpact: bigint;
  maxPriceSpread: bigint;
  maxOpenNotional: bigint;
  feeToStakersPercent: bigint;
  maxOracleDelay: bigint;
};

export type AmmState = {
  quoteAssetReserve: bigint;
  baseAssetReserve: bigint;
  quoteAssetWeight: bigint;
  totalLongPositionSize: bigint;
  totalShortPositionSize: bigint;
  openInterestLong: bigint;
  openInterestShort: bigint;
};

export type VammConfig = {
  balance: bigint;
  oraclePrice: bigint;
  exchangeSettings: ExchangeSettings;
  ammState: AmmState;
};

export type IncreasePositionBody = {
  direction: number;
  leverage: bigint;
  minBaseAssetAmount: bigint;
  traderAddress: Address;
};
