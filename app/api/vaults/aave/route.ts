import { NextResponse } from "next/server";
import { AAVE_API_URL, BASE_CHAIN_ID, USDC_ADDRESS } from "@/lib/CONSTANTS";

interface AaveReserve {
  underlyingToken: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  supplyInfo: {
    apy: {
      raw: string;
      decimals: number;
      value: string;
      formatted: string;
    };
  };
  usdExchangeRate: string;
}

interface AaveMarket {
  name: string;
  address: string;
  totalMarketSize: string;
  totalAvailableLiquidity: string;
  reserves: AaveReserve[];
}

// GraphQL query to fetch Aave markets
const AAVE_MARKETS_QUERY = `
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
            raw
            decimals
            value
            formatted
          }
        }
        usdExchangeRate
      }
    }
  }
`;

export async function GET() {
  try {
    const response = await fetch(AAVE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: AAVE_MARKETS_QUERY,
        variables: {
          chainId: BASE_CHAIN_ID,
        },
      }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Aave API Error Response:", data);
      throw new Error(`Aave API responded with status: ${response.status}`);
    }

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      throw new Error("Failed to fetch markets from Aave API");
    }

    const markets = (data.data?.markets || []) as AaveMarket[];

    // Extract all USDC reserves from all markets
    const allUsdcReserves: Array<{
      protocol: string;
      address: string;
      marketAddress: string;
      name: string;
      symbol: string;
      asset: {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
      };
      totalAssets: string;
      totalAssetsUsd: number;
      apy: number;
      netApy: number;
    }> = [];

    markets.forEach((market) => {
      market.reserves
        .filter(
          (reserve) =>
            reserve.underlyingToken.address.toLowerCase() ===
            USDC_ADDRESS.toLowerCase()
        )
        .forEach((reserve) => {
          // Parse APY from value field (already in decimal format)
          const apy = parseFloat(reserve.supplyInfo.apy.value);

          // Use market's totalMarketSize as an approximation for the reserve size
          // Since we can't get individual reserve size from the API
          const totalMarketSizeUsd = parseFloat(market.totalMarketSize);

          allUsdcReserves.push({
            protocol: "aave-v3",
            address: reserve.underlyingToken.address,
            marketAddress: market.address,
            name: `Aave V3 ${reserve.underlyingToken.symbol} (${market.name})`,
            symbol: reserve.underlyingToken.symbol,
            asset: {
              address: reserve.underlyingToken.address,
              symbol: reserve.underlyingToken.symbol,
              name: reserve.underlyingToken.name,
              decimals: reserve.underlyingToken.decimals,
            },
            totalAssets: "0", // We don't have access to raw amount
            totalAssetsUsd: totalMarketSizeUsd,
            apy: apy,
            netApy: apy, // Aave doesn't have performance fees on supply
          });
        });
    });

    // Filter by APY >= 1% and liquidity > $1M
    const filteredReserves = allUsdcReserves.filter(
      (reserve) => reserve.apy >= 0.01 && reserve.totalAssetsUsd > 1000000
    );

    return NextResponse.json({
      success: true,
      markets: filteredReserves,
      count: filteredReserves.length,
    });
  } catch (error) {
    console.error("Error fetching Aave reserves:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch Aave reserves",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
