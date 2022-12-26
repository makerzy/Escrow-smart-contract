import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { ethers } from "hardhat"


function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  const WethAddr = "0x1a237400185127d8b19d6ba7cad5d952a661dd56"
  const FactoryAddr = "0x53D213eE429ef1a3A75Fc09FBbfc5e4a01A66F17"
  const routerAddr = "0x76a5A28709E3429AeAD716f7d8dA3Df24d12eb25"
  const escrowAddr = "0x704043bBd668Bcced7D96975ed5012C9Bac89945"
  let wallet: SignerWithAddress;
  let Router: Contract, SafeMoon: Contract, Escrow: Contract, Erc20: Contract,
    Factory: Contract, Weth: Contract
  let accounts = await ethers.getSigners();

  wallet = accounts[0];
  console.log({ balance: (await wallet.getBalance()).toString() })
  const _Factory = await ethers.getContractFactory("UniswapV2Factory", wallet)
  const _Weth = await ethers.getContractFactory("WETH9", wallet)
  const _Router = await ethers.getContractFactory("UniswapV2Router02", wallet)
  const _Erc20 = await ethers.getContractFactory("BEP20Ethereum", wallet)
  const _Escrow = await ethers.getContractFactory("VetMeEscrow", wallet)
  const _SafeMoon = await ethers.getContractFactory("SafeMoon", wallet)

  Factory = await _Factory.deploy(wallet.address)
  Weth = await _Weth.deploy()
  await sleep(3000)
  await Promise.all([
    Weth.deployed(), sleep(3000),
  ])
  await Promise.all([
    Factory.deployed(), sleep(3000),
  ])
  console.log("Deploying", await Factory.INIT_CODE_PAIR_HASH(), Factory.address, Weth.address)
  Router = await _Router.deploy(Factory.address, Weth.address)
  await Promise.all([
    sleep(3000), Router.deployed()
  ])
  console.log("Deploying 2")
  await sleep(3000)

  Erc20 = await _Erc20.deploy()
  console.log("Deploying 3")
  await sleep(3000)
  SafeMoon = await _SafeMoon.deploy(Router.address)
  await sleep(3000)
  console.log("Deploying 4")
  Escrow = await _Escrow.deploy(Weth.address, Router.address)
  console.log("Here")
  await Promise.all([
    Factory.deployed(), sleep(3000), Weth.deployed(), sleep(3000), Router.deployed(), sleep(3000),
    Erc20.deployed(), sleep(3000), SafeMoon.deployed(), sleep(3000), Escrow.deployed()
  ])

  console.log({
    Factory: Factory.address,
    Weth: Weth.address,
    Router: Router.address,
    Erc20: Erc20.address,
    SafeMoon: SafeMoon.address,
    Escrow: Escrow.address
  })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
