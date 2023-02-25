import { beginCell, Address, Cell, toNano } from 'ton';
import QRCode from 'qrcode';

export const tonDeepLink = ({
  address,
  amount,
  body,
  stateInit,
  prefix = 'ton://',
}: {
  address: Address;
  amount: bigint;
  body?: Cell;
  stateInit?: Cell;
  prefix?: string;
}) =>
  `${prefix}transfer/${address.toString({
    urlSafe: true,
    bounceable: true,
  })}?amount=${amount.toString(10)}${
    body ? '&bin=' + body.toBoc().toString('base64url') : ''
  }${stateInit ? '&init=' + stateInit.toBoc().toString('base64url') : ''}`;

export async function run() {
  const address = Address.parse(
    'EQAXXAcOJKX874Y0AFsiJpEyr1oIywacfqjvWA01vksMLND9'
  );

  const increaseBody = beginCell()
    .storeUint(0x7e8764ef, 32) // increase op
    .storeUint(0, 64) // query_id (not used)
    .storeUint(1, 32) // increase_by
    .endCell();

  const increaseAmount = toNano('0.05');

  const increaseLink = tonDeepLink({
    address,
    amount: increaseAmount,
    body: increaseBody,
  });

  console.log(increaseLink);
  console.log(
    await QRCode.toString(increaseLink, { type: 'terminal', small: true })
  );

  const resetBody = beginCell()
    .storeUint(0xf6ce5dcc, 32) // reset op
    .storeUint(0, 64) // query_id (not used)
    .endCell();

  const resetAmount = toNano('0.05');

  const resetLink = tonDeepLink({
    address,
    amount: resetAmount,
    body: resetBody,
  });

  console.log(resetLink);
  console.log(
    await QRCode.toString(resetLink, { type: 'terminal', small: true })
  );
}
