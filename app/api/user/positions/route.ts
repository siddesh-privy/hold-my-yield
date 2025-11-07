import { NextResponse } from "next/server";
import {
  MORPHO_API_URL,
  AAVE_API_URL,
  BASE_CHAIN_ID,
  USDC_ADDRESS,
} from "@/lib/CONSTANTS";

// Normalized position interface
export interface UserPosition {
  id: string;
  protocol: "aave-v3" | "morpho";
  vaultAddress: string;
  vaultName: string;
  asset: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  deposited: {
    amount: string; // Raw amount (for aave) or shares (for morpho)
    formatted: string; // Human readable
    usd: number;
  };
  shares?: string; // Morpho-specific: vault shares owned
  currentApy: number;
  netApy?: number; // APY including rewards
  estimatedYearlyYield: number; // In USD
}

interface MorphoVaultPosition {
  vault: {
    address: string;
    name: string;
    asset: {
      address: string;
      symbol: string;
      name: string;
      decimals: number;
    };
    state: {
      apy: number;
      netApy: number;
    };
  };
  shares: string;
  assets: string;
  assetsUsd: number;
}

interface AaveReserve {
  underlyingToken: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  supplyInfo: {
    apy: {
      value: string;
    };
  };
  usdExchangeRate: string;
}

interface AaveMarket {
  address: string;
  name: string;
  reserves: AaveReserve[];
  userState?: {
    netWorth: string;
    netAPY: {
      value: string;
      formatted: string;
    };
    healthFactor: string;
    totalCollateralBase: string;
    totalDebtBase: string;
  };
}

const MORPHO_USER_POSITIONS_QUERY = `
  query GetUserPositions($chainId: Int!, $address: String!) {
    userByAddress(chainId: $chainId, address: $address) {
      address
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

const AAVE_USER_POSITIONS_QUERY = `
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
        netAPY {
          value
          formatted
        }
        healthFactor
        totalCollateralBase
        totalDebtBase
      }
    }
  }
`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("address");
    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: "Address parameter is required" },
        { status: 400 }
      );
    }

    const [morphoResponse, aaveResponse] = await Promise.all([
      fetch(MORPHO_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: MORPHO_USER_POSITIONS_QUERY,
          variables: {
            chainId: BASE_CHAIN_ID,
            address: userAddress.toLowerCase(),
          },
        }),
        cache: "no-store",
      }).catch((error) => {
        console.error("Error fetching Morpho positions:", error);
        return null;
      }),

      fetch(AAVE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: AAVE_USER_POSITIONS_QUERY,
          variables: {
            address: userAddress,
            chainId: BASE_CHAIN_ID,
          },
        }),
        cache: "no-store",
      }).catch((error) => {
        console.error("Error fetching Aave positions:", error);
        return null;
      }),
    ]);

    const allPositions: UserPosition[] = [];

    // Process Morpho positions
    if (morphoResponse && morphoResponse.ok) {
      const morphoData = await morphoResponse.json();

      if (morphoData.errors) {
        console.error("Morpho GraphQL errors:", morphoData.errors);
      } else {
        const vaultPositions = (morphoData.data?.userByAddress
          ?.vaultPositions || []) as MorphoVaultPosition[];

        vaultPositions
          .filter(
            (pos) =>
              pos.vault.asset.address.toLowerCase() ===
                USDC_ADDRESS.toLowerCase() && parseFloat(pos.assets) > 0
          )
          .forEach((pos) => {
            const apy = pos.vault.state.apy;
            const netApy = pos.vault.state.netApy;
            const estimatedYearlyYield = pos.assetsUsd * apy;

            allPositions.push({
              id: `morpho:${pos.vault.address}`,
              protocol: "morpho",
              vaultAddress: pos.vault.address,
              vaultName: pos.vault.name,
              asset: pos.vault.asset,
              deposited: {
                amount: pos.shares, // Store shares in amount for Morpho
                formatted: (
                  parseFloat(pos.assets) /
                  Math.pow(10, pos.vault.asset.decimals)
                ).toFixed(2),
                usd: pos.assetsUsd,
              },
              shares: pos.shares, // Morpho vault shares
              currentApy: apy,
              netApy: netApy,
              estimatedYearlyYield,
            });
          });
      }
    }

    // Process Aave positions
    if (aaveResponse && aaveResponse.ok) {
      const aaveData = await aaveResponse.json();

      if (aaveData.errors) {
        console.error("Aave GraphQL errors:", aaveData.errors);
      } else {
        const markets = (aaveData.data?.markets || []) as AaveMarket[];

        markets.forEach((market) => {
          // Check if user has any collateral in this market
          if (
            !market.userState ||
            parseFloat(market.userState.totalCollateralBase) === 0
          ) {
            return;
          }

          const reserves = market.reserves || [];

          // Find USDC reserve in this market
          const usdcReserve = reserves.find(
            (reserve) =>
              reserve.underlyingToken.address.toLowerCase() ===
              USDC_ADDRESS.toLowerCase()
          );

          if (!usdcReserve) {
            return;
          }

          // Use market-level user data
          const netWorth = parseFloat(market.userState.netWorth || "0");
          const netAPY = parseFloat(market.userState.netAPY?.value || "0");
          const totalCollateral = parseFloat(
            market.userState.totalCollateralBase || "0"
          );

          // If user has collateral in this market, create a position
          if (totalCollateral > 0) {
            const estimatedYearlyYield = netWorth * netAPY;

            allPositions.push({
              id: `aave-v3:${market.address}`,
              protocol: "aave-v3",
              vaultAddress: market.address,
              vaultName: `Aave V3 ${usdcReserve.underlyingToken.symbol} (${market.name})`,
              asset: usdcReserve.underlyingToken,
              deposited: {
                amount: market.userState.totalCollateralBase,
                formatted: totalCollateral.toFixed(2),
                usd: totalCollateral,
              },
              currentApy: netAPY,
              estimatedYearlyYield,
            });
          }
        });
      }
    }

    // Calculate totals
    const totalDeposited = allPositions.reduce(
      (sum, pos) => sum + pos.deposited.usd,
      0
    );
    const totalEstimatedYearlyYield = allPositions.reduce(
      (sum, pos) => sum + pos.estimatedYearlyYield,
      0
    );
    const weightedAverageApy =
      totalDeposited > 0 ? totalEstimatedYearlyYield / totalDeposited : 0;

    return NextResponse.json({
      success: true,
      address: userAddress,
      positions: allPositions,
      summary: {
        totalDeposited,
        totalEstimatedYearlyYield,
        weightedAverageApy,
        positionCount: allPositions.length,
        byProtocol: {
          morpho: {
            count: allPositions.filter((p) => p.protocol === "morpho").length,
            totalDeposited: allPositions
              .filter((p) => p.protocol === "morpho")
              .reduce((sum, p) => sum + p.deposited.usd, 0),
          },
          aave: {
            count: allPositions.filter((p) => p.protocol === "aave-v3").length,
            totalDeposited: allPositions
              .filter((p) => p.protocol === "aave-v3")
              .reduce((sum, p) => sum + p.deposited.usd, 0),
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user positions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user positions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
