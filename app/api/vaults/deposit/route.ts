import {
  approveUSDC,
  depositUSDC,
  isUserWalletMatch,
  verifyAuthToken,
} from "@/lib/privy";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletId, market, marketId, amount, walletAddress } = body;

    const authToken = request.headers.get("Authorization");
    if (!authToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Authorization header",
        },
        { status: 401 }
      );
    }

    const verifiedClaims = await verifyAuthToken(authToken);
    if (!verifiedClaims) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Authorization header",
        },
        { status: 401 }
      );
    }
    // Validate required fields
    if (!walletId || !market || !marketId || !amount || !walletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "walletId, market, marketId, and amount are required",
        },
        { status: 400 }
      );
    }

    const isMatch = await isUserWalletMatch(verifiedClaims.user_id, walletId);
    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          error: "User wallet does not match",
        },
        { status: 401 }
      );
    }

    const approveTx = await approveUSDC(walletId, amount, marketId);
    if (!approveTx.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to approve USDC",
        },
        { status: 500 }
      );
    }

    // Wait for approval to be confirmed on-chain
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const depositTx = await depositUSDC(
      walletId,
      walletAddress,
      amount,
      market,
      marketId
    );
    if (!depositTx.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to deposit USDC",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Deposit initiated (placeholder)",
      data: {
        walletId,
        market,
        marketId,
        amount,
        timestamp: new Date().toISOString(),
        approveTx,
      },
    });
  } catch (error) {
    console.error("Error in deposit route:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process deposit",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
