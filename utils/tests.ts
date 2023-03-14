import { compile } from '@ton-community/blueprint';
import { Blockchain } from '@ton-community/sandbox';
import { EventMessageSent, Event } from '@ton-community/sandbox/dist/event/Event';
import { Address, toNano } from 'ton-core';
import { OraclePrice } from '../wrappers/Oracle';
import {
  PositionData,
  PositionWallet,
  PositionWalletOpcodes,
  unpackPositionData,
} from '../wrappers/PositionWallet';
import { unpackWithdrawMessage } from '../wrappers/Vamm';
import { toStablecoin } from './common';

function extractEventByOpcode(events: Event[], op: number): EventMessageSent {
  const targetEvent = events.find(
    (ev) => ev.type === 'message_sent' && ev.body.beginParse().preloadInt(32) === op
  );
  if (!targetEvent) throw new Error(`Event with ${op} op was not sent`);
  return targetEvent as EventMessageSent;
}

export function getUpdatePositionMessage(events: Event[]): PositionData {
  return unpackPositionData(
    extractEventByOpcode(events, PositionWalletOpcodes.updatePosition)
      .body.beginParse()
      .preloadRef()
  );
}

export function getWithdrawMessage(events: Event[]) {
  return unpackWithdrawMessage(extractEventByOpcode(events, 0xf8a7ea5).body); // op::transfer
}

export function getInitPosition(traderAddress: Address): PositionData {
  return {
    size: 0n,
    margin: 0n,
    openNotional: 0n,
    lastUpdatedCumulativePremium: 0n,
    fee: 0n,
    lastUpdatedTimestamp: 0n,
    traderAddress,
  };
}

export function getOraclePrice(price: number): OraclePrice {
  return {
    price: toStablecoin(price),
    lastUpdateBlockLT: 0,
    lastUpdateTS: 0,
  };
}

export async function bootstrapTrader(blockchain: Blockchain, vammAddress: Address, role: string) {
  let trader = await blockchain.treasury(role);
  let traderPosition = blockchain.openContract(
    PositionWallet.createEmpty(vammAddress, trader.address, await compile('PositionWallet'))
  );
  let lastTraderPosition = getInitPosition(trader.address);
  await traderPosition.sendDeploy(trader.getSender(), toNano('0.1'));

  return [trader, lastTraderPosition, traderPosition] as const;
}
