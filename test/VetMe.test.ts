import chai, { expect } from "chai";
import { ethers } from "hardhat"
import BigNumber from "bignumber.js"
import { Contract, constants } from "ethers"
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { keccak256 } from 'ethers/lib/utils';

let Escrow: Contract, Erc20: Contract, Token2: Contract,
  Weth: Contract

const getTime = (time: number) => Math.floor(new Date().getTime() / 1000.0) + time;

let accounts: SignerWithAddress[],
  wallet: SignerWithAddress,
  other0: SignerWithAddress,
  other1: SignerWithAddress,
  other2: SignerWithAddress;
let amount = BigNumber(5_000_000).times(1e18)
beforeEach("Transaction", async () => {

  accounts = await ethers.getSigners();
  [wallet, other0, other1, other2] = accounts;
  const _Weth = await ethers.getContractFactory("WETH9", wallet)
  const _Erc20 = await ethers.getContractFactory("BEP20Ethereum", wallet)
  const _Escrow = await ethers.getContractFactory("VetMeEscrow", wallet)
  Weth = await _Weth.deploy()
  Erc20 = await _Erc20.deploy()
  Token2 = await _Erc20.deploy()
  Escrow = await _Escrow.deploy()

  await Promise.all([
    Weth.deployed(), Escrow.deployed(),
    Erc20.deployed(), Token2.deployed()
  ])

  await Erc20.approve(Escrow.address, amount.toString(10))
  await Weth.approve(Escrow.address, amount.toString(10))

  console.log("BeforeEach done")
})




