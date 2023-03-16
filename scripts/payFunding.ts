import { Address, toNano } from 'ton-core';
import { NetworkProvider, sleep } from '@ton-community/blueprint';
import { Vamm } from '../wrappers/Vamm';

export async function run(provider: NetworkProvider) {
  const vammAddress = Address.parse('EQBqY0E6uG55C3gzC6GgWNE-VreayHxNvQhHXRS1O2CbPZMm');
  const openedVamm = provider.open(Vamm.createFromAddress(vammAddress));

  const { fundingState } = await openedVamm.getAmmData();
  console.log(
    'Prev next funding time:',
    new Date(Number(fundingState.nextFundingBlockTimestamp * 1000n))
  );

  await openedVamm.sendPayFunding(provider.sender(), {
    value: toNano('0.25'),
  });

  await sleep(12000);

  const { fundingState: newFundingState } = await openedVamm.getAmmData();
  console.log(
    'New next funding time:',
    new Date(Number(newFundingState.nextFundingBlockTimestamp * 1000n))
  );
}
