import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { toStablecoin } from '../utils';
import { JettonWallet } from '../wrappers/JettonWallet';
import { Vamm } from '../wrappers/Vamm';

const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');

export async function run(provider: NetworkProvider) {
  const vammAddress = Address.parse('EQCo6ux4pn8J818iENcocGca7wn0vX3YWJX0gJLcNIGx5lUp');

  const openedVamm = provider.open(Vamm.createFromAddress(vammAddress));
  const positionAddres = await openedVamm.getTraderPositionAddress(provider.sender().address!);
  console.log('Position address');
  console.log(positionAddres.toString());

  // 24565; 40843267711n 60224642807n
  console.log(await openedVamm.getAmmData());

  const usdcJW = await JettonWallet.createFromMaster(
    provider.api(),
    usdcAddr,
    provider.sender().address!
  );
  const openedJW = provider.open(usdcJW);

  const forwardPayload = Vamm.addMargin();

  await openedJW.sendTransfer(provider.sender(), toNano('0.3'), {
    amount: toStablecoin(1000),
    destination: vammAddress,
    forwardAmount: toNano('0.25'),
    responseDestination: provider.sender().address,
    forwardPayload,
  });
}
