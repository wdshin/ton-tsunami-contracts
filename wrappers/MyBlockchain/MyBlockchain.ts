import {
  Blockchain,
  BlockchainStorage,
  LocalBlockchainStorage,
  MessageParams,
} from '@ton-community/sandbox';
import { Executor } from '@ton-community/sandbox/dist/executor/Executor';
import { Cell } from 'ton-core';
import { getCurrentTimestamp } from '../../utils';

export class MyBlockchain extends Blockchain {
  now: number = getCurrentTimestamp();

  protected async processQueue(params?: MessageParams) {
    return await super.processQueue({
      ...params,
      now: this.now,
    });
  }

  static async create(opts?: { config?: Cell; storage?: BlockchainStorage }) {
    return new MyBlockchain({
      executor: await Executor.create(),
      storage: opts?.storage ?? new LocalBlockchainStorage(),
      ...opts,
    });
  }
}
