import { Address } from 'ton-core';

export type PositionData = {
  traderAddress: Address;
  size: bigint;
  margin: bigint;
  openNotional: bigint;
  lastUpdatedCumulativePremium: bigint;
  fee: bigint;
  lastUpdatedTimestamp: bigint;
};

export type TraderPositionWalletConfig = {
  vammAddress: Address;
  routerAddress: Address;
  isBusy: number;
  positionData: PositionData;
};

export const TraderPositionWalletOpcodes = {
  increase: 0x7e8764ef,
};
