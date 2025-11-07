import { PrivyClient } from "@privy-io/node";
import { encodeFunctionData } from "viem";

// Initialize Privy
const privy = new PrivyClient({
  appId: process.env.PRIVY_APP_ID,
  appSecret: process.env.PRIVY_APP_SECRET,
});

// Base chain configuration
const BASE_CHAIN_ID = 8453;
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const MORPHO_API_URL = "https://api.morpho.org/graphql";
const AAVE_API_URL = "https://api.v3.aave.com/graphql";
const AAVE_V3_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";

// Vault filtering (must match frontend)
const MIN_VAULT_APY = 0.01; // 1% minimum APY
const MIN_VAULT_TVL = 1000000; // $1M minimum total value locked

// ABIs
const USDC_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
];

const MORPHO_VAULT_ABI = [
  {
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "deposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const MORPHO_REDEEM_ABI = [
  {
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    name: "redeem",
    outputs: [{ name: "assets", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const AAVE_POOL_ABI = [
  {
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "referralCode", type: "uint16" },
    ],
    name: "supply",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const AAVE_WITHDRAW_ABI = [
  {
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
    ],
    name: "withdraw",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const authorizationContext = {
  authorization_private_keys: [process.env.PRIVY_AUTH_KEY],
};

async function checkAndRebalanceAllUsers() {
  const stats = {
    processed: 0,
    executed: 0,
    errors: 0,
    totalValueMoved: 0,
  };

  console.log("📊 Fetching wallets from Privy...");

  // Get all available vaults first
  const vaults = await fetchAllVaults();
  const bestVault = vaults[0]; // Sorted by netApy descending

  if (!bestVault) {
    console.log("⚠️  No vaults available");
    return stats;
  }

  console.log(
    `🏆 Best vault: ${bestVault.name} (${(bestVault.netApy * 100).toFixed(
      2
    )}% APY)\n`
  );

  let walletCount = 0;
  let skippedCount = 0;

  // Iterate through all Ethereum wallets associated with the app
  for await (const wallet of privy.wallets().list({ chain_type: "ethereum" })) {
    walletCount++;

    // Check if wallet has auto-balance enabled (additional_signers present)
    const hasAutoBalance =
      wallet.additional_signers && wallet.additional_signers.length > 0;

    console.log(`\n👛 Wallet #${walletCount}:`);
    console.log(`   Address: ${wallet.address}`);
    console.log(`   ID: ${wallet.id}`);
    console.log(
      `   Auto-balance: ${hasAutoBalance ? "✅ Enabled" : "❌ Disabled"}`
    );
    if (hasAutoBalance) {
      console.log(
        `   Signers: ${wallet.additional_signers
          .map((s) => s.signer_id)
          .join(", ")}`
      );
    }

    // Skip if auto-balance not enabled
    if (!hasAutoBalance) {
      skippedCount++;
      continue;
    }

    try {
      console.log(`${"─".repeat(60)}`);
      console.log(`👤 Checking wallet: ${wallet.address}`);

      // Check for opportunities
      const opportunities = await checkUserOpportunities(
        wallet.address,
        wallet.id,
        vaults,
        bestVault
      );

      if (opportunities.length > 0) {
        console.log(`   🎯 ${opportunities.length} opportunity(ies) found`);

        for (const opp of opportunities) {
          try {
            console.log(
              `\n   💎 ${
                opp.type === "wallet_deposit" ? "Deposit" : "Rebalance"
              }: $${opp.amountUsd.toFixed(2)} → ${(opp.targetApy * 100).toFixed(
                2
              )}% APY (+${(opp.apyDiff * 100).toFixed(2)}%)`
            );

            // Execute the rebalance/deposit
            const result = await executeRebalance(
              wallet.id,
              wallet.address,
              opp
            );

            if (result.success) {
              stats.executed++;
              stats.totalValueMoved += opp.amountUsd;
              console.log(
                `   ✅ Done! TX: ${
                  result.depositHash ||
                  result.withdrawHash ||
                  result.approveHash
                }`
              );
            } else {
              throw new Error(result.error || "Unknown error");
            }

            // Wait between transactions to avoid rate limits
            await sleep(3000);
          } catch (error) {
            console.error(`   ❌ Execution failed: ${error.message}`);
            stats.errors++;
          }
        }
      } else {
        console.log(`   ✅ Optimized`);
      }

      stats.processed++;

      // Small delay between wallets
      await sleep(1000);
    } catch (error) {
      console.error(`   ❌ Error processing wallet: ${error.message}`);
      stats.errors++;
    }
  }

  console.log(`${"─".repeat(60)}`);
  console.log(`📊 Summary:`);
  console.log(`   Total wallets in app: ${walletCount}`);
  console.log(`   Skipped (auto-balance disabled): ${skippedCount}`);
  console.log(`   Processed (auto-balance enabled): ${stats.processed}`);
  if (stats.processed === 0 && skippedCount > 0) {
    console.log(
      `\n   💡 Tip: Enable auto-balance for wallets in your app to start rebalancing`
    );
  }
  console.log(`${"─".repeat(60)}\n`);

  return stats;
}

async function checkUserOpportunities(address, walletId, vaults, bestVault) {
  const opportunities = [];

  try {
    // 1. Check wallet balance for deposits
    const walletBalance = await getWalletBalance(address, walletId);

    if (walletBalance > 1) {
      console.log(`   💰 Wallet: $${walletBalance.toFixed(2)} USDC available`);
      opportunities.push({
        type: "wallet_deposit",
        fromProtocol: "wallet",
        fromVault: null,
        toProtocol: bestVault.protocol,
        toVault: bestVault.marketAddress || bestVault.address,
        toVaultName: bestVault.name,
        amountUsd: walletBalance,
        amountRaw: Math.floor(walletBalance * 1e6).toString(), // USDC has 6 decimals
        currentApy: 0,
        targetApy: bestVault.netApy,
        apyDiff: bestVault.netApy,
      });
    }

    // 2. Check positions for better vaults
    const positions = await getUserPositions(address);

    for (const position of positions) {
      // Find the best vault for this position
      const betterVault = vaults.find(
        (v) => v.netApy > position.currentApy + 0.005
      ); // 0.5% minimum improvement

      if (betterVault && betterVault.netApy > position.currentApy + 0.005) {
        const apyDiff = betterVault.netApy - position.currentApy;
        console.log(
          `   📈 Better vault found for ${position.vaultName}: ${
            betterVault.name
          } (+${(apyDiff * 100).toFixed(2)}%)`
        );

        opportunities.push({
          type: "rebalance",
          fromProtocol: position.protocol,
          fromVault: position.vaultAddress,
          fromVaultName: position.vaultName,
          toProtocol: betterVault.protocol,
          toVault: betterVault.marketAddress || betterVault.address,
          toVaultName: betterVault.name,
          amountUsd: position.deposited.usd,
          amountRaw: position.deposited.amount,
          sharesAmount: position.shares, // For Morpho withdrawals
          currentApy: position.currentApy,
          targetApy: betterVault.netApy,
          apyDiff: apyDiff,
        });
      }
    }
  } catch (error) {
    console.error("   ❌ Error checking opportunities:", error.message);
  }

  return opportunities;
}

async function executeRebalance(walletId, walletAddress, opportunity) {
  const result = {
    success: false,
    approveHash: null,
    withdrawHash: null,
    depositHash: null,
    error: null,
  };

  try {
    if (opportunity.type === "wallet_deposit") {
      // Simple deposit from wallet
      console.log("   🔄 Approving USDC...");
      const approveResult = await approveUSDC(
        walletId,
        opportunity.amountUsd.toString(),
        opportunity.toVault
      );

      if (!approveResult.success) {
        throw new Error(`Approve failed: ${approveResult.error}`);
      }
      result.approveHash = approveResult.hash;

      await sleep(2000);

      const depositResult = await depositUSDC(
        walletId,
        walletAddress,
        opportunity.amountUsd.toString(),
        opportunity.toProtocol,
        opportunity.toVault
      );

      if (!depositResult.success) {
        throw new Error(`Deposit failed: ${depositResult.error}`);
      }
      result.depositHash = depositResult.hash;
      result.success = true;
    } else if (opportunity.type === "rebalance") {
      // Withdraw from old vault, deposit to new vault
      const withdrawResult = await withdrawUSDC(
        walletId,
        walletAddress,
        opportunity.sharesAmount || opportunity.amountRaw,
        opportunity.fromProtocol,
        opportunity.fromVault
      );

      if (!withdrawResult.success) {
        throw new Error(`Withdraw failed: ${withdrawResult.error}`);
      }
      result.withdrawHash = withdrawResult.hash;

      await sleep(3000); // Wait for withdrawal to be confirmed

      const approveResult = await approveUSDC(
        walletId,
        opportunity.amountUsd.toString(),
        opportunity.toVault
      );

      if (!approveResult.success) {
        throw new Error(`Approve failed: ${approveResult.error}`);
      }
      result.approveHash = approveResult.hash;

      await sleep(2000);

      const depositResult = await depositUSDC(
        walletId,
        walletAddress,
        opportunity.amountUsd.toString(),
        opportunity.toProtocol,
        opportunity.toVault
      );

      if (!depositResult.success) {
        throw new Error(`Deposit failed: ${depositResult.error}`);
      }
      result.depositHash = depositResult.hash;
      result.success = true;
    }
  } catch (error) {
    result.error = error.message;
    console.error("   ❌ Execution error:", error.message);
  }

  return result;
}

async function approveUSDC(walletId, amount, spender) {
  try {
    const encodedData = encodeFunctionData({
      abi: USDC_ABI,
      functionName: "approve",
      args: [spender, BigInt(Math.floor(Number(amount) * 1e6))],
    });

    const { hash } = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: `eip155:${BASE_CHAIN_ID}`,
        params: {
          transaction: {
            to: USDC_ADDRESS,
            data: encodedData,
            chain_id: BASE_CHAIN_ID,
          },
        },
        sponsor: true,
        authorization_context: authorizationContext,
      });

    return { success: true, hash };
  } catch (error) {
    console.error("Approve USDC failed:", error);
    return { success: false, error: error.message };
  }
}

async function withdrawUSDC(
  walletId,
  userAddress,
  amount,
  protocol,
  marketAddress
) {
  try {
    let encodedData;

    if (protocol === "morpho") {
      encodedData = encodeFunctionData({
        abi: MORPHO_REDEEM_ABI,
        functionName: "redeem",
        args: [BigInt(amount), userAddress, userAddress],
      });
    } else if (protocol === "aave-v3") {
      const maxUint256 = BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      );

      encodedData = encodeFunctionData({
        abi: AAVE_WITHDRAW_ABI,
        functionName: "withdraw",
        args: [
          USDC_ADDRESS,
          maxUint256, // Withdraw all
          userAddress,
        ],
      });
    } else {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }

    const { hash } = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: `eip155:${BASE_CHAIN_ID}`,
        params: {
          transaction: {
            to: marketAddress,
            data: encodedData,
            chain_id: BASE_CHAIN_ID,
          },
        },
        sponsor: true,
        authorization_context: authorizationContext,
      });

    return { success: true, hash };
  } catch (error) {
    console.error("Withdraw USDC failed:", error);
    return { success: false, error: error.message };
  }
}

async function depositUSDC(
  walletId,
  walletAddress,
  amount,
  protocol,
  marketAddress
) {
  try {
    let encodedData;
    const rawAmount = BigInt(Math.floor(Number(amount) * 1e6));

    if (protocol === "morpho") {
      encodedData = encodeFunctionData({
        abi: MORPHO_VAULT_ABI,
        functionName: "deposit",
        args: [rawAmount, walletAddress],
      });
    } else if (protocol === "aave-v3") {
      encodedData = encodeFunctionData({
        abi: AAVE_POOL_ABI,
        functionName: "supply",
        args: [USDC_ADDRESS, rawAmount, walletAddress, 0],
      });
    } else {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }

    const { hash } = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: `eip155:${BASE_CHAIN_ID}`,
        params: {
          transaction: {
            to: marketAddress,
            data: encodedData,
            chain_id: BASE_CHAIN_ID,
          },
        },
        sponsor: true,
        authorization_context: authorizationContext,
      });

    return { success: true, hash };
  } catch (error) {
    console.error("Deposit USDC failed:", error);
    return { success: false, error: error.message };
  }
}

