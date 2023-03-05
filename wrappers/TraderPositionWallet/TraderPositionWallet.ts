import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider } from 'ton-core';

import { PositionData, TraderPositionWalletConfig } from './TraderPositionWallet.types';

export function unpackPositionData(cell: Cell): PositionData {
  const cs = cell.beginParse();

  return {
    traderAddress: cs.loadAddress(),
    size: BigInt(cs.loadInt(128)),
    margin: BigInt(cs.loadUint(128)),
    openNotional: BigInt(cs.loadUint(128)),
    lastUpdatedCumulativePremium: BigInt(cs.loadUint(128)),
    fee: BigInt(cs.loadUint(32)),
    lastUpdatedTimestamp: BigInt(cs.loadUint(32)),
  };
}

export function packPositionData(data: PositionData) {
  return beginCell()
    .storeAddress(data.traderAddress)
    .storeInt(data.size, 128)
    .storeUint(data.margin, 128)
    .storeUint(data.openNotional, 128)
    .storeUint(data.lastUpdatedCumulativePremium, 128)
    .storeUint(data.fee, 32)
    .storeUint(data.lastUpdatedTimestamp, 32)
    .endCell();
}

export function traderPositionWalletConfigToCell(config: TraderPositionWalletConfig): Cell {
  return beginCell()
    .storeAddress(config.vammAddress)
    .storeAddress(config.routerAddress)
    .storeUint(config.isBusy, 1)
    .storeRef(packPositionData(config.positionData))
    .endCell();
}

export class TraderPositionWallet implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

  static createFromAddress(address: Address) {
    return new TraderPositionWallet(address);
  }

  static createFromConfig(config: TraderPositionWalletConfig, code: Cell, workchain = 0) {
    const data = traderPositionWalletConfigToCell(config);
    const init = { code, data };
    return new TraderPositionWallet(contractAddress(workchain, init), init);
  }

  // async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
  //   await provider.internal(via, {
  //     value,
  //     sendMode: SendMode.PAY_GAS_SEPARATLY,
  //     body: beginCell().endCell(),
  //   });
  // }

  // async sendIncrease(
  //   provider: ContractProvider,
  //   via: Sender,
  //   opts: {
  //     increaseBy: number;
  //     value: bigint;
  //     queryID?: number;
  //   }
  // ) {
  //   await provider.internal(via, {
  //     value: opts.value,
  //     sendMode: SendMode.PAY_GAS_SEPARATLY,
  //     body: beginCell()
  //       .storeUint(TraderPositionWalletOpcodes.increase, 32)
  //       .storeUint(opts.queryID ?? 0, 64)
  //       .storeUint(opts.increaseBy, 32)
  //       .endCell(),
  //   });
  // }

  async getPositionData(provider: ContractProvider): Promise<TraderPositionWalletConfig> {
    const { stack } = await provider.get('get_position_data', []);
    return {
      vammAddress: stack.readAddress(),
      routerAddress: stack.readAddress(),
      isBusy: stack.readNumber(),
      positionData: unpackPositionData(stack.readCell()),
    };
  }
}
