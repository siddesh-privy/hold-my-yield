import { NextResponse } from "next/server";
import { MORPHO_API_URL, BASE_CHAIN_ID, USDC_ADDRESS } from "@/lib/CONSTANTS";

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

const VAULTS_QUERY = `
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
          assetAddress: USDC_ADDRESS,
        },
      }),
      cache: "no-store",
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

    const filteredVaults = vaults.filter(
        (vault) =>
        (vault.state?.apy || 0) >= 0.01 &&
        (vault.state?.totalAssetsUsd || 0) > 1000000
    );

    const formattedVaults = filteredVaults.map((vault) => ({
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
