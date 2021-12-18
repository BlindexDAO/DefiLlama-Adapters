const sdk = require("@defillama/sdk");
const { default: BigNumber } = require("bignumber.js");
const abi = require("../helper/abis/blindex.json");
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
    // uniswapFactoryAddress: "0x6d0aE8f3da7A451A82B48594E91Bf9d79491971d", // TODO: Add missing information
    // bdxTokenAddress: "0xB3dd46A470b2C3df15931238c61C49CDf429DD9a",
    bdxCoingeckoId: "bdx",
    // wrappedNativeTokenAddress: "0x542fda317318ebf1d3deaf76e0b632741a7e677d",
    // wrappedNativeTokenName: "wrbtc",

    bdstables: [
      {
        name: "BDEU",
        address: "0x09b070184E6b57475d5993D9Dd8157f0273EE230",
        collateral: {
          btc: {
            wrappedTokenAddress: "0x542fda317318ebf1d3deaf76e0b632741a7e677d",
            coingeckoTokenId: "rootstock",
          },
          eth: {
            wrappedTokenAddress: "0x1d931bf8656d795e50ef6d639562c5bd8ac2b78f",
            coingeckoTokenId: "ethereum",
          },
        },
      },
    ],
  },
};

async function getBDStableCollateralBalances(block, chainName, bdstable) {
  const btcCoinGekoTokenId = bdstable.collateral.btc.coingeckoTokenId;
  const ethCoinGekoTokenId = bdstable.collateral.eth.coingeckoTokenId;
  const balances = {
    [btcCoinGekoTokenId]: 0,
    [ethCoinGekoTokenId]: 0,
  };

  const collateralPoolsLength = (
    await sdk.api.abi.call({
      target: bdstable.address,
      abi: abi["getBdStablesPoolsLength"],
      chain: chainName,
      block,
    })
  ).output;

  const bdstableCollateralPools = [];
  for (let index = 0; index < collateralPoolsLength; index++) {
    const poolAddress = (
      await sdk.api.abi.call({
        target: bdstable.address,
        abi: abi["bdstable_pools_array"],
        params: index,
        chain: chainName,
        block,
      })
    ).output;

    bdstableCollateralPools.push(poolAddress);
  }

  for (let index = 0; index < bdstableCollateralPools.length; index++) {
    const btcCollateralAddress = bdstable.collateral.btc.wrappedTokenAddress;
    const ethCollateralAddress = bdstable.collateral.eth.wrappedTokenAddress;
    balances[btcCoinGekoTokenId] += await getBalanceOfWithPercision(
      block,
      chainName,
      bdstableCollateralPools[index],
      btcCollateralAddress
    );
    balances[ethCoinGekoTokenId] += await getBalanceOfWithPercision(
      block,
      chainName,
      bdstableCollateralPools[index],
      ethCollateralAddress
    );
  }

  return balances;
}

async function getBalanceOfWithPercision(block, chainName, owner, target) {
  let balance = (
    await sdk.api.erc20.balanceOf({
      target,
      owner,
      chain: chainName,
      block,
    })
  ).output;

  const decimals = (await sdk.api.erc20.decimals(target, chainName)).output;
  return balance / 10 ** decimals;
}

function sumBalances(balancesArray) {
  return balancesArray.reduce((balances, singleBalance) => {
    for (const [coingeckoTokenId, amount] of Object.entries(singleBalance)) {
      if (!balances[coingeckoTokenId]) {
        balances[coingeckoTokenId] = 0;
      }

      balances[coingeckoTokenId] += amount;
    }

    return balances;
  }, {});
}

async function tvl(chainName, timestamp, block) {
  // const bdxTokenAddress = chains[chainName].bdxTokenAddress;
  // const wrappedNativeTokenAddress = chains[chainName].wrappedNativeTokenAddress;
  // const wrappedNativeTokenName = chains[chainName].wrappedNativeTokenName;
  // const uniswapFactoryAddress = chains[chainName].uniswapFactoryAddress;
  const balancesArray = [];

  //=======
  // AMM
  //=======
  // TODO: What's the core token all about here? Is it actually WRBTC?
  // TODO: What's the whitelist token all about? What is it being used for in the function? (in our case it's BDX)
  // let ammTvlInWRBTC = 0;
  // ammTvlInWRBTC = calculateUsdUniTvl(
  //   uniswapFactoryAddress,
  //   chainName,
  //   wrappedNativeTokenAddress,
  //   [bdxTokenAddress],
  //   wrappedNativeTokenName
  // )[[wrappedNativeTokenName]];

  // console.log(ammTvlInWRBTC);
  // TODO: Delete this comment: calculateUsdUniTvl returns: { [coreAssetName]: (coreBalance) / (10 ** decimals) }

  //===================
  // Non-BDX Collateral
  //===================
  const bdstables = chains[chainName].bdstables;
  for (let index = 0; index < bdstables.length; index++) {
    balancesArray.push(
      await getBDStableCollateralBalances(block, chainName, bdstables[index])
    );
  }

  //================
  // BDX Collateral
  //================
  // TODO: Uncomment whenever coingecko adds BDX price
  const bdxBalance = {};
  // bdxBalance[bdxCoingeckoId] = 0;
  // for (let index = 0; index < bdstables.length; index++) {
  //   bdxBalance[bdxCoingeckoId] += await getBalanceOfWithPercision(
  //     block,
  //     chainName,
  //     bdstables[index].address,
  //     bdxTokenAddress
  //   );
  // }

  // console.log("=====================================");
  // console.log(bdxBalance);
  // console.log("=====================================");
  balancesArray.push(bdxBalance);

  return sumBalances(balancesArray);
}

const rsk = async function rskTvl(timestamp, ethBlock, chainblocks) {
  return tvl("rsk", timestamp, chainblocks["rsk"]);
};

module.exports = {
  misrepresentedTokens: true,
  methodology:
    "(1) AMM LP pairs - All the liquidity pools from the Factory address are used to find the LP pairs. This part of the TVL is equal to the liquidity on the AMM. (2) Collateral - All the collateral being used to support the stable coins - Bitcoin, Ethereum & BDX",
  rsk: {
    tvl: rsk,
  },
  // TODO: Should we include this?? It calls RSK twice
  // tvl: sdk.util.sumChainTvls([rsk]),
};
