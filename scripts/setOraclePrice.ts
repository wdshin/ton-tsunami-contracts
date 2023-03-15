import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { Oracle } from '../wrappers/Oracle';
import { sleep, toStablecoin } from '../utils';

export async function run(provider: NetworkProvider) {
  const oracle = provider.open(
    Oracle.createFromAddress(Address.parse('EQBfEf_c0R8HECHgPslzZ0x6F8NBz4OdAVVUj0Z6Qgrfwpwp'))
  );

  const oracleDataPrev = await oracle.getOracleData();
  console.log({ oracleDataPrev });

  await oracle.sendSetPrice(provider.sender(), { value: toNano('0.05'), price: toStablecoin(2.2) });

  await sleep(12000);

  const oracleDataNext = await oracle.getOracleData();
  console.log({ oracleDataNext });
}
