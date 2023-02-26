export type PositionData = {
  size: bigint;
  margin: bigint;
  openNotional: bigint;
  lastUpdatedCumulativePremium: bigint;
  fee: bigint;
  lastUpdatedTimestamp: bigint;
};

export type TraderPositionWalletConfig = {
  id: number;
  counter: number;
};

export const TraderPositionWalletOpcodes = {
  increase: 0x7e8764ef,
};
