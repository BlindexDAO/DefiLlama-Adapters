const sdk = require("@defillama/sdk");
// const { calculateUsdUniTvl } = require("../helper/getUsdUniTvl");

//-------------------------------------------------------------------------------------------------------------
// How to add a new chain?
// 1. Add it to the chains global array
// 2. create a function to calculate the TVL of the chain (similar to what we did with the 'rskTvl' function)
// 3. Add your new chain to the export module
// 4. Add your new chain to the 'sumChainTvls' function in the export module
//-------------------------------------------------------------------------------------------------------------

// Test RSK:
// Go to @defilama/sdk/build/computetvl/blocks.js and add 'rsk' to the chainsForBlocks array

const chains = {
  rsk: {
    uniswapFactoryAddress: "0x6d0aE8f3da7A451A82B48594E91Bf9d79491971d", // TODO: Add missing information
    bdxTokenAddress: "0xB3dd46A470b2C3df15931238c61C49CDf429DD9a",
    wrappedNativeTokenAddress: "0x542fda317318ebf1d3deaf76e0b632741a7e677d",
    wrappedNativeTokenName: "wrbtc",
    coingeckoNativeTokenId: "rootstock",
    bdstables: [
      {
        name: "BDEU",
        address: "0x09b070184E6b57475d5993D9Dd8157f0273EE230",
      },
    ],
  },
};

async function getBdxBalanaceOfBDStable(
  block,
  chainName,
  bdstableContract,
  bdxTokenAddress
) {
  let bdxBalance = (
    await sdk.api.erc20.balanceOf({
      target: bdxTokenAddress,
      owner: bdstableContract,
      chain: chainName,
      block,
    })
  ).output;

  const bdxDecimals = (await sdk.api.erc20.decimals(bdxTokenAddress, chainName))
    .output;
  return bdxBalance / 10 ** bdxDecimals;
}

const rsk = async function rskTvl(timestamp, ethBlock, chainblocks) {
  console.log("Network: RSK");
  console.log("Timestamp:", timestamp);
  console.log("Block:", chainblocks["rsk"]);
  return tvl("rsk", timestamp, chainblocks["rsk"]);
};

async function tvl(chainName, timestamp, block) {
  const bdxTokenAddress = chains[chainName].bdxTokenAddress;
  const wrappedNativeTokenAddress = chains[chainName].wrappedNativeTokenAddress;
  const wrappedNativeTokenName = chains[chainName].wrappedNativeTokenName;
  const uniswapFactoryAddress = chains[chainName].uniswapFactoryAddress;
  const bdstables = chains[chainName].bdstables;

  //=======
  // AMM
  //=======
  // TODO: What's the core token all about here? Is it actually WRBTC?
  // TODO: What's the whitelist token all about? What is it being used for in the function? (in our case it's BDX)
  let ammTvlInWRBTC = 0;
  // ammTvlInWRBTC = calculateUsdUniTvl(
  //   uniswapFactoryAddress,
  //   chainName,
  //   wrappedNativeTokenAddress,
  //   [bdxTokenAddress],
  //   wrappedNativeTokenName
  // )[[wrappedNativeTokenName]];

  // console.log(ammTvlInWRBTC);
  // TODO: Delete this comment: calculateUsdUniTvl returns: { [coreAssetName]: (coreBalance) / (10 ** decimals) }

  //============
  // Collateral
  //============
  // TODO: Need to query all the pools of each BDStable using its property: bdstable_pools_array. Then need to calc all the collateral
  const collateralInWRBTC = 0;

  //================
  // BDX Collateral
  //================
  let bdxColleteralAmount = 0;
  for (let index = 0; index < bdstables.length; index++) {
    bdxColleteralAmount += await getBdxBalanaceOfBDStable(
      block,
      chainName,
      bdstables[index].address,
      bdxTokenAddress
    );
  }

  console.log("=====================================");
  console.log(bdxColleteralAmount);
  console.log("=====================================");
  const bdxCollateralInWRBTC = bdxColleteralAmount * 1; // TODO: Convert from BDX amount to native token amount

  const balances = {
    [chains[chainName].coingeckoNativeTokenId]:
      ammTvlInWRBTC + collateralInWRBTC + bdxCollateralInWRBTC,
  };

  console.log(balances);
  return balances;
}

module.exports = {
  misrepresentedTokens: true,
  methodology:
    "(1) AMM LP pairs - All the liquidity pools from the Factory address are used to find the LP pairs. This part of the TVL is equal to the liquidity on the AMM. (2) Collateral - All the collateral being used to support the stable coins - Bitcoin, Ethereum & BDX",
  rsk: {
    tvl: rsk,
  },
  tvl: sdk.util.sumChainTvls([rsk]),
};

// TODO: Delete this VVS finance code
// const factoryAddress = '0x3b44b2a187a7b3824131f8db5a74194d0a42fc15';
// const wcroAddress = '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23';
// const vvsTokenAddress = '0x2D03bECE6747ADC00E1a131BBA1469C15fD11e03';

// module.exports = {
//     misrepresentedTokens: true,
//     methodology: `(1) AMM LP pairs - All the pools from the  Factory address (${factoryAddress}) are used to find the LP pairs. TVL is equal to the liquidity on the AMM. (2) All the collateral being used to support the stale coins. (3) All the BDX collateral being used to support the stable coins.`,
//     rsk: {
//         tvl: calculateUsdUniTvl(factoryAddress, "cronos", wcroAddress, [vvsTokenAddress], "crypto-com-chain")
//     }
// }
