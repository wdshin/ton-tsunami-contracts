import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { Oracle } from '../wrappers/Oracle';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('Oracle', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('Oracle');
  });

  let blockchain: Blockchain;
  let oracle: SandboxContract<Oracle>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    oracle = blockchain.openContract(Oracle.createFromConfig({}, code));

    const deployer = await blockchain.treasury('deployer');

    const deployResult = await oracle.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: oracle.address,
      deploy: true,
    });
  });

  it('should deploy', async () => {
    // the check is done inside beforeEach
    // blockchain and oracle are ready to use
  });
});
