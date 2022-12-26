import "@nomiclabs/hardhat-waffle";
import dotenv from "dotenv";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import { task } from "hardhat/config";
require("solidity-coverage");
dotenv.config();

const { ETHERSCAN_API_KEY, MAIN_WALLET, GOERLI_TEST_RPC_URL, AVALANCHE_FUJI_C_RPC_URL } = process.env;
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {
  solidity: {
    compilers: [
      {
        version: "0.8.12",
        hardfork: "istanbul",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.5.16",
      },
      {
        version: "0.6.6",
      },
      {
        version: "0.6.12",
      },
      {
        version: "0.4.18",
      },
    ],
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 21,
    gasPriceApi: `https://api.etherscan.io/api?module=proxy&action=eth_gasPrice&apikey=${ETHERSCAN_API_KEY}`,
  },
  networks: {
    hardhat: {
      localhost: {
        url: "http://localhost:8545",
      },
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      allowUnlimitedContractSize: true,
      blockGasLimit: 0xafffff,
    },
    testnet: {
      url: AVALANCHE_FUJI_C_RPC_URL,
      chainId: 43113,
      // gasPrice: 20000000000,
      accounts: [MAIN_WALLET],
    },
    goerli: {
      url: GOERLI_TEST_RPC_URL,
      chainId: 5,
      // gasPrice: 20000000000,
      accounts: [MAIN_WALLET],
    },
  },

  // contractSizer: {
  //   alphaSort: true,
  //   disambiguatePaths: false,
  //   runOnCompile: true,
  //   strict: true,
  //   only: [],
  // },
};
