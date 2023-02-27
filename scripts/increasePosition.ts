import { Address, toNano } from 'ton';
import QRCode from 'qrcode';
import { Vamm } from '../wrappers/Vamm/Vamm';
import { tonDeepLink, toStablecoin } from '../utils';
import { IncreasePositionBody } from '../wrappers/Vamm';
import { PositionData } from '../wrappers/TraderPositionWallet';

export async function run() {
  const address = Address.parse(
    'EQB4IIpbFFCcwOtMeFZ6cYHgJgWFnKheskUpZ5yD3mUFXmZ_'
  );

  const oldPosition: PositionData = {
    size: 0n,
    margin: 0n,
    openNotional: 0n,
    lastUpdatedCumulativePremium: 0n,
    fee: 0n,
    lastUpdatedTimestamp: 0n,
  };
  const increasePositionBody: IncreasePositionBody = {
    direction: 1,
    leverage: toStablecoin(2),
    minBaseAssetAmount: toStablecoin(10),
    traderAddress: Address.parse(
      'EQAdeaoRSNRoV7ABKgr-gx70pSG6XTTPyITnGLTUZNevSYCO'
    ),
  };

  const increaseBody = Vamm.increasePosition({
    oldPosition,
    increasePositionBody,
    amount: toStablecoin(200),
  });
  const increaseAmount = toNano('0.1');

  const increaseLink = tonDeepLink({
    address,
    amount: increaseAmount,
    body: increaseBody,
  });

  console.log(increaseLink);
  console.log(
    await QRCode.toString(increaseLink, { type: 'terminal', small: true })
  );
}
