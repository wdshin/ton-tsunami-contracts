import {
  Address,
  beginCell,
  Cell,
  Contract,
  ContractProvider,
  Sender,
  SendMode,
} from 'ton-core';

const Opcodes = {
  transfer: 0xf8a7ea5,
};

type Transfer = {
  amount: bigint;
  queryID?: number;
  destination: Address;
  responseDestination?: Address;
  forwardAmount: bigint;
  forwardPayload?: Cell;
};

export class JettonWallet implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new JettonWallet(address);
  }

  static transferBody(opts: Transfer) {
    const cell = beginCell()
      .storeUint(Opcodes.transfer, 32)
      .storeUint(opts.queryID ?? 0, 64)
      .storeCoins(opts.amount)
      .storeAddress(opts.destination)
      .storeAddress(opts.responseDestination ?? null)
      .storeBit(false)
      .storeCoins(opts.forwardAmount);

    if (opts.forwardPayload) {
      cell.storeBit(true);
      cell.storeRef(opts.forwardPayload);
    } else {
      cell.storeBit(false);
    }

    return cell.endCell();
  }

  async sendTransfer(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    opts: Transfer
  ) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATLY,
      body: JettonWallet.transferBody(opts),
    });
  }
}
