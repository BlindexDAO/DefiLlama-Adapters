const sdk = require("@defillama/sdk");
const { calculateUsdUniTvl } = require("../helper/getUsdUniTvl");

//-------------------------------------------------------------------------------------------------------------
// How to add a new chain?
// 1. Add it to the chains global array
// 2. create a function to calculate the TVL of the chain (similar to what we did with the 'rskTvl' function)
// 3. Add your new chain to the export module
// 4. Add your new chain to the 'sumChainTvls' function in the export module
//-------------------------------------------------------------------------------------------------------------

const chains = [
  {
    name: "rsk",
    uniswapFactoryAddress: "", // TODO: Add missing information
    bdxTokenAddress: "", // TODO: Add missing information
    wrappedNativeTokenAddress: "0x542fda317318ebf1d3deaf76e0b632741a7e677d",
    wrappedNativeTokenName: "wrbtc",
    coingeckoNativeTokenId: "rbtc",
    bdstables: [
      {
        name: "BDEU",
        address: "", // TODO: Add missing information
      },
    ],
  },
];

async function getBdxBalanaceOfBDStable(
  block,
  chain,
  bdstableContract,
  bdxTokenAddress
) {
  return (
    await sdk.api.erc20.balanceOf({
      target: bdxTokenAddress,
      owner: bdstableContract,
      chain,
      block,
    })
  ).output;
}

async function rskTvl(timestamp, block) {
  return tvl("rsk", timestamp, block);
}

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
  const ammTvlInWRBTC = calculateUsdUniTvl(
    uniswapFactoryAddress,
    chainName,
    wrappedNativeTokenAddress,
    [bdxTokenAddress],
    wrappedNativeTokenName
  )[[wrappedNativeTokenName]];
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
    bdxColleteralAmount += getBdxBalanaceOfBDStable(
      block,
      chainName,
      bdstables[index].address,
      bdxTokenAddress
    );
  }

  const bdxCollateralInWRBTC = bdxColleteralAmount * 0; // TODO: Convert from BDX amount to native token amount

  return {
    [chains[chainName].coingeckoNativeTokenId]:
      ammTvlInWRBTC + collateralInWRBTC + bdxCollateralInWRBTC,
  };
}

module.exports = {
  misrepresentedTokens: true,
  methodology:
    "(1) AMM LP pairs - All the liquidity pools from the Factory address are used to find the LP pairs. This part of the TVL is equal to the liquidity on the AMM. (2) Collateral - All the collateral being used to support the stable coins - Bitcoin, Ethereum & BDX",
  rsk: {
    tvl: rskTvl,
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
