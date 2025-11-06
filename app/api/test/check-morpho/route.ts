import { NextResponse } from "next/server";

const MORPHO_API_URL = "https://api.morpho.org/graphql";
const BASE_CHAIN_ID = 8453;

const MORPHO_USER_POSITIONS_QUERY = `
  query GetUserPositions($address: String!, $chainId: Int!) {
    user(address: $address, chainId: $chainId) {
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
            netApy
          }
        }
        totalAssets
        totalAssetsUsd
      }
    }
  }
`;

export async function GET(request: Request) {
  if (process.env.TESTING_MODE !== "true") {
    return NextResponse.json({ error: "Test mode only" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address") || "0x1E598482Aa848B8404f21e859855F1a44739d729";

    console.log(`🔍 Checking Morpho for address: ${address}`);

    const response = await fetch(MORPHO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: MORPHO_USER_POSITIONS_QUERY,
        variables: {
          address: address.toLowerCase(),
          chainId: BASE_CHAIN_ID,
        },
      }),
    });

    const data = await response.json();

    console.log("📊 Morpho API Response:", JSON.stringify(data, null, 2));

    return NextResponse.json({
      success: true,
      address,
      morphoResponse: data,
      vaultPositions: data.data?.user?.vaultPositions || [],
      hasErrors: !!data.errors,
      errors: data.errors || null,
    });
  } catch (error) {
    console.error("Error checking Morpho:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

