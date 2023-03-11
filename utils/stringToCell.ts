import { beginCell, Builder, Cell } from 'ton-core';

const CELL_MAX_SIZE_BYTES = Math.floor((1023 - 8) / 8);

function recWriteCell(rootBuilder: Builder = new Builder(), bufferToStore: Buffer): Builder {
  rootBuilder.storeBuffer(bufferToStore.slice(0, CELL_MAX_SIZE_BYTES));
  bufferToStore = bufferToStore.slice(CELL_MAX_SIZE_BYTES);

  if (bufferToStore.length > 0) {
    rootBuilder.storeRef(recWriteCell(beginCell(), bufferToStore).endCell());
  }
  return rootBuilder;
}

export function stringToCell(str: string, encoding: BufferEncoding = 'utf8'): Cell {
  let bufferToStore = Buffer.from(str, encoding);

  let rootBuilder = beginCell();

  if (bufferToStore.length > 0) {
    rootBuilder = recWriteCell(rootBuilder, bufferToStore);
  }

  return rootBuilder.endCell();
}
