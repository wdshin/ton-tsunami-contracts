import { Blockchain } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { TestContract } from '../wrappers/TestContract';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('TestContract', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('TestContract');
    });

    it('should deploy', async () => {
        const blockchain = await Blockchain.create();

        const testContract = blockchain.openContract(
            TestContract.createFromConfig(
                {
                    id: 0,
                    counter: 0,
                },
                code
            )
        );

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await testContract.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: testContract.address,
            deploy: true,
        });
    });

    it('should increase counter', async () => {
        const blockchain = await Blockchain.create();

        const testContract = blockchain.openContract(
            TestContract.createFromConfig(
                {
                    id: 0,
                    counter: 0,
                },
                code
            )
        );

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await testContract.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: testContract.address,
            deploy: true,
        });

        const increaseTimes = 3;
        for (let i = 0; i < increaseTimes; i++) {
            console.log(`increase ${i + 1}/${increaseTimes}`);

            const increaser = await blockchain.treasury('increaser' + i);

            const counterBefore = await testContract.getCounter();

            console.log('counter before increasing', counterBefore);

            const increaseBy = Math.floor(Math.random() * 100);

            console.log('increasing by', increaseBy);

            const increaseResult = await testContract.sendIncrease(increaser.getSender(), {
                increaseBy,
                value: toNano('0.05'),
            });

            expect(increaseResult.transactions).toHaveTransaction({
                from: increaser.address,
                to: testContract.address,
                success: true,
            });

            const counterAfter = await testContract.getCounter();

            console.log('counter after increasing', counterAfter);

            expect(counterAfter).toBe(counterBefore + increaseBy);
        }
    });
});
