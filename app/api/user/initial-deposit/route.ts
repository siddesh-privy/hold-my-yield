import { NextResponse } from "next/server";
import { initialDeposit } from "@/lib/rebalance-executor";

export async function POST(request: Request) {
  try {
    const { walletId, walletAddress, usdcBalance } = await request.json();

    if (!walletId || !walletAddress || !usdcBalance) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if balance is sufficient (minimum $1 for testing)
    const balanceNum = parseFloat(usdcBalance) / 1e6;
    if (balanceNum < 1) {
      return NextResponse.json({
        success: false,
        error: "Insufficient balance (minimum $1 USDC required)",
      }, { status: 400 });
    }

    console.log(`Initial deposit request for ${walletAddress}: ${balanceNum} USDC`);

    // Get best available vault
    const vaultsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/vaults`
    );
    const vaultsData = await vaultsResponse.json();

    if (!vaultsData.success || !vaultsData.vaults || vaultsData.vaults.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No vaults available",
      }, { status: 500 });
    }

    const bestVault = vaultsData.vaults[0]; // Highest APY vault

    console.log(`Best vault: ${bestVault.name} (${(bestVault.netApy * 100).toFixed(2)}% APY)`);

    // Execute initial deposit
    const result = await initialDeposit(walletId, walletAddress, usdcBalance, {
      protocol: bestVault.protocol,
      address: bestVault.address || bestVault.marketAddress,
    });

    if (result.success) {
      console.log(`✅ Initial deposit successful: ${result.txHash}`);
      return NextResponse.json({
        success: true,
        txHash: result.txHash,
        vault: {
          name: bestVault.name,
          protocol: bestVault.protocol,
          apy: bestVault.netApy,
        },
      });
    } else {
      console.error(`❌ Initial deposit failed: ${result.error}`);
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in initial deposit:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute initial deposit",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

