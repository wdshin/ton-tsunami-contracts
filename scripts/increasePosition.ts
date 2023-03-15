import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { toStablecoin } from '../utils';
import { JettonWallet } from '../wrappers/JettonWallet';
import { Direction, Vamm } from '../wrappers/Vamm';

const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');

export async function run(provider: NetworkProvider) {
  const vammAddress = Address.parse('EQBDvMrJpv7nqLfPurq_MFcvdjtNAaJw8-kdTZ4z1c542mmM');

  const openedVamm = provider.open(Vamm.createFromAddress(vammAddress));
  const positionAddres = await openedVamm.getTraderPositionAddress(provider.sender().address!);
  console.log('Position address');
  console.log(positionAddres.toString());

  const usdcJW = await JettonWallet.createFromMaster(
    provider.api(),
    usdcAddr,
    provider.sender().address!
  );
  const openedJW = provider.open(usdcJW);

  const forwardPayload = Vamm.increasePosition({
    direction: Direction.short,
    leverage: toStablecoin(100),
    minBaseAssetAmount: toStablecoin(0.15),
  });

  await openedJW.sendTransfer(provider.sender(), toNano('0.3'), {
    amount: toStablecoin(1000),
    destination: vammAddress,
    forwardAmount: toNano('0.25'),
    responseDestination: provider.sender().address,
    forwardPayload,
  });
}
