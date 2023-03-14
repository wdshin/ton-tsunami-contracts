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

export type PositionWalletConfig = {
  vammAddress: Address;
  isBusy: boolean;
  positionData: PositionData;
};

export const PositionWalletOpcodes = {
  providePosition: 0x13076670,
  updatePosition: 0x60dfc677,
  unlockPosition: 0xe7c04e13,
};

export const PositionWalletErrors = {
  busy: 400,
  notAnAmm: 401,
};
