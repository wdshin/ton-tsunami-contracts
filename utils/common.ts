import { Address, beginCell, Cell } from 'ton';

const stablecoinDecimals: number = 10 ** 6;

export function toStablecoin(n: number): bigint {
  return BigInt(Math.round(n * stablecoinDecimals));
}

export function toStablecoinFloat(value: bigint) {
  return Number(value) / 10 ** 6;
}

export const tonDeepLink = ({
  address,
  amount,
  body,
  stateInit,
  prefix = 'ton://',
}: {
  address: Address;
  amount: bigint;
  body?: Cell;
  stateInit?: Cell;
  prefix?: string;
}) =>
  `${prefix}transfer/${address.toString({
    urlSafe: true,
    bounceable: true,
  })}?amount=${amount.toString(10)}${body ? '&bin=' + body.toBoc().toString('base64url') : ''}${
    stateInit ? '&init=' + stateInit.toBoc().toString('base64url') : ''
  }`;

export function addressToCell(addr: Address): Cell {
  return beginCell().storeAddress(addr).endCell();
}

export const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000);
}
