export type InitVammData = {
  liquidity: number;
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
};
