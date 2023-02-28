import { Address, toNano } from 'ton-core';
import { Router } from '../wrappers/Router/Router';
import { NetworkProvider } from '@ton-community/blueprint';
import { addressToCell, sleep, toStablecoin } from '../utils';
import { JettonWallet } from '../wrappers/JettonWallet/JettonWallet';

const usdcAddr = Address.parse('kQBaYzBs3DaCEFtaE8fwQat_74IPBaLRQOTgZgPTPOVUDsFb');

const Direction = {
  long: 1,
  short: 2,
};

export async function run(provider: NetworkProvider) {
  const routerAddress = Address.parse('EQAsZsZ4lxL5piHTn5gxRfOJenRxmGhy2BIjVFkltNVUd2cM');

  // const routerJWAddress = (
  //   await provider
  //     .api()
  //     .callGetMethod(usdcAddr, 'get_wallet_address', [
  //       { type: 'slice', cell: addressToCell(provider.sender().address!) },
  //     ])
  // ).stack.readAddress();
  // const router = new Router(routerAddress);
  // const openedRouter = provider.open(router);
  // await openedRouter.sendSetWhitelistedAddress(provider.sender(), {
  //   value: toNano('0.05'),
  //   address: routerJWAddress,
  // });

  await sleep(1500);

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
    forwardAmount: toNano('0.2'),
    forwardPayload,
  });
}
