import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
} from 'ton';
import { packPositionData, PositionData } from '../TraderPositionWallet';

import {
  AmmState,
  ExchangeSettings,
  VammConfig,
  VammOpcodes,
  IncreasePositionBody,
  FundingState,
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

export function packFundingState(state: FundingState) {
  return beginCell()
    .storeUint(state.latestLongCumulativePremiumFraction, 128)
    .storeUint(state.latestShortCumulativePremiumFraction, 128)
    .storeUint(state.nextFundingBlockTimestamp, 32)
    .storeUint(state.fundingMode, 2)
    .storeUint(state.longFundingRate, 32)
    .storeUint(state.shortFundingRate, 32)
    .endCell();
}

export function unpackFundingState(cell: Cell): FundingState {
  const cs = cell.beginParse();
  return {
    latestLongCumulativePremiumFraction: BigInt(cs.loadUint(128)),
    latestShortCumulativePremiumFraction: BigInt(cs.loadUint(128)),
    nextFundingBlockTimestamp: BigInt(cs.loadUint(32)),
    fundingMode: cs.loadUint(2),
    longFundingRate: BigInt(cs.loadUint(32)),
    shortFundingRate: BigInt(cs.loadUint(32)),
  };
}

export function vammConfigToCell(config: VammConfig): Cell {
  return beginCell()
    .storeCoins(config.balance)
    .storeUint(config.oraclePrice, 128)
    .storeAddress(config.routerAddr)
    .storeRef(packExchangeSettings(config.exchangeSettings))
    .storeRef(packAmmState(config.ammState))
    .storeRef(packAmmState(config.ammState))
    .storeRef(config.positionCode)
    .endCell();
}
export function packIncreasePositionBody(body: IncreasePositionBody): Cell {
  return beginCell()
    .storeCoins(body.amount)
    .storeUint(body.direction, 2)
    .storeUint(body.leverage, 32)
    .storeUint(body.minBaseAssetAmount, 128)
    .endCell();
}

export function unpackWithdrawMessage(body: Cell) {
  const cs = body.beginParse();
  if (cs.loadUint(32) !== VammOpcodes.withdraw) throw new Error('Not a withdraw message');
  return {
    queryId: cs.loadUint(64),
    amount: cs.loadCoins(),
    tradderAddress: cs.loadAddress(),
  };
}

export class Vamm implements Contract {
  constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

  static createFromAddress(address: Address) {
    return new Vamm(address);
  }

  static createFromConfig(config: VammConfig, code: Cell, workchain = 0) {
    const data = vammConfigToCell(config);
    const init = { code, data };
    return new Vamm(contractAddress(workchain, init), init);
  }

  static closePosition(opts: {
    queryID?: number;
    oldPosition: PositionData;
    addToMargin?: boolean;
    size?: bigint;
    minQuoteAssetAmount?: bigint;
  }) {
    return beginCell()
      .storeUint(VammOpcodes.closePosition, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeUint(opts.size ?? opts.oldPosition.size, 128)
      .storeUint(opts.minQuoteAssetAmount ?? 0, 128)
      .storeBit(opts.addToMargin ?? false)
      .storeRef(packPositionData(opts.oldPosition))
      .endCell();
  }

  static increasePosition(opts: {
    queryID?: number;
    oldPosition: PositionData;
    increasePositionBody: IncreasePositionBody;
  }) {
    return beginCell()
      .storeUint(VammOpcodes.increasePosition, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeSlice(packIncreasePositionBody(opts.increasePositionBody).asSlice())
      .storeRef(packPositionData(opts.oldPosition))
      .endCell();
  }

  static addMargin(opts: { queryID?: number; oldPosition: PositionData; amount: bigint }) {
    return beginCell()
      .storeUint(VammOpcodes.addMargin, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeCoins(opts.amount)
      .storeRef(packPositionData(opts.oldPosition))
      .endCell();
  }

  static removeMargin(opts: { queryID?: number; oldPosition: PositionData; amount: bigint }) {
    return beginCell()
      .storeUint(VammOpcodes.removeMargin, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeCoins(opts.amount)
      .storeRef(packPositionData(opts.oldPosition))
      .endCell();
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      body: beginCell().endCell(),
    });
  }

  async sendIncreasePosition(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      oldPosition: PositionData;
      increasePositionBody: IncreasePositionBody;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Vamm.increasePosition(opts),
    });
  }

  async sendAddMargin(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      oldPosition: PositionData;
      amount: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Vamm.addMargin(opts),
    });
  }

  async sendRemoveMargin(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      oldPosition: PositionData;
      amount: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Vamm.removeMargin(opts),
    });
  }

  async sendClosePosition(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      oldPosition: PositionData;
      addToMargin?: boolean;
      size?: bigint;
      minQuoteAssetAmount?: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Vamm.closePosition(opts),
    });
  }

  async getAmmData(provider: ContractProvider): Promise<Omit<VammConfig, 'positionCode'>> {
    const { stack } = await provider.get('get_amm_data', []);

    return {
      balance: stack.readBigNumber(),
      oraclePrice: stack.readBigNumber(),
      routerAddr: stack.readAddress(),
      exchangeSettings: unpackExchangeSettings(stack.readCell()),
      ammState: unpackAmmState(stack.readCell()),
      fundingState: unpackFundingState(stack.readCell()),
      // positionCode: stack.readCell(),
    };
  }
}