async function makeEscrowParams(
  wallet: SignerWithAddress,
  rWallet: SignerWithAddress,
  tokenIn: string,
  tokenOut: string,
  amountOut: string,
  amountIn: string,
  nonce: number
) {
  const domain = {
    name: "VetMe Escrow",
    version: "1.0.1",
    chainId: 31337,
    verifyingContract: Escrow.address,
  }

  const types = {
    Order: [
      { name: "signatory", type: "address" },
      { name: "receivingWallet", type: "address" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountOut", type: "uint256" },
      { name: "amountIn", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  }
  const value = {
    signatory: wallet.address,
    receivingWallet: rWallet.address,
    tokenIn,
    tokenOut,
    amountOut,
    amountIn,
    deadline: getTime(200),
    nonce
  }
  const signature = await wallet._signTypedData(domain, types, value)
  return { order: { ...value }, signature }
}

describe("Escrow", function () {
  it("Set fees", async () => {
    await expect(Escrow.connect(other0).setFees(100)).to.revertedWith("Ownable: caller is not the owner")
    await expect(Escrow.setFees(2600)).to.revertedWith("Fee value exceed max fees allowed")
    await expect(Escrow.setFees(150)).to.emit(Escrow, "FeeChanged").withArgs(wallet.address, 150)
    expect(await Escrow.feeValue()).to.equal(150)
  })

  it("Should support listed fraction sales ETH pair", async () => {
    const buy = await makeEscrowParams(
      wallet,
      wallet, 
      Erc20.address,
      Weth.address,
      BigNumber(1).times(1e18).toString(10),
      BigNumber(500).times(1e18).toString(10),
      1
    )
    const sell = await makeEscrowParams(
      other0,
      other0, 
      Weth.address,
      Erc20.address,
      BigNumber(250).times(1e18).toString(10),
      BigNumber(0.5).times(1e18).toString(10),
      1
    )
    const sell2 = await makeEscrowParams(
      other0,
      other0, 
      Weth.address,
      Erc20.address,
      BigNumber(250).times(1e18).toString(10),
      BigNumber(0.5).times(1e18).toString(10),
      2
    )
    await Erc20.transfer(other0.address, amount.toString(10))
    await Erc20.connect(other0).approve(Escrow.address, BigNumber(10).multipliedBy(amount).toString(10))
    await Weth.deposit({ value: BigNumber(2).times(1e18).toString(10) })
    await expect(Escrow.matchSupportFraction(sell.order, sell.signature, buy.order, buy.signature))
      .to.emit(Escrow, "Matched").withArgs(
          keccak256(sell.signature), 
          BigNumber(250).times(1e18).toString(10), 
          keccak256(buy.signature), 
          BigNumber(0.5).times(1e18).toString(10)
        )
      await expect(Escrow.matchSupportFraction(sell2.order, sell2.signature, buy.order, buy.signature))
      .to.emit(Escrow, "Matched").withArgs(
          keccak256(sell2.signature), 
          BigNumber(250).times(1e18).toString(10), 
          keccak256(buy.signature), 
          BigNumber(0.5).times(1e18).toString(10)
        )
      await expect(Escrow.matchSupportFraction(sell2.order, sell2.signature, buy.order, buy.signature))
        .to.revertedWith("used nonce(s)")

        await expect(Escrow.withdrawFunds(constants.AddressZero)).to.emit(Escrow, "Withdraw")
     expect(await Escrow.getBalance(constants.AddressZero) ).to.equal(0)
  })
  it("Should support listed fraction sales", async function () {
     const buy = await makeEscrowParams(
       wallet,
       wallet,
       Erc20.address,
       Token2.address,
       BigNumber(1).times(1e18).toString(10),
       BigNumber(500).times(1e18).toString(10),
       1
     )
     const sell = await makeEscrowParams(
       other0,
       other0,
       Token2.address,
       Erc20.address,
       BigNumber(250).times(1e18).toString(10),
       BigNumber(0.5).times(1e18).toString(10),
       1
     )
     const sell2 = await makeEscrowParams(
       other0,
       other0,
       Token2.address,
       Erc20.address,
       BigNumber(250).times(1e18).toString(10),
       BigNumber(0.5).times(1e18).toString(10),
       2
     )

     await Erc20.transfer(other0.address, amount.toString(10))
     await Erc20.connect(other0).approve(Escrow.address, BigNumber(10).multipliedBy(amount).toString(10))
     await Token2.approve(Escrow.address, BigNumber(10).multipliedBy(amount).toString(10))
     
     await expect(Escrow.matchSupportFraction(sell.order, sell.signature, buy.order, buy.signature))
       .to.emit(Escrow, "Matched").withArgs(
          keccak256(sell.signature), 
          BigNumber(250).times(1e18).toString(10), 
          keccak256(buy.signature), 
          BigNumber(0.5).times(1e18).toString(10)
        )
     await expect(Escrow.matchSupportFraction(sell2.order, sell2.signature, buy.order, buy.signature))
       .to.emit(Escrow, "Matched").withArgs(
         keccak256(sell2.signature),
         BigNumber(250).times(1e18).toString(10),
         keccak256(buy.signature),
         BigNumber(0.5).times(1e18).toString(10)
       )
     await expect(Escrow.matchSupportFraction(sell2.order, sell2.signature, buy.order, buy.signature))
       .to.revertedWith("used nonce(s)")

     const tokenBalance = await Erc20.balanceOf(Escrow.address)
     await expect(Escrow.withdrawFunds(Erc20.address)).to.emit(Escrow, "Withdraw").withArgs(wallet.address, Erc20.address, tokenBalance)
    expect(await Escrow.getBalance(Erc20.address)).to.equal(0)
   });

  /* it("Should support unlisted tokens for Eth fraction sales", async function (done) {
    const buy = await makeEscrowParams(
      wallet,
      wallet,
      Erc20.address,
      Weth.address,
      BigNumber(1).times(1e18).toString(10),
      BigNumber(500).times(1e18).toString(10),
      1
    )
    const sell = await makeEscrowParams(
      other0,
      other0,
      Weth.address,
      Erc20.address,
      BigNumber(250).times(1e18).toString(10),
      BigNumber(0.5).times(1e18).toString(10),
      1
    )
    const sell2 = await makeEscrowParams(
      other0,
      other0,
      Weth.address,
      Erc20.address,
      BigNumber(250).times(1e18).toString(10),
      BigNumber(0.5).times(1e18).toString(10),
      2
    )
    await Erc20.transfer(other0.address, amount.toString(10))
    await Erc20.connect(other0).approve(Escrow.address, BigNumber(10).multipliedBy(amount).toString(10))
    await Weth.deposit({ value: BigNumber(2).times(1e18).toString(10) })
    await expect(Escrow.matchUnlisted(sell.order, sell.signature, buy.order, buy.signature))
      .to.emit(Escrow, "Matched").withArgs(
        keccak256(sell.signature),
        BigNumber(250).times(1e18).toString(10),
        keccak256(buy.signature),
        BigNumber(0.5).times(1e18).toString(10)
      )
    await expect(Escrow.matchUnlisted(sell2.order, sell2.signature, buy.order, buy.signature))
      .to.emit(Escrow, "Matched").withArgs(
        keccak256(sell2.signature),
        BigNumber(250).times(1e18).toString(10),
        keccak256(buy.signature),
        BigNumber(0.5).times(1e18).toString(10)
      )
    await expect(Escrow.matchUnlisted(sell2.order, sell2.signature, buy.order, buy.signature))
      .to.revertedWith("used nonce(s)")
    done()
  }); */
 /*  it("Should support nonlisted tokens for tokens fraction sales", async function (done) {
    const buy = await makeEscrowParams(
      wallet,
      wallet,
      Erc20.address,
      Token2.address,
      BigNumber(1).times(1e18).toString(10),
      BigNumber(500).times(1e18).toString(10),
      1
    )
    const sell = await makeEscrowParams(
      other0,
      other0,
      Token2.address,
      Erc20.address,
      BigNumber(250).times(1e18).toString(10),
      BigNumber(0.5).times(1e18).toString(10),
      1
    )
    const sell2 = await makeEscrowParams(
      other0,
      other0,
      Token2.address,
      Erc20.address,
      BigNumber(250).times(1e18).toString(10),
      BigNumber(0.5).times(1e18).toString(10),
      2
    )
    await Erc20.transfer(other0.address, amount.toString(10))
    await Erc20.connect(other0).approve(Escrow.address, BigNumber(10).multipliedBy(amount).toString(10))
    await Token2.approve(Escrow.address, BigNumber(10).multipliedBy(amount).toString(10))

    await expect(Escrow.matchUnlisted(sell.order, sell.signature, buy.order, buy.signature))
      .to.emit(Escrow, "Matched").withArgs(
        keccak256(sell.signature),
        BigNumber(250).times(1e18).toString(10),
        keccak256(buy.signature),
        BigNumber(0.5).times(1e18).toString(10)
      )
    await expect(Escrow.matchUnlisted(sell2.order, sell2.signature, buy.order, buy.signature))
      .to.emit(Escrow, "Matched").withArgs(
        keccak256(sell2.signature),
        BigNumber(250).times(1e18).toString(10),
        keccak256(buy.signature),
        BigNumber(0.5).times(1e18).toString(10)
      )
    await expect(Escrow.matchUnlisted(sell2.order, sell2.signature, buy.order, buy.signature))
      .to.revertedWith("used nonce(s)")
    done()
  }); */ 

});
