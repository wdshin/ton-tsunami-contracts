import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from 'ton';
import { packPositionData, PositionData } from '../TraderPositionWallet';

import {
  AmmState,
  ExchangeSettings,
  VammConfig,
  VammOpcodes,
  IncreasePositionBody,
} from './Vamm.types';

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

export function unpackExchangeSettings(cell: Cell): ExchangeSettings {
  const cs = cell.beginParse();
  return {
    fee: BigInt(cs.loadUint(32)),
    rolloverFee: BigInt(cs.loadUint(32)),
    fundingPeriod: BigInt(cs.loadUint(32)),
    initMarginRatio: BigInt(cs.loadUint(32)),
    maintenanceMarginRatio: BigInt(cs.loadUint(32)),
    liquidationFeeRatio: BigInt(cs.loadUint(32)),
    partialLiquidationRatio: BigInt(cs.loadUint(32)),
    spreadLimit: BigInt(cs.loadUint(32)),
    maxPriceImpact: BigInt(cs.loadUint(32)),
    maxPriceSpread: BigInt(cs.loadUint(32)),
    maxOpenNotional: BigInt(cs.loadUint(128)),
    feeToStakersPercent: BigInt(cs.loadUint(32)),
    maxOracleDelay: BigInt(cs.loadUint(32)),
  };
}

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

export function unpackAmmState(cell: Cell): AmmState {
  const cs = cell.beginParse();
  return {
    quoteAssetReserve: BigInt(cs.loadUint(128)),
    baseAssetReserve: BigInt(cs.loadUint(128)),
    quoteAssetWeight: BigInt(cs.loadUint(32)),
    totalLongPositionSize: BigInt(cs.loadInt(128)),
    totalShortPositionSize: BigInt(cs.loadUint(128)),
    openInterestLong: BigInt(cs.loadUint(128)),
    openInterestShort: BigInt(cs.loadUint(128)),
  };
}

export function vammConfigToCell(config: VammConfig): Cell {
  return beginCell()
    .storeCoins(config.balance)
    .storeUint(config.oraclePrice, 128)
    .storeRef(packExchangeSettings(config.exchangeSettings))
    .storeRef(packAmmState(config.ammState))
    .endCell();
}

export function packIncreasePositionBody(body: IncreasePositionBody): Cell {
  return beginCell()
    .storeUint(body.direction, 2)
    .storeUint(body.leverage, 32)
    .storeUint(body.minBaseAssetAmount, 128)
    .storeAddress(body.traderAddress)
    .endCell();
}

export class Vamm implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new Vamm(address);
  }

  static createFromConfig(config: VammConfig, code: Cell, workchain = 0) {
    const data = vammConfigToCell(config);
    const init = { code, data };
    return new Vamm(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATLY,
      body: beginCell().endCell(),
    });
  }

  static increasePosition(opts: {
    queryID?: number;
    oldPosition: PositionData;
    increasePositionBody: IncreasePositionBody;
    amount: bigint;
  }) {
    return beginCell()
      .storeUint(VammOpcodes.increasePosition, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeCoins(opts.amount)
      .storeRef(packPositionData(opts.oldPosition))
      .storeRef(packIncreasePositionBody(opts.increasePositionBody))
      .endCell();
  }

  async sendIncreasePosition(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      position: Cell;
      increasePayload: Cell;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATLY,
      body: beginCell()
        .storeUint(VammOpcodes.increasePosition, 32)
        .storeUint(opts.queryID ?? 0, 64)
        .storeCoins(toNano(100))
        .storeRef(opts.position)
        .storeRef(opts.increasePayload)
        .endCell(),
    });
  }

  async getAmmData(provider: ContractProvider): Promise<VammConfig> {
    const { stack } = await provider.get('get_amm_data', []);

    return {
      balance: stack.readBigNumber(),
      oraclePrice: stack.readBigNumber(),
      exchangeSettings: unpackExchangeSettings(stack.readCell()),
      ammState: unpackAmmState(stack.readCell()),
    };
  }
}
