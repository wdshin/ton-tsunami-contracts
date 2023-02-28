import { Address, Cell } from 'ton-core';

export type RouterConfig = {
  adminAddress: Address;
  whitelistedJettonWalletAddress: Address;
  traderPositionWalletCode: Cell;
  vammCode: Cell;
};

export const RouterOpcodes = {
  increasePosition: 0xa55bf923,
  closePosition: 0x5cc03add,
  tempSetAmmData: 0xf2e8f660,
  updatePosition: 0x60dfc677,
  tempSetWhitelistedAddress: 0x37bebc33,
};
