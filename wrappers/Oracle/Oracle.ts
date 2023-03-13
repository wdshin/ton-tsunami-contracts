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

import { OracleConfig, OracleOpcodes, OraclePrice } from './Oracle.types';

export function packOraclePrice(data: OraclePrice) {
  return beginCell()
    .storeCoins(data.price)
    .storeUint(data.lastUpdateTS, 32)
    .storeUint(data.lastUpdateBlockLT, 64)
    .endCell();
}

export function unpackOraclePrice(dataCell: Cell): OraclePrice {
  const ds = dataCell.beginParse();

  return {
    price: ds.loadCoins(),
    lastUpdateTS: ds.loadUint(32),
    lastUpdateBlockLT: ds.loadUint(64),
  };
}

export function oracleConfigToCell(config: OracleConfig): Cell {
  return beginCell()
    .storeAddress(config.broadcasterAddress)
    .storeUint(config.indexId, 16)
    .storeRef(packOraclePrice({ price: 0n, lastUpdateBlockLT: 0, lastUpdateTS: 0 }))
    .endCell();
}

export class Oracle implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

  static createFromAddress(address: Address) {
    return new Oracle(address);
  }

  static createFromConfig(config: OracleConfig, code: Cell, workchain = 0) {
    const data = oracleConfigToCell(config);
    const init = { code, data };
    return new Oracle(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendSetPrice(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      price: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OracleOpcodes.setOraclePrice, 32)
        .storeCoins(opts.price)
        .endCell(),
    });
  }

  async sendRequestPrice(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      redirectAddress: Address;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OracleOpcodes.oraclePriceRequest, 32)
        .storeAddress(opts.redirectAddress)
        .endCell(),
    });
  }

  async getOracleData(provider: ContractProvider) {
    const { stack } = await provider.get('get_oracle_data', []);
    return {
      managerAddress: stack.readAddress(),
      indexID: stack.readNumber(),
      priceData: unpackOraclePrice(stack.readCell()),
    };
  }
}
