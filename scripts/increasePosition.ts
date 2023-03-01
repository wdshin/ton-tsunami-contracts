import { Address, toNano } from 'ton-core';
import { Router } from '../wrappers/Router/Router';
import { NetworkProvider } from '@ton-community/blueprint';
import { toStablecoin } from '../utils';
import { JettonWallet } from '../wrappers/JettonWallet/JettonWallet';

const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');
const fakeUsdAddr = Address.parse('kQDuLkq23W-n4U200Ppqn-6ZLcGa2CTqa3KKgrMB0ZpwqUO_');
const Direction = { long: 1, short: 2 };

export async function run(provider: NetworkProvider) {
  const routerAddress = Address.parse('EQB3ZM4hbAaf3yh12WMEIT1QdPePiDn0Eo9zUV2AKK2-WWmc');

  const usdcJW = await JettonWallet.createFromMaster(
    provider.api(),
    usdcAddr,
    provider.sender().address!
  );
  const openedJW = provider.open(usdcJW);

  const usdfJW = await JettonWallet.createFromMaster(
    provider.api(),
    fakeUsdAddr,
    provider.sender().address!
  );
  const openedFakeJW = provider.open(usdfJW);

  const forwardPayload = Router.increasePosition({
    body: {
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.15),
      traderAddress: provider.sender().address!,
      amount: toStablecoin(100),
    },
  });

  await openedFakeJW.sendTransfer(provider.sender(), toNano('0.3'), {
    amount: toStablecoin(100),
    destination: routerAddress,
    forwardAmount: toNano('0.255'),
    forwardPayload,
  });

  await openedJW.sendTransfer(provider.sender(), toNano('0.3'), {
    amount: toStablecoin(100),
    destination: routerAddress,
    forwardAmount: toNano('0.255'),
    forwardPayload,
  });
}
