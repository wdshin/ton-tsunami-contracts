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

import { PositionData, PositionWalletConfig, PositionWalletOpcodes } from './PositionWallet.types';

export function unpackPositionData(cell: Cell): PositionData {
  const cs = cell.beginParse();

  return {
    traderAddress: cs.loadAddress(),
    size: BigInt(cs.loadInt(128)),
    margin: BigInt(cs.loadCoins()),
    openNotional: BigInt(cs.loadCoins()),
    lastUpdatedCumulativePremium: BigInt(cs.loadCoins()),
    fee: BigInt(cs.loadUint(32)),
    lastUpdatedTimestamp: BigInt(cs.loadUint(32)),
  };
}

export function packPositionData(data: PositionData) {
  return beginCell()
    .storeAddress(data.traderAddress)
    .storeInt(data.size, 128)
    .storeCoins(data.margin)
    .storeCoins(data.openNotional)
    .storeCoins(data.lastUpdatedCumulativePremium)
    .storeUint(data.fee, 32)
    .storeUint(data.lastUpdatedTimestamp, 32)
    .endCell();
}

export function positionWalletConfigToCell(config: PositionWalletConfig): Cell {
  return beginCell()
    .storeAddress(config.vammAddress)
    .storeBit(config.isBusy)
    .storeRef(packPositionData(config.positionData))
    .endCell();
}

export class PositionWallet implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

  static createFromAddress(address: Address) {
    return new PositionWallet(address);
  }

  static createFromConfig(config: PositionWalletConfig, code: Cell, workchain = 0) {
    const data = positionWalletConfigToCell(config);
    const init = { code, data };
    return new PositionWallet(contractAddress(workchain, init), init);
  }

  static createEmpty(vammAddress: Address, traderAddress: Address, code: Cell, workchain = 0) {
    const data = positionWalletConfigToCell({
      vammAddress,
      isBusy: false,
      positionData: {
        traderAddress,
        size: 0n,
        margin: 0n,
        openNotional: 0n,
        lastUpdatedCumulativePremium: 0n,
        fee: 0n,
        lastUpdatedTimestamp: 0n,
      },
    });
    const init = { code, data };
    return new PositionWallet(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendUpdatePosition(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      positionData: PositionData;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(PositionWalletOpcodes.updatePosition, 32)
        .storeRef(packPositionData(opts.positionData))
        .endCell(),
    });
  }

  async sendProvidePosition(
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
        .storeUint(PositionWalletOpcodes.providePosition, 32)
        .storeAddress(opts.redirectAddress)
        .endCell(),
    });
  }

  async sendUnlockPosition(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().storeUint(PositionWalletOpcodes.unlockPosition, 32).endCell(),
    });
  }

  async getPositionData(provider: ContractProvider): Promise<PositionWalletConfig> {
    const { stack } = await provider.get('get_position_data', []);
    return {
      vammAddress: stack.readAddress(),
      isBusy: stack.readBoolean(),
      positionData: unpackPositionData(stack.readCell()),
    };
  }
}
