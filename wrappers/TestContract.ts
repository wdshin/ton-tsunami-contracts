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

export type ExchangeSettings = {
  fee: bigint;
  rolloverFee: bigint;
  fundingPeriod: bigint;
  initMarginRatio: bigint;
  maintenanceMarginRatio: bigint;
  liquidationFeeRatio: bigint;
  partialLiquidationRatio: bigint;
  spreadLimit: bigint;
  maxPriceImpact: bigint;
  maxPriceSpread: bigint;
  maxOpenNotional: bigint;
  feeToStakersPercent: bigint;
  maxOracleDelay: bigint;
};

export function packExchangeSettings(settings: ExchangeSettings) {
  return beginCell()
    .storeUint(settings.fee, 32)
    .storeUint(settings.rolloverFee, 32)
    .storeUint(settings.fundingPeriod, 32)
    .storeUint(settings.initMarginRatio, 32)
    .storeUint(settings.maintenanceMarginRatio, 32)
    .storeUint(settings.liquidationFeeRatio, 32)
    .storeUint(settings.partialLiquidationRatio, 32)
    .storeUint(settings.spreadLimit, 32)
    .storeUint(settings.maxPriceImpact, 32)
    .storeUint(settings.maxPriceSpread, 32)
    .storeUint(settings.maxOpenNotional, 128)
    .storeUint(settings.feeToStakersPercent, 32)
    .storeUint(settings.maxOracleDelay, 32)
    .endCell();
}

export type AmmState = {
  quoteAssetReserve: bigint;
  baseAssetReserve: bigint;
  quoteAssetWeight: bigint;
  totalLongPositionSize: bigint;
  totalShortPositionSize: bigint;
  openInterestLong: bigint;
  openInterestShort: bigint;
};

export function packAmmState(state: AmmState) {
  return beginCell()
    .storeUint(state.quoteAssetReserve, 128)
    .storeUint(state.baseAssetReserve, 128)
    .storeUint(state.quoteAssetWeight, 32)
    .storeInt(state.totalLongPositionSize, 128)
    .storeUint(state.totalShortPositionSize, 128)
    .storeUint(state.openInterestLong, 128)
    .storeUint(state.openInterestShort, 128)
    .endCell();
}

export type TestContractConfig = {
  balance: number;
  oraclePrice: number;
  exchangeSettings: ExchangeSettings;
  ammState: AmmState;
};

export function testContractConfigToCell(config: TestContractConfig): Cell {
  return beginCell()
    .storeCoins(config.balance)
    .storeUint(config.oraclePrice, 128)
    .storeRef(packExchangeSettings(config.exchangeSettings))
    .storeRef(packAmmState(config.ammState))
    .endCell();
}

export const Opcodes = {
  increase: 0x7e8764ef,
};

export class TestContract implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new TestContract(address);
  }

  static createFromConfig(
    config: TestContractConfig,
    code: Cell,
    workchain = 0
  ) {
    const data = testContractConfigToCell(config);
    const init = { code, data };
    return new TestContract(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATLY,
      body: beginCell().endCell(),
    });
  }

  async sendIncrease(
    provider: ContractProvider,
    via: Sender,
    opts: {
      increaseBy: number;
      value: bigint;
      queryID?: number;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATLY,
      body: beginCell()
        .storeUint(Opcodes.increase, 32)
        .storeUint(opts.queryID ?? 0, 64)
        .storeUint(opts.increaseBy, 32)
        .endCell(),
    });
  }

  async getCounter(provider: ContractProvider) {
    const result = await provider.get('get_amm_data', []);
    return result.stack.readNumber();
  }

  async getID(provider: ContractProvider) {
    const result = await provider.get('get_id', []);
    return result.stack.readNumber();
  }
}