async function fetchAllVaults() {
  try {
    const [morphoVaults, aaveMarkets] = await Promise.all([
      fetchMorphoVaults(),
      fetchAaveMarkets(),
    ]);

    const allVaults = [...morphoVaults, ...aaveMarkets];
    allVaults.sort((a, b) => b.netApy - a.netApy); // Sort by highest APY first

    return allVaults;
  } catch (error) {
    console.error("Error fetching vaults:", error);
    return [];
  }
}

async function fetchMorphoVaults() {
  try {
    const query = `
      query GetVaults($chainId: Int!, $assetAddress: String!) {
        vaults(
          where: {
            chainId_in: [$chainId]
            assetAddress_in: [$assetAddress]
          }
          orderBy: TotalAssetsUsd
          orderDirection: Desc
          first: 50
        ) {
          items {
            address
            name
            asset {
              address
              symbol
              name
              decimals
            }
            state {
              apy
              netApy
              totalAssetsUsd
            }
          }
        }
      }
    `;

    const response = await fetch(MORPHO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: {
          chainId: BASE_CHAIN_ID,
          assetAddress: USDC_ADDRESS,
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(`Morpho API error: ${JSON.stringify(data.errors)}`);
    }

    // Filter by minimum APY and TVL (same as frontend)
    return (data.data?.vaults?.items || [])
      .filter(
        (v) =>
          (v.state?.apy || 0) >= MIN_VAULT_APY &&
          (v.state?.totalAssetsUsd || 0) > MIN_VAULT_TVL
      )
      .map((v) => ({
        protocol: "morpho",
        address: v.address,
        marketAddress: v.address,
        name: v.name,
        netApy: v.state.netApy,
        apy: v.state.apy,
        totalAssetsUsd: v.state.totalAssetsUsd,
      }));
  } catch (error) {
    console.error("Error fetching Morpho vaults:", error);
    return [];
  }
}

async function fetchAaveMarkets() {
  try {
    const query = `
      query GetMarkets($chainId: Int!) {
        markets(request: { chainIds: [$chainId] }) {
          name
          address
          totalMarketSize
          totalAvailableLiquidity
          reserves {
            underlyingToken {
              address
              symbol
              name
              decimals
            }
            supplyInfo {
              apy {
                value
                formatted
              }
            }
            usdExchangeRate
          }
        }
      }
    `;

    const response = await fetch(AAVE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { chainId: BASE_CHAIN_ID },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(`Aave API error: ${JSON.stringify(data.errors)}`);
    }

    const markets = [];

    for (const market of data.data?.markets || []) {
      const usdcReserve = market.reserves.find(
        (r) =>
          r.underlyingToken.address.toLowerCase() === USDC_ADDRESS.toLowerCase()
      );

      if (usdcReserve) {
        const apy = parseFloat(usdcReserve.supplyInfo.apy.value);
        const totalMarketSize = parseFloat(market.totalMarketSize);
        const usdRate = parseFloat(usdcReserve.usdExchangeRate);
        const totalAssetsUsd = totalMarketSize * usdRate;

        // Filter by minimum APY and TVL (same as frontend)
        if (apy >= MIN_VAULT_APY && totalAssetsUsd > MIN_VAULT_TVL) {
          markets.push({
            protocol: "aave-v3",
            address: USDC_ADDRESS,
            marketAddress: market.address,
            name: `${market.name} - USDC`,
            netApy: apy,
            apy: apy,
            totalAssetsUsd: totalAssetsUsd,
          });
        }
      }
    }

    return markets;
  } catch (error) {
    console.error("Error fetching Aave markets:", error);
    return [];
  }
}

async function getWalletBalance(address, walletId) {
  try {
    const auth = Buffer.from(
      `${process.env.PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`
    ).toString("base64");

    const response = await fetch(
      `https://api.privy.io/v1/wallets/${walletId}/balance?asset=usdc&chain=base`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
          "privy-app-id": process.env.PRIVY_APP_ID,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`Balance API error: ${response.status}`);
      return 0;
    }

    const data = await response.json();
    const usdcBalance = data.balances?.find(
      (balance) => balance.chain === "base" && balance.asset === "usdc"
    );

    if (!usdcBalance) {
      return 0;
    }

    const rawValue = BigInt(usdcBalance.raw_value);
    return Number(rawValue) / 1e6;
  } catch (error) {
    console.error("Error getting wallet balance:", error.message);
    return 0;
  }
}

