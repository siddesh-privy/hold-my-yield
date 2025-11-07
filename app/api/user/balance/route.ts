import { NextResponse } from "next/server";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET!;
const PRIVY_API_URL = "https://api.privy.io/v1";

interface BalanceResponse {
  balances: Array<{
    chain: string;
    asset: string;
    raw_value: string;
    raw_value_decimals: number;
    display_values: {
      [key: string]: string;
    };
  }>;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletId = searchParams.get("walletId");

    if (!walletId) {
      return NextResponse.json(
        { success: false, error: "Wallet ID required" },
        { status: 400 }
      );
    }

    // Create Basic Auth header
    const auth = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString(
      "base64"
    );

    const response = await fetch(
      `${PRIVY_API_URL}/wallets/${walletId}/balance?asset=usdc&chain=base&include_currency=usd`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
          "privy-app-id": PRIVY_APP_ID,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Privy balance API error:", errorData);
      throw new Error(`Privy API responded with status: ${response.status}`);
    }

    const data: BalanceResponse = await response.json();

    // Find USDC balance on Base
    const usdcBalance = data.balances.find(
      (balance) => balance.chain === "base" && balance.asset === "usdc"
    );

    if (!usdcBalance) {
      return NextResponse.json({
        success: true,
        balance: {
          raw: "0",
          decimals: 6,
          formatted: "0.00",
          usd: "0.00",
        },
      });
    }

    const formattedBalance = {
      raw: usdcBalance.raw_value,
      decimals: usdcBalance.raw_value_decimals,
      formatted: usdcBalance.display_values.usdc || "0.00",
      usd: usdcBalance.display_values.usd || "0.00",
    };

    return NextResponse.json({
      success: true,
      balance: formattedBalance,
    });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch balance",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
