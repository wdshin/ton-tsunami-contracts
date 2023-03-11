import { Address } from 'ton-core';

export type OracleConfig = {
  indexId: number;
  broadcasterAddress: Address;
};

export enum OracleOpcodes {
  setOraclePrice = 0x1cabbe53,
  oraclePriceRequest = 0x8365d032,
  oraclePriceResponse = 0x96a426f1,
}

export type OraclePrice = {
  price: bigint;
  lastUpdateTS: bigint | number;
  lastUpdateBlockLT: bigint | number;
};
