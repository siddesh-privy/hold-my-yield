import { NextResponse } from "next/server";

const MORPHO_API_URL = "https://api.morpho.org/graphql";
const BASE_CHAIN_ID = 8453;
export const USDC_BASE_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"; // USDC on Base

interface VaultAsset {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

interface VaultState {
  totalAssets: string;
  totalAssetsUsd: number;
  apy: number;
  netApy: number;
  fee: number;
}

interface VaultMetadata {
  image?: string;
  description?: string;
}

interface Vault {
  address: string;
  name: string;
  symbol: string;
  asset: VaultAsset;
  state: VaultState;
  metadata?: VaultMetadata;
}

// GraphQL query to fetch vaults
const VAULTS_QUERY = `
  query GetVaults($chainId: Int!) {
    vaults(
      where: {
        chainId_in: [$chainId]
      }
      first: 1000
    ) {
      items {
        address
        name
        symbol
        asset {
          address
          symbol
          name
          decimals
        }
        state {
          totalAssets
          totalAssetsUsd
          apy
          netApy
          fee
        }
        metadata {
          image
          description
        }
      }
    }
  }
`;

export async function GET() {
  try {
    const response = await fetch(MORPHO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: VAULTS_QUERY,
        variables: {
          chainId: BASE_CHAIN_ID,
        },
      }),
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("API Error Response:", data);
      throw new Error(`Morpho API responded with status: ${response.status}`);
    }

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      throw new Error("Failed to fetch vaults from Morpho API");
    }

    const vaults = (data.data?.vaults?.items || []) as Vault[];

    // Filter for USDC vaults with APY >= 1% and liquidity > $1M, sorted by AUM
    const usdcVaults = vaults
      .filter(
        (vault) =>
          vault.asset.address.toLowerCase() ===
            USDC_BASE_ADDRESS.toLowerCase() &&
          (vault.state?.netApy || 0) >= 0.01 && // APY >= 1%
          (vault.state?.totalAssetsUsd || 0) > 1000000 // Liquidity > $1M
      )
      .sort((a, b) => {
        const aUsd = parseFloat(String(a.state?.totalAssetsUsd || "0"));
        const bUsd = parseFloat(String(b.state?.totalAssetsUsd || "0"));
        return bUsd - aUsd;
      });

    // Format the response
    const formattedVaults = usdcVaults.map((vault) => ({
      address: vault.address,
      name: vault.name,
      symbol: vault.symbol,
      asset: {
        address: vault.asset.address,
        symbol: vault.asset.symbol,
        name: vault.asset.name,
        decimals: vault.asset.decimals,
      },
      totalAssets: vault.state?.totalAssets || "0",
      totalAssetsUsd: vault.state?.totalAssetsUsd || 0,
      apy: vault.state?.apy || 0,
      netApy: vault.state?.netApy || 0,
      fee: vault.state?.fee || 0,
      image: vault.metadata?.image,
      description: vault.metadata?.description,
    }));

    return NextResponse.json({
      success: true,
      vaults: formattedVaults,
      count: formattedVaults.length,
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
