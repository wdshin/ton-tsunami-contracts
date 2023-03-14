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
import { addressToCell, BigMath, toStablecoin, toStablecoinFloat } from '../../utils';
import { OraclePrice, packOraclePrice } from '../Oracle';
import { packPositionData, PositionData } from '../PositionWallet';

import {
  AmmState,
  ExchangeSettings,
  VammConfig,
  VammOpcodes,
  IncreasePositionBody,
  FundingState,
  VammExtraData,
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

export function packVammExtraData(settings: VammExtraData) {
  return beginCell()
    .storeAddress(settings.vaultAddress)
    .storeAddress(settings.adminAddress)
    .storeBit(settings.paused)
    .storeBit(settings.closedOnly)
    .storeUint(settings.indexId, 16)
    .storeRef(settings.positionWalletCode)
    .endCell();
}

export function unpackVammExtraData(cell: Cell): VammExtraData {
  const cs = cell.beginParse();
  return {
    vaultAddress: cs.loadAddress(),
    adminAddress: cs.loadAddress(),
    paused: cs.loadBit(),
    closedOnly: cs.loadBit(),
    indexId: cs.loadUint(16),
    positionWalletCode: cs.loadRef(),
  };
}

export function vammConfigToCell(config: VammConfig): Cell {
  return beginCell()
    .storeCoins(config.balance)
    .storeAddress(config.oracleAddress)
    .storeAddress(config.jettonWalletAddress)
    .storeRef(packExchangeSettings(config.exchangeSettings))
    .storeRef(packAmmState(config.ammState))
    .storeRef(packFundingState(config.fundingState))
    .storeRef(packVammExtraData(config.extraData))
    .endCell();
}
export function packIncreasePositionBody(body: IncreasePositionBody): Cell {
  return beginCell()
    .storeUint(body.direction, 1)
    .storeUint(body.leverage, 32)
    .storeCoins(body.minBaseAssetAmount ?? 0)
    .endCell();
}

export function unpackWithdrawMessage(body: Cell) {
  const cs = body.beginParse();
  if (cs.loadUint(32) !== 0xf8a7ea5) throw new Error('Not a withdraw message');

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
    addToMargin?: boolean;
    size: bigint;
    minQuoteAssetAmount?: bigint;
  }) {
    return beginCell()
      .storeUint(VammOpcodes.closePosition, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeInt(BigMath.abs(opts.size), 128)
      .storeCoins(opts.minQuoteAssetAmount ?? 0)
      .storeBit(opts.addToMargin ?? false)
      .endCell();
  }

  static closePositionRaw(opts: {
    queryID?: number;
    addToMargin?: boolean;
    size?: bigint;
    minQuoteAssetAmount?: bigint;
    oracleRedirectAddress: Address;
    oldPosition: PositionData;
    priceData: OraclePrice;
  }) {
    return beginCell()
      .storeUint(VammOpcodes.oraclePriceResponse, 32)
      .storeAddress(opts.oracleRedirectAddress)
      .storeUint(VammOpcodes.closePosition, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeUint(BigMath.abs(opts.size ?? opts.oldPosition.size), 128)
      .storeCoins(opts.minQuoteAssetAmount ?? 0)
      .storeBit(opts.addToMargin ?? false)
      .storeRef(packPositionData(opts.oldPosition))
      .storeRef(packOraclePrice(opts.priceData))
      .endCell();
  }

  static addMargin() {
    return beginCell().storeUint(VammOpcodes.addMargin, 32).endCell();
  }

  static addMarginRaw(opts: {
    queryID?: number;
    oldPosition: PositionData;
    amount: bigint;
    priceData: OraclePrice;
    oracleRedirectAddress: Address;
  }) {
    return beginCell()
      .storeUint(VammOpcodes.oraclePriceResponse, 32)
      .storeAddress(opts.oracleRedirectAddress)
      .storeUint(VammOpcodes.addMargin, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeCoins(opts.amount)
      .storeRef(packPositionData(opts.oldPosition))
      .storeRef(packOraclePrice(opts.priceData))
      .endCell();
  }

  static removeMargin(opts: { queryID?: number; amount: bigint }) {
    return beginCell()
      .storeUint(VammOpcodes.removeMargin, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeCoins(opts.amount)
      .endCell();
  }

  static removeMarginRaw(opts: {
    queryID?: number;
    amount: bigint;
    oldPosition: PositionData;
    oracleRedirectAddress: Address;
    priceData: OraclePrice;
  }) {
    return beginCell()
      .storeUint(VammOpcodes.oraclePriceResponse, 32)
      .storeAddress(opts.oracleRedirectAddress)
      .storeUint(VammOpcodes.removeMargin, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeCoins(opts.amount)
      .storeRef(packPositionData(opts.oldPosition))
      .storeRef(packOraclePrice(opts.priceData))
      .endCell();
  }

  static setJettonWalletAddress(opts: { queryID?: number; address: Address }) {
    return beginCell()
      .storeUint(VammOpcodes.setJettonWalletAddress, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeAddress(opts.address)
      .endCell();
  }

  static increasePosition(opts: IncreasePositionBody) {
    return beginCell()
      .storeUint(VammOpcodes.increasePosition, 32)
      .storeSlice(packIncreasePositionBody(opts).beginParse())
      .endCell();
  }

  static increasePositionRaw(opts: {
    queryID?: number;
    amount: bigint;
    oracleRedirectAddress: Address;
    oldPosition: PositionData;
    priceData: OraclePrice;
    increasePositionBody: IncreasePositionBody;
  }) {
    return beginCell()
      .storeUint(VammOpcodes.oraclePriceResponse, 32)
      .storeAddress(opts.oracleRedirectAddress)
      .storeUint(VammOpcodes.increasePosition, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeCoins(opts.amount)
      .storeRef(packIncreasePositionBody(opts.increasePositionBody))
      .storeRef(packPositionData(opts.oldPosition))
      .storeRef(packOraclePrice(opts.priceData))
      .endCell();
  }

  async sendDeploy(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    jettonWalletAddress: Address
  ) {
    await provider.internal(via, {
      value,
      body: Vamm.setJettonWalletAddress({ address: jettonWalletAddress }),
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
      body: Vamm.closePosition(opts),
    });
  }

  async sendSetOraclePrice(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      price: number;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VammOpcodes.setOraclePrice, 32)
        .storeUint(opts.queryID ?? 0, 64)
        .storeCoins(toStablecoin(opts.price))
        .endCell(),
    });
  }

  async sendLiquidate(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      liquidator: Address;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VammOpcodes.liquidate, 32)
        .storeUint(opts.queryID ?? 0, 64)
        .storeAddress(opts.liquidator)
        .endCell(),
    });
  }

  async sendLiquidateRaw(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      liquidator: Address;
      oracleRedirectAddress: Address;
      oldPosition: PositionData;
      priceData: OraclePrice;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VammOpcodes.oraclePriceResponse, 32)
        .storeAddress(opts.oracleRedirectAddress)
        .storeUint(VammOpcodes.liquidate, 32)
        .storeUint(opts.queryID ?? 0, 64)
        .storeAddress(opts.liquidator)
        .storeRef(packPositionData(opts.oldPosition))
        .storeRef(packOraclePrice(opts.priceData))
        .endCell(),
    });
  }

  async sendPayFunding(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VammOpcodes.payFunding, 32)
        .storeUint(opts.queryID ?? 0, 64)
        .endCell(),
    });
  }

  async sendPayFundingRaw(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      oracleRedirectAddress: Address;
      priceData: OraclePrice;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(VammOpcodes.oraclePriceResponse, 32)
        .storeAddress(opts.oracleRedirectAddress)
        .storeUint(VammOpcodes.payFunding, 32)
        .storeUint(opts.queryID ?? 0, 64)
        .storeAddress(
          via.address ?? Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c')
        )
        .storeRef(packOraclePrice(opts.priceData))
        .endCell(),
    });
  }

  async sendIncreasePosition(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      amount: bigint;
      oldPosition: PositionData;
      priceData: OraclePrice;
      oracleRedirectAddress: Address;
      increasePositionBody: IncreasePositionBody;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Vamm.increasePositionRaw(opts),
    });
  }

  async sendAddMargin(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      oldPosition: PositionData;
      priceData: OraclePrice;
      oracleRedirectAddress: Address;
      amount: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Vamm.addMarginRaw(opts),
    });
  }

  async sendRemoveMargin(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      amount: bigint;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Vamm.removeMargin(opts),
    });
  }

  async sendRemoveMarginRaw(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      amount: bigint;
      oracleRedirectAddress: Address;
      oldPosition: PositionData;
      priceData: OraclePrice;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Vamm.removeMarginRaw(opts),
    });
  }

  async sendClosePositionRaw(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      queryID?: number;
      addToMargin?: boolean;
      size?: bigint;
      minQuoteAssetAmount?: bigint;
      oracleRedirectAddress: Address;
      oldPosition: PositionData;
      priceData: OraclePrice;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Vamm.closePositionRaw(opts),
    });
  }

  async getAmmData(provider: ContractProvider): Promise<VammConfig> {
    const { stack } = await provider.get('get_amm_data', []);

    return {
      balance: stack.readBigNumber(),
      oracleAddress: stack.readAddress(),
      jettonWalletAddress: stack.readAddress(),
      exchangeSettings: unpackExchangeSettings(stack.readCell()),
      ammState: unpackAmmState(stack.readCell()),
      fundingState: unpackFundingState(stack.readCell()),
      extraData: unpackVammExtraData(stack.readCell()),
    };
  }

  async getMarketPrice(provider: ContractProvider): Promise<number> {
    const { ammState } = await this.getAmmData(provider);
    const { quoteAssetReserve, quoteAssetWeight, baseAssetReserve } = ammState;

    let rawQ = toStablecoinFloat(quoteAssetReserve * quoteAssetWeight);
    let rawB = toStablecoinFloat(baseAssetReserve * 1000000n);

    return parseFloat((rawQ / rawB).toFixed(4));
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
