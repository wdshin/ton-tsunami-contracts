import { Address, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { Router } from '../wrappers/Router/Router';
import { toStablecoin } from '../utils';
import { JettonWallet } from '../wrappers/JettonWallet/JettonWallet';
import { Direction, Vamm } from '../wrappers/Vamm';

const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');

export async function run(provider: NetworkProvider) {
  const vammAddress = Address.parse('EQBvysH8tXBOTKNqBuEmbZeYiPVaHXoIsdbGP2Q3nSzsLIMd');

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
    direction: Direction.long,
    leverage: toStablecoin(3),
    minBaseAssetAmount: toStablecoin(0.15),
  });

  await openedJW.sendTransfer(provider.sender(), toNano('0.2'), {
    amount: toStablecoin(100),
    destination: vammAddress,
    forwardAmount: toNano('0.15'),
    responseDestination: provider.sender().address,
    forwardPayload,
  });
}
