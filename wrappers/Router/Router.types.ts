import { Address, Cell } from 'ton-core';

import { crc32str } from '../../utils';

export type RouterConfig = {
  adminAddress: Address;
  whitelistedJettonWalletAddress: Address;
  traderPositionWalletCode: Cell;
  vammCode: Cell;
};

export const RouterOpcodes = {
  increasePosition: crc32str('op::increase_position'),
  closePosition: crc32str('op::close_position'),
  tempSetAmmData: crc32str('op::temp_set_amm_data'),
  updatePosition: crc32str('op::temp_set_whitelisted_address'),
  tempSetWhitelistedAddress: crc32str('op::temp_set_whitelisted_address'),
};
