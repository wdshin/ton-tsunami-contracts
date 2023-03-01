import { Address, toNano } from 'ton-core';
import { Router } from '../wrappers/Router/Router';
import { NetworkProvider } from '@ton-community/blueprint';
import { addressToCell, sleep, toStablecoin } from '../utils';
import { JettonWallet } from '../wrappers/JettonWallet/JettonWallet';
import { Vamm } from '../wrappers/Vamm';

const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');

const Direction = { long: 1, short: 2 };

export async function run(provider: NetworkProvider) {
  const routerAddress = Address.parse('EQD_wZqnlZHUrRb845Gg5tRUa0ssVfmpq4KgdnyhCZtdXkdZ');

  const deployerJWAddress = (
    await provider
      .api()
      .callGetMethod(usdcAddr, 'get_wallet_address', [
        { type: 'slice', cell: addressToCell(provider.sender().address!) },
      ])
  ).stack.readAddress();
  const deployerJW = JettonWallet.createFromAddress(deployerJWAddress);
  const openedDeployerJW = provider.open(deployerJW);

  const forwardPayload = Router.increasePosition({
    body: {
      direction: Direction.long,
      leverage: toStablecoin(3),
      minBaseAssetAmount: toStablecoin(0.15),
      traderAddress: provider.sender().address!,
      amount: toStablecoin(10),
    },
  });

  await openedDeployerJW.sendTransfer(provider.sender(), toNano('0.3'), {
    amount: toStablecoin(10),
    destination: routerAddress,
    forwardAmount: toNano('0.255'),
    forwardPayload,
  });
}
