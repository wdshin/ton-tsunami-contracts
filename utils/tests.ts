import { EventMessageSent, Event } from '@ton-community/sandbox/dist/event/Event';
import { Address } from 'ton-core';
import { OraclePrice } from '../wrappers/Oracle';
import { PositionData, unpackPositionData } from '../wrappers/PositionWallet';
import { unpackWithdrawMessage } from '../wrappers/Vamm';
import { toStablecoin } from './common';

function extractEventAtIndex(events: Event[], index = -1): EventMessageSent {
  const lastVammTx = events.at(index);
  if (lastVammTx?.type !== 'message_sent')
    throw new Error(`Event at ${index} is not a sent message`);
  return lastVammTx;
}

export function getAndUnpackPosition(events: Event[], index = -1): PositionData {
  return unpackPositionData(extractEventAtIndex(events, index).body.beginParse().preloadRef());
}

export function getAndUnpackWithdrawMessage(events: Event[], index = -1) {
  return unpackWithdrawMessage(extractEventAtIndex(events, index).body);
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
