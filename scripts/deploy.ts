import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract, utils } from "ethers";
import { ethers } from "hardhat"
import BigNumber from "bignumber.js"
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
const getTime = (time: number) => Math.floor(new Date().getTime() / 1000.0) + time;

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  // 0000000000000000000000001a237400185127d8b19d6ba7cad5d952a661dd5600000000000000000000000076a5a28709e3429aead716f7d8da3df24d12eb25

  const WethAddr = "0x1a237400185127d8b19d6ba7cad5d952a661dd56"
  const FactoryAddr = "0x53D213eE429ef1a3A75Fc09FBbfc5e4a01A66F17"
  const routerAddr = "0x76a5A28709E3429AeAD716f7d8dA3Df24d12eb25"
  const escrowAddr = "0x704043bBd668Bcced7D96975ed5012C9Bac89945"
  const ErcTokens = [
    "0x63bEf5e5bd830F61aD5C19fD8Db80462D44ea323",
    "0x1004e8AE4387B587eCb06dcf4398c2A395c4b2F2",
    "0x9a2992BA2d4dF6ea92Bae65951a68da48fbb70fB"
  ]
  let wallet: SignerWithAddress;
  let SafeMoon: Contract, Escrow: Contract, Erc20: Contract,
    Factory: Contract
  let accounts = await ethers.getSigners();

  wallet = accounts[0];
  const Weth = await ethers.getContractAt("WETH9", WethAddr)
  const Router = await ethers.getContractAt("UniswapV2Router02", routerAddr)
  const amount = BigNumber(0.1).times(1e18).toString(10)
  for (let i = 0; i < ErcTokens.length; i++) {
    Erc20 = await ethers.getContractAt("BEP20Ethereum", utils.getAddress(ErcTokens[i]))
    await sleep(3000)

    await Router.addLiquidityETH(
      Erc20.address,
      BigNumber(90_000).times(1e18).toString(10),
      BigNumber(90_000).times(1e18).toString(10),
      amount,
      wallet.address,
      getTime(100_000),
      { value: amount, from: wallet.address })
    const tokenBal = await Erc20.balanceOf(wallet.address)
    await sleep(3000)
    const balance = await wallet.getBalance()
    console.log({ allowance: tokenBal.toString(), balance: balance.toString() })
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
