import { ethers } from "hardhat"


async function main() {
  /*  const Lock = await ethers.getContractFactory("Lock");
  const lock = await Lock.deploy(unlockTime, { value: lockedAmount });
  await lock.deployed(); */
  const VetMe = await ethers.getContractFactory("VetMeEscrow")
  const vetMe = await VetMe.deploy()
  await vetMe.deployed()

  console.log({ vetMeAddress: vetMe.address })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
