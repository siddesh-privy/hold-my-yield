import { NextResponse } from "next/server";
import { verifyAuthToken, isUserWalletMatch, withdrawUSDC, privy } from "@/lib/privy";

export async function POST(request: Request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const claims = await verifyAuthToken(token);
    if (!claims) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Parse body parameters
    const body = await request.json();
    const { walletId, protocol, marketAddress, amount, walletAddress } = body;

    // Validate required fields
    if (!walletId || !protocol || !marketAddress || !amount || !walletAddress) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["walletId", "protocol", "marketAddress", "amount", "walletAddress"],
        },
        { status: 400 }
      );
    }

    // Verify the wallet belongs to the authenticated user
    const walletMatch = await isUserWalletMatch(claims.user_id, walletId);
    if (!walletMatch) {
      return NextResponse.json(
        { error: "Wallet does not belong to authenticated user" },
        { status: 403 }
      );
    }

    // Execute withdrawal
    const withdrawResult = await withdrawUSDC(
      walletId,
      walletAddress,
      amount,
      protocol,
      marketAddress
    );

    if (!withdrawResult.success) {
      console.error("Withdrawal failed:", withdrawResult.error);
      return NextResponse.json(
        { error: "Withdrawal failed", details: withdrawResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawTx: withdrawResult.hash,
      caip2: withdrawResult.caip2,
      amount,
      protocol,
      marketAddress,
    });
  } catch (error) {
    console.error("Error in withdraw API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

