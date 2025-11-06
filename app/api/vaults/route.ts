import { NextResponse } from "next/server";

// Normalized vault interface
export interface Vault {
  id: string; // Unique identifier (protocol:address or protocol:marketAddress)
  protocol: "aave-v3" | "morpho";
  name: string;
  address: string; // Asset address
  marketAddress?: string; // Market/vault address (if applicable)
  asset: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  apy: number; // As decimal (e.g., 0.0234 = 2.34%)
  netApy: number; // APY after fees
  totalAssetsUsd: number;
  metadata?: {
    image?: string;
    description?: string;
    fee?: number;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const protocol = searchParams.get("protocol"); // Optional filter: "aave" or "morpho"

    // Fetch from both APIs in parallel
    const baseUrl = request.url.split("/api/vaults")[0];
    
    const fetchPromises = [];
    
    if (!protocol || protocol === "morpho") {
      fetchPromises.push(
        fetch(`${baseUrl}/api/vaults/morpho`, { next: { revalidate: 300 } })
          .then((res) => res.json())
          .catch((error) => {
            console.error("Error fetching Morpho vaults:", error);
            return { success: false, vaults: [] };
          })
      );
    }
    
    if (!protocol || protocol === "aave") {
      fetchPromises.push(
        fetch(`${baseUrl}/api/vaults/aave`, { next: { revalidate: 300 } })
          .then((res) => res.json())
          .catch((error) => {
            console.error("Error fetching Aave markets:", error);
            return { success: false, markets: [] };
          })
      );
    }

    const results = await Promise.all(fetchPromises);

    // Normalize and combine data
    const allVaults: Vault[] = [];

    results.forEach((result) => {
      if (!result.success) return;

      // Handle Morpho vaults
      if (result.vaults) {
        result.vaults.forEach((vault: any) => {
          allVaults.push({
            id: `morpho:${vault.address}`,
            protocol: "morpho",
            name: vault.name,
            address: vault.address,
            marketAddress: vault.address,
            asset: vault.asset,
            apy: vault.apy,
            netApy: vault.netApy,
            totalAssetsUsd: vault.totalAssetsUsd,
            metadata: {
              image: vault.image,
              description: vault.description,
              fee: vault.fee,
            },
          });
        });
      }

      // Handle Aave markets
      if (result.markets) {
        result.markets.forEach((market: any) => {
          allVaults.push({
            id: `aave-v3:${market.marketAddress}`,
            protocol: "aave-v3",
            name: market.name,
            address: market.address,
            marketAddress: market.marketAddress,
            asset: market.asset,
            apy: market.apy,
            netApy: market.netApy,
            totalAssetsUsd: market.totalAssetsUsd,
            metadata: {},
          });
        });
      }
    });

    // Sort by totalAssetsUsd (highest liquidity first)
    allVaults.sort((a, b) => b.totalAssetsUsd - a.totalAssetsUsd);

    return NextResponse.json({
      success: true,
      vaults: allVaults,
      count: allVaults.length,
      byProtocol: {
        morpho: allVaults.filter((v) => v.protocol === "morpho").length,
        aave: allVaults.filter((v) => v.protocol === "aave-v3").length,
      },
    });
  } catch (error) {
    console.error("Error fetching vaults:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch vaults",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

