import { NextResponse } from "next/server";
import { executeWithdrawAll } from "@/lib/withdraw-all";

/**
 * Close all user positions and withdraw to wallet
 */
export async function POST(request: Request) {
  try {
    const { walletId, walletAddress } = await request.json();

    if (!walletId || !walletAddress) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(`🔄 Closing all positions for ${walletAddress}...`);

    // Get user positions
    const positionsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/user/positions?address=${walletAddress}`
    );
    const positionsData = await positionsResponse.json();

    if (!positionsData.success || !positionsData.positions || positionsData.positions.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No positions found to close",
      });
    }

    // Withdraw from all positions
    const result = await executeWithdrawAll(
      walletId,
      walletAddress,
      positionsData.positions
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "All positions closed successfully",
        transactions: result.transactions,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to close positions",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error closing positions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to close positions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