async function getUserPositions(address) {
  try {
    const [morphoPositions, aavePositions] = await Promise.all([
      fetchMorphoPositions(address),
      fetchAavePositions(address),
    ]);

    return [...morphoPositions, ...aavePositions].filter(
      (p) => p.deposited.usd > 0.01
    );
  } catch (error) {
    console.error("Error getting user positions:", error);
    return [];
  }
}

async function fetchMorphoPositions(address) {
  try {
    const query = `
      query GetUserPositions($chainId: Int!, $address: String!) {
        userByAddress(chainId: $chainId, address: $address) {
          vaultPositions {
            vault {
              address
              name
              asset {
                address
                symbol
                name
                decimals
              }
              state {
                apy
                netApy
              }
            }
            shares
            assets
            assetsUsd
          }
        }
      }
    `;

    const response = await fetch(MORPHO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: {
          chainId: BASE_CHAIN_ID,
          address: address.toLowerCase(),
        },
      }),
    });

    const data = await response.json();
    const positions = data.data?.userByAddress?.vaultPositions || [];

    return positions
      .filter(
        (p) =>
          p.vault.asset.address.toLowerCase() === USDC_ADDRESS.toLowerCase()
      )
      .map((p) => ({
        id: `morpho:${p.vault.address}`,
        protocol: "morpho",
        vaultAddress: p.vault.address,
        vaultName: p.vault.name,
        deposited: {
          amount: p.shares,
          formatted: p.assetsUsd.toFixed(2),
          usd: p.assetsUsd,
        },
        shares: p.shares,
        currentApy: p.vault.state.netApy,
        estimatedYearlyYield: p.assetsUsd * p.vault.state.netApy,
      }));
  } catch (error) {
    console.error("Error fetching Morpho positions:", error);
    return [];
  }
}

