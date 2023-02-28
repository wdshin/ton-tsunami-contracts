import { Address } from 'ton-core';

export type PositionData = {
  size: bigint;
  margin: bigint;
  openNotional: bigint;
  lastUpdatedCumulativePremium: bigint;
  fee: bigint;
  lastUpdatedTimestamp: bigint;
};

export type TraderPositionWalletConfig = {
  traderAddress: Address;
  vammAddress: Address;
  routerAddress: Address;
  isBusy: number;
  positionData: PositionData;
};

export const TraderPositionWalletOpcodes = {
  increase: 0x7e8764ef,
};
