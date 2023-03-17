import { Address, Cell } from 'ton';

export const VammOpcodes = {
  increasePosition: 0xa55bf923,
  closePosition: 0x5cc03add,
  tempSetPrice: 0xe4f733dc,
  updatePosition: 0x60dfc677,
  addMargin: 0xb9e810e2,
  removeMargin: 0xecded426,
  payFunding: 0xb652c441,
  withdraw: 0xcb03bfaf,
  setJettonWalletAddress: 0xee87d2d4,
  oraclePriceResponse: 0x96a426f1,
  liquidate: 0xcc52bae3,
  setOraclePrice: 0x1cabbe53,
  unlockPosition: 0xe7c04e13,
  transfer: 0xf8a7ea5,
};

export type ExchangeSettings = {
  fee: bigint;
  rolloverFee: bigint;
  fundingPeriod: bigint | number;
  initMarginRatio: bigint;
  maintenanceMarginRatio: bigint;
  liquidationFeeRatio: bigint;
  partialLiquidationRatio: bigint;
  spreadLimit: bigint;
  maxPriceImpact: bigint;
  maxPriceSpread: bigint;
  maxOpenNotional: bigint;
  feeToStakersPercent: bigint;
  maxOracleDelay: bigint | number;
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

export type FundingState = {
  latestLongCumulativePremiumFraction: bigint;
  latestShortCumulativePremiumFraction: bigint;
  nextFundingBlockTimestamp: bigint;
  fundingMode: FundingMode;
  longFundingRate: bigint;
  shortFundingRate: bigint;
};

export type VammExtraData = {
  vaultAddress: Address;
  adminAddress: Address;
  paused: boolean;
  closedOnly: boolean;
  indexId: number;
  positionWalletCode: Cell;
};

export enum FundingMode {
  ASYMMETRIC = 1,
  SYMMETRIC = 2,
}

export type VammConfig = {
  balance: bigint;
  oracleAddress: Address;
  jettonWalletAddress: Address;

  exchangeSettings: ExchangeSettings;
  ammState: AmmState;
  fundingState: FundingState;
  extraData: VammExtraData;
};

export type IncreasePositionBody = {
  direction: Direction;
  leverage: bigint;
  minBaseAssetAmount?: bigint;
};

export enum Direction {
  long = 0,
  short = 1,
}