async function fetchAavePositions(address) {
  try {
    const query = `
      query GetUserReserves($address: String!, $chainId: Int!) {
        markets(request: { chainIds: [$chainId], user: $address }) {
          address
          name
          reserves {
            underlyingToken {
              address
              symbol
              name
              decimals
            }
            supplyInfo {
              apy {
                value
              }
            }
            usdExchangeRate
          }
          userState {
            netWorth
            totalCollateralBase
          }
        }
      }
    `;

    const response = await fetch(AAVE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: {
          address: address.toLowerCase(),
          chainId: BASE_CHAIN_ID,
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error("Aave positions error:", data.errors);
      return [];
    }

    const markets = data.data?.markets || [];
    const positions = [];

    for (const market of markets) {
      // Check if user has any collateral in this market
      if (
        !market.userState ||
        parseFloat(market.userState.totalCollateralBase) === 0
      ) {
        continue;
      }

      const usdcReserve = market.reserves.find(
        (r) =>
          r.underlyingToken.address.toLowerCase() === USDC_ADDRESS.toLowerCase()
      );

      if (usdcReserve) {
        const apy = parseFloat(usdcReserve.supplyInfo.apy.value);
        const totalCollateral = parseFloat(
          market.userState.totalCollateralBase
        );
        const usdRate = parseFloat(usdcReserve.usdExchangeRate);

        // Calculate USDC position value
        const usdcValue = totalCollateral * usdRate;

        if (usdcValue > 0.01) {
          positions.push({
            id: `aave:${market.address}`,
            protocol: "aave-v3",
            vaultAddress: market.address,
            vaultName: market.name,
            deposited: {
              amount: totalCollateral.toString(),
              formatted: usdcValue.toFixed(2),
              usd: usdcValue,
            },
            currentApy: apy,
            estimatedYearlyYield: usdcValue * apy,
          });
        }
      }
    }

    return positions;
  } catch (error) {
    console.error("Error fetching Aave positions:", error);
    return [];
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { checkAndRebalanceAllUsers };
