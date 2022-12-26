import { beforeEach } from 'mocha';
import chai, { expect } from "chai";
import { ethers } from "hardhat";
import BigNumber from "bignumber.js"
import { Contract } from "ethers"
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { solidity } from 'ethereum-waffle';
import { keccak256 } from 'ethers/lib/utils';
let Router: Contract, SafeMoon: Contract, Escrow: Contract, Erc20: Contract,
  Factory: Contract, Weth: Contract

chai.use(solidity);
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
  const _Factory = await ethers.getContractFactory("UniswapV2Factory", wallet)
  const _Weth = await ethers.getContractFactory("WETH9", wallet)
  const _Router = await ethers.getContractFactory("UniswapV2Router02", wallet)
  const _Erc20 = await ethers.getContractFactory("BEP20Ethereum", wallet)
  const _Escrow = await ethers.getContractFactory("VetMeEscrow", wallet)
  const _SafeMoon = await ethers.getContractFactory("SafeMoon", wallet)
  Factory = await _Factory.deploy(wallet.address)
  Weth = await _Weth.deploy()
  Router = await _Router.deploy(Factory.address, Weth.address)
  Erc20 = await _Erc20.deploy()
  SafeMoon = await _SafeMoon.deploy(Router.address)
  Escrow = await _Escrow.deploy(Weth.address, Router.address)
  await Promise.all([
    Factory.deployed(), Weth.deployed(), Router.deployed(),
    Erc20.deployed(), SafeMoon.deployed(), Escrow.deployed()
  ])

  await Erc20.approve(Router.address, amount.toString(10))
  await SafeMoon.approve(Router.address, amount.toString(10))
  await Erc20.approve(Escrow.address, amount.toString(10))
  await SafeMoon.approve(Escrow.address, amount.toString(10))
  await Weth.approve(Escrow.address, amount.toString(10))
  /* addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline 
    ) */
  await Router.addLiquidityETH(
    Erc20.address,
    amount.times(0.8).toString(10),
    amount.times(0.8).toString(10),
    BigNumber(1).times(1e18).toString(10),
    wallet.address,
    getTime(10),
    { value: BigNumber(1).times(1e18).toString(10), from: wallet.address })
  await Router.addLiquidityETH(
    SafeMoon.address,
    amount.times(0.8).toString(10),
    amount.times(0.6).toString(10),
    BigNumber(1).times(1e18).toString(10),
    wallet.address,
    getTime(10),
    { value: BigNumber(1).times(1e18).toString(10), from: wallet.address })
})




async function makeEscrowParams(
  wallet: SignerWithAddress,
  rWallet: SignerWithAddress,
  tokenIn: string,
  tokenOut: string,
  amountOut: string,
  amountIn: string,
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
    nonce: 1
  }
  const signature = await wallet._signTypedData(domain, types, value)
  return { order: { ...value, orderId: keccak256(signature) }, signature }
}

describe("Escrow", function () {
  it("Should transfer with default ERC20", async function () {
    const buy = await makeEscrowParams(
      wallet,
      wallet,
      Erc20.address,
      Weth.address,
      BigNumber(1).times(1e18).toString(10),
      BigNumber(500).times(1e18).toString(10),
    )
    await Erc20.transfer(other0.address, amount.toString(10))
    await Erc20.connect(other0).approve(Escrow.address, amount.toString(10))
    await Weth.deposit({ value: BigNumber(2).times(1e18).toString(10) })
    const sell = await makeEscrowParams(
      other0,
      other0,
      Weth.address,
      Erc20.address,
      BigNumber(500).times(1e18).toString(10),
      BigNumber(1).times(1e18).toString(10),
    )
    const sellerTokenInBal = (await Weth.balanceOf(other0.address)).toString()
    const buyerTokenInBal = (await Erc20.balanceOf(wallet.address)).toString()
    await expect(Escrow.matchOrder(sell.order, sell.signature, buy.order, buy.signature)).to.emit(Escrow, "Matched").withArgs(sell.order.orderId, buy.order.orderId)
    console.log({ balance: (await Escrow.getBalance()).toString() })
    const sellerTokenInBalAfter = (await Weth.balanceOf(other0.address)).toString()
    const buyerTokenInBalAfter = (await Erc20.balanceOf(wallet.address)).toString()
    console.log({ sellerTokenInBal, buyerTokenInBal, sellerTokenInBalAfter, buyerTokenInBalAfter })
    await expect(Escrow.withdrawFunds()).to.emit(Escrow, "Withdraw")
  });
  it("Should transfer with safemoon tokens", async function () {
    const buy = await makeEscrowParams(
      wallet,
      wallet,
      SafeMoon.address,
      Weth.address,
      BigNumber(1).times(1e18).toString(10),
      BigNumber(500).times(1e18).toString(10),
    )
    await SafeMoon.transfer(other0.address, amount.toString(10))
    await SafeMoon.connect(other0).approve(Escrow.address, amount.toString(10))
    await Weth.deposit({ value: BigNumber(2).times(1e18).toString(10) })
    const sell = await makeEscrowParams(
      other0,
      other0,
      Weth.address,
      SafeMoon.address,
      BigNumber(500).times(1e18).toString(10),
      BigNumber(1).times(1e18).toString(10),
    )
    const sellerTokenInBal = (await Weth.balanceOf(other0.address)).toString()
    const buyerTokenInBal = (await SafeMoon.balanceOf(wallet.address)).toString()
    await expect(Escrow.matchOrder(sell.order, sell.signature, buy.order, buy.signature)).to.emit(Escrow, "Matched").withArgs(sell.order.orderId, buy.order.orderId)
    console.log({ balance: (await Escrow.getBalance()).toString() })
    const sellerTokenInBalAfter = (await Weth.balanceOf(other0.address)).toString()
    const buyerTokenInBalAfter = (await SafeMoon.balanceOf(wallet.address)).toString()
    console.log({ sellerTokenInBal, buyerTokenInBal, sellerTokenInBalAfter, buyerTokenInBalAfter })
    await expect(Escrow.withdrawFunds()).to.emit(Escrow, "Withdraw")
  });

});
