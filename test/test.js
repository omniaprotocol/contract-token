const ERC20Token = artifacts.require('ERC20');
const IERC20 = artifacts.require('IERC20Metadata');


const BigNumber = web3.utils.BN;

const INITIAL_TOTAL_SUPPLY = new BigNumber('100000000000000000000000000');
const ONE_HUNDRED_OMNIA = new BigNumber('100000000000000000000');
const ONE_MIL_OMNIA = new BigNumber('1000000000000000000000000');

const SC_NAME = 'OMNIA Protocol';
const SC_SYMBOL = 'OMNIA';
const SC_DECIMALS = 18;

let erc20 = null;
let ierc20 = null;

async function expectThrow(promise) {
    try {
      await promise;
    } catch (error) {
  
      const invalidOpcode = error.message.search(/invalid opcode/i) >= 0;
      const outOfGas = error.message.search(/out of gas/i) >= 0;
      const revert = error.message.search(/revert/i) >= 0;
      assert(
        invalidOpcode || outOfGas || revert,
        `Expected throw, got ${error} instead`,
      );
      return;
    }
    assert.fail('Expected throw not received');
  }

contract('OMNIA', (
    [owner, alice, bob, charlie, mallory]) => {


    beforeEach('Deploy contract', async () => {
        erc20 = await ERC20Token.new({ from: owner });
        ierc20 = await IERC20.at(erc20.address);
    });

    describe('Ownable', async () => {
        it('should have deployer as initial owner', async () => { 
            assert(owner, await erc20.owner());
        });

        it('should allow changing owner', async () => {
            await erc20.transferOwnership(charlie, {from: owner});
            assert(charlie, await erc20.owner());
        });

        it('should NOT allow changing owner if not authorized', async () => {
            await expectThrow(erc20.transferOwnership(charlie,{ from: mallory}));
        });

    });

    describe('Pausable ', async () => {
        it('should pause', async () => { 
            await pause(owner);
        });

        it('should pause then unpause', async () => { 
            await pause(owner);
            await unpause(owner);
        });

        it('should NOT unpause if not paused', async () => { 
            await expectThrow(unpause(owner));
        });

        it('should NOT pause if already paused', async () => { 
            await pause(owner);
            await expectThrow(pause(owner));
        });

        it('should NOT pause if not owner', async () => { 
            await expectThrow(pause(mallory));
        });

        it('should NOT unpause if not owner', async () => { 
            await pause(owner);
            await expectThrow(unpause(mallory));
        });


    });

    describe('ERC20 ', async () => {
        it('should have 100,000,000 OMNIA tokens as total supply', async () => { 
            assert.equal(INITIAL_TOTAL_SUPPLY, (await ierc20.totalSupply()).toString());
        });

        it('should have correct name', async () => { 
            assert.equal(SC_NAME, await ierc20.name());
        });

        it('should have correct symbol', async () => { 
            assert.equal(SC_SYMBOL, await ierc20.symbol());
        });

        it(`should have ${SC_DECIMALS} decimals`, async () => { 
            assert.equal(SC_DECIMALS, await ierc20.decimals());
        });

        it(`should initially put all tokens on deployer wallet`, async () => { 
            const totalSupply = await ierc20.totalSupply();
            assert.equal(totalSupply.toString(), (await ierc20.balanceOf(owner)).toString());
        });

        it(`should allow transfer if balance is enough`, async () => { 
            await ierc20.transfer(alice, ONE_HUNDRED_OMNIA, {from: owner});
            assert.equal(ONE_HUNDRED_OMNIA, (await ierc20.balanceOf(alice)).toString());
        });

        it(`should NOT allow transfer if balance lower than requested`, async () => { 
            await ierc20.transfer(alice, ONE_HUNDRED_OMNIA, {from: owner});
            await expectThrow(ierc20.transfer(bob, ONE_MIL_OMNIA, {from: alice}));
        });

        it(`should approve allowance`, async () => { 
            await ierc20.approve(alice, ONE_HUNDRED_OMNIA, {from: owner});
            assert.equal(ONE_HUNDRED_OMNIA, (await ierc20.allowance(owner, alice)).toString());
        });

        it(`should approve allowance and use it`, async () => { 
            await ierc20.approve(alice, ONE_HUNDRED_OMNIA, {from: owner});
            await ierc20.transferFrom(owner, bob, ONE_HUNDRED_OMNIA, {from: alice});
            assert.equal(ONE_HUNDRED_OMNIA, (await ierc20.balanceOf(bob)).toString());
        });

    });
    
    describe('OMNIA Token ', async () => {

        it(`should burn tokens`, async () => { 
            await erc20.burn(INITIAL_TOTAL_SUPPLY, {from: owner});
            assert.equal(0, await ierc20.totalSupply());
        });

        it(`should NOT allow burn more than balance`, async () => { 
            await ierc20.transfer(alice, ONE_HUNDRED_OMNIA, {from: owner});
            await expectThrow(erc20.burn(ONE_MIL_OMNIA, {from: alice}))
        });

        it(`should NOT allow transfer if paused`, async () => { 
            await ierc20.transfer(alice, ONE_HUNDRED_OMNIA, {from: owner});
            await pause(owner);
            await expectThrow(ierc20.transfer(bob, ONE_HUNDRED_OMNIA, {from: alice}));
        });

        it(`should allow transfer if paused but owner`, async () => { 
            const balance = await ierc20.balanceOf(owner);
            await pause(owner);
            await ierc20.transfer(alice, balance, {from: owner});
            assert.equal(0, (await ierc20.balanceOf(owner)).toString());
            assert.equal(balance, (await ierc20.balanceOf(alice)).toString());
        });

        it(`should NOT burn transfer if paused`, async () => { 
            await ierc20.transfer(alice, ONE_HUNDRED_OMNIA, {from: owner});
            await pause(owner);
            await expectThrow(erc20.burn(ONE_HUNDRED_OMNIA, {from: alice}));
        });

        it(`should allow burn if paused but owner`, async () => { 
            const balance = await ierc20.balanceOf(owner);
            await pause(owner);
            await erc20.burn(balance, {from: owner});
            assert.equal(0, (await ierc20.balanceOf(owner)).toString());
            
        });

    });

    describe('Gas Metrics', async () => {
        it(`should measure gas costs`, async () => { 
            await measureGasCost('transfer', ierc20.transfer(alice, ONE_HUNDRED_OMNIA, {from: owner}));
            await measureGasCost('approve', ierc20.approve(bob, ONE_HUNDRED_OMNIA, {from: owner}));
            await measureGasCost('transferFrom', ierc20.transferFrom(owner, charlie, ONE_HUNDRED_OMNIA, {from: bob}));
            await measureGasCost('burn', erc20.burn(ONE_HUNDRED_OMNIA, {from: owner}));
            await measureGasCost('pause', erc20.pause({from: owner}));
            await measureGasCost('unpause', erc20.unpause({from: owner}));
            await measureGasCost('transferOwnership', erc20.transferOwnership(alice, {from: owner}));
        });
    });

    async function measureGasCost(functionName, promise) {
        const result = await promise;
        console.log(`${functionName}() gas used: `,result.receipt.gasUsed);
    }

    async function pause(sender) {
        await erc20.pause({from: sender});
        assert.equal(true, await erc20.paused());
    }

    async function unpause(sender) {
        await erc20.unpause({from: sender});
        assert.equal(false, await erc20.paused());
    }
});