import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
} from 'ton-core';
import { addressToCell, toStablecoin } from '../../utils';
import { Direction } from '../Vamm';

import { RouterConfig, RouterOpcodes } from './Router.types';

export function routerConfigToCell(config: RouterConfig): Cell {
  return beginCell()
    .storeAddress(config.adminAddress)
    .storeAddress(config.whitelistedJettonWalletAddress)
    .storeRef(config.traderPositionWalletCode)
    .storeRef(config.vammCode)
    .endCell();
}

export class Router implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

  static createFromAddress(address: Address) {
    return new Router(address);
  }

  static createFromConfig(config: RouterConfig, code: Cell, workchain = 0) {
    const data = routerConfigToCell(config);
    const init = { code, data };
    return new Router(contractAddress(workchain, init), init);
  }

  static increasePosition(opts: {
    direction: Direction; // 0 | 1
    leverage: bigint;
    minBaseAssetAmount: bigint;
  }) {
    return beginCell()
      .storeUint(RouterOpcodes.increasePosition, 32)
      .storeUint(opts.direction, 1)
      .storeUint(opts.leverage, 32)
      .storeCoins(opts.minBaseAssetAmount)
      .endCell();
  }

  static tempSetAmmData(opts: { queryID?: number; balance: number; price: number }) {
    return beginCell()
      .storeUint(RouterOpcodes.tempSetAmmData, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeCoins(toStablecoin(opts.balance))
      .storeCoins(toStablecoin(opts.price))
      .storeCoins(toStablecoin(opts.balance) ?? 0)
      .storeCoins(toStablecoin(opts.balance / opts.price) ?? 0)
      .endCell();
  }

  static tempSetWhitelistedAddress(opts: { queryID?: number; address: Address }) {
    return beginCell()
      .storeUint(RouterOpcodes.tempSetWhitelistedAddress, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeAddress(opts.address)
      .endCell();
  }

  static closePosition(opts: {
    queryID?: number;
    addToMargin: boolean;
    size: bigint;
    minQuoteAssetAmount: bigint;
  }) {
    //   int _size = payload_s~load_int(128);
    // int _minQuoteAssetAmount = payload_s~load_uint(128);
    // int _addToMargin = payload_s~load_uint(1);
    return beginCell()
      .storeUint(RouterOpcodes.closePosition, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeInt(opts.size, 128)
      .storeCoins(opts.minQuoteAssetAmount)
      .storeBit(opts.addToMargin)
      .endCell();
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, body?: Cell) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body,
    });
  }

  async sendSetWhitelistedAddress(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      address: Address;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Router.tempSetWhitelistedAddress(opts),
    });
  }

  async sendClosePosition(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      addToMargin: boolean;
      size: bigint;
      minQuoteAssetAmount: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Router.closePosition(opts),
    });
  }

  async sendSetAmmData(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      balance: number;
      price: number;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Router.tempSetAmmData(opts),
    });
  }

  async getRouterData(provider: ContractProvider): Promise<RouterConfig> {
    const { stack } = await provider.get('get_router_data', []);
    return {
      adminAddress: stack.readAddress(),
      whitelistedJettonWalletAddress: stack.readAddress(),
      traderPositionWalletCode: stack.readCell(),
      vammCode: stack.readCell(),
    };
  }

  async getAmmAddress(provider: ContractProvider) {
    const result = await provider.get('get_amm_address', []);
    return result.stack.readAddress();
  }

  async getWhitelistedJWAddress(provider: ContractProvider) {
    return (await this.getRouterData(provider)).whitelistedJettonWalletAddress;
  }

  async getAdminAddress(provider: ContractProvider) {
    return (await this.getRouterData(provider)).adminAddress;
  }

  async getTraderPositionAddress(provider: ContractProvider, traderAddress: Address) {
    const result = await provider.get('get_trader_position_address', [
      {
        type: 'slice',
        cell: addressToCell(traderAddress),
      },
    ]);
    return result.stack.readAddress();
  }
}
