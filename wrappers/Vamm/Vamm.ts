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
    .storeCoins(settings.maxOpenNotional)
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
    maxOpenNotional: BigInt(cs.loadCoins()),
    feeToStakersPercent: BigInt(cs.loadUint(32)),
    maxOracleDelay: BigInt(cs.loadUint(32)),
  };
}

export function packAmmState(state: AmmState) {
  return beginCell()
    .storeCoins(state.quoteAssetReserve)
    .storeCoins(state.baseAssetReserve)
    .storeUint(state.quoteAssetWeight, 32)
    .storeCoins(state.totalLongPositionSize)
    .storeCoins(state.totalShortPositionSize)
    .storeCoins(state.openInterestLong)
    .storeCoins(state.openInterestShort)
    .endCell();
}

export function unpackAmmState(cell: Cell): AmmState {
  const cs = cell.beginParse();
  return {
    quoteAssetReserve: BigInt(cs.loadCoins()),
    baseAssetReserve: BigInt(cs.loadCoins()),
    quoteAssetWeight: BigInt(cs.loadUint(32)),
    totalLongPositionSize: BigInt(cs.loadCoins()),
    totalShortPositionSize: BigInt(cs.loadCoins()),
    openInterestLong: BigInt(cs.loadCoins()),
    openInterestShort: BigInt(cs.loadCoins()),
  };
}

export function packFundingState(state: FundingState) {
  return beginCell()
    .storeCoins(state.latestLongCumulativePremiumFraction)
    .storeCoins(state.latestShortCumulativePremiumFraction)
    .storeUint(state.nextFundingBlockTimestamp, 32)
    .storeUint(state.fundingMode, 2)
    .storeUint(state.longFundingRate, 32)
    .storeUint(state.shortFundingRate, 32)
    .endCell();
}

export function unpackFundingState(cell: Cell): FundingState {
  const cs = cell.beginParse();
  return {
    latestLongCumulativePremiumFraction: BigInt(cs.loadCoins()),
    latestShortCumulativePremiumFraction: BigInt(cs.loadCoins()),
    nextFundingBlockTimestamp: BigInt(cs.loadUint(32)),
    fundingMode: cs.loadUint(2),
    longFundingRate: BigInt(cs.loadUint(32)),
    shortFundingRate: BigInt(cs.loadUint(32)),
  };
}

export function vammConfigToCell(config: VammConfig): Cell {
  return beginCell()
    .storeCoins(config.balance)
    .storeCoins(config.oraclePrice)
    .storeAddress(config.routerAddr)
    .storeRef(packExchangeSettings(config.exchangeSettings))
    .storeRef(packAmmState(config.ammState))
    .storeRef(packFundingState(config.fundingState))
    .storeRef(config.positionCode)
    .endCell();
}
export function packIncreasePositionBody(body: IncreasePositionBody): Cell {
  return beginCell()
    .storeCoins(body.amount)
    .storeUint(body.direction, 1)
    .storeUint(body.leverage, 32)
    .storeCoins(body.minBaseAssetAmount)
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
      .storeInt(opts.size ?? opts.oldPosition.size, 128)
      .storeCoins(opts.minQuoteAssetAmount ?? 0)
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
