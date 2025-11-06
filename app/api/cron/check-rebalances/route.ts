import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import {
  canRebalance,
  evaluateRebalanceOpportunity,
  addToRebalanceQueue,
  type RebalanceOpportunity,
} from "@/lib/rebalance-checker";

export const maxDuration = 60; // 60 seconds max execution time

export async function GET(request: Request) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔍 Starting rebalance check...");

    // 1. Get all users with auto-balancer enabled
    const users = await kv.smembers("users:auto_balance_enabled");
    
    if (!users || users.length === 0) {
      console.log("No users with auto-balancer enabled");
      return NextResponse.json({
        success: true,
        message: "No users to check",
        usersChecked: 0,
      });
    }

    console.log(`Found ${users.length} users with auto-balancer enabled`);

    // 2. Get current best vaults (cache this for all users)
    const vaultsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/vaults`
    );
    const vaultsData = await vaultsResponse.json();

    if (!vaultsData.success || !vaultsData.vaults || vaultsData.vaults.length === 0) {
      console.error("Failed to fetch vaults");
      return NextResponse.json({
        success: false,
        error: "Failed to fetch vaults",
      }, { status: 500 });
    }

    const bestVault = vaultsData.vaults[0]; // Highest APY vault
    console.log(`Best vault: ${bestVault.name} with ${(bestVault.netApy * 100).toFixed(2)}% APY`);

    // 3. Process users in batches
    const batchSize = 10;
    let totalOpportunities = 0;
    let totalSkipped = 0;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (address) => {
          try {
            // Check if user can be rebalanced
            const canRebalanceResult = await canRebalance(address);
            if (!canRebalanceResult.allowed) {
              console.log(`⏭️  Skipping ${address}: ${canRebalanceResult.reason}`);
              totalSkipped++;
              return;
            }

            // Get user's current positions
            const positionsResponse = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/user/positions?address=${address}`
            );
            const positionsData = await positionsResponse.json();

            if (!positionsData.success || !positionsData.positions || positionsData.positions.length === 0) {
              console.log(`No positions found for ${address}`);
              return;
            }

            // Check each position for rebalance opportunities
            for (const position of positionsData.positions) {
              // Skip if already in the best vault
              if (position.vaultAddress === bestVault.address || 
                  position.vaultAddress === bestVault.marketAddress) {
                console.log(`✓ ${address} already in best vault`);
                continue;
              }

              const evaluation = evaluateRebalanceOpportunity(position, bestVault);

              if (evaluation.shouldRebalance && evaluation.opportunity) {
                // Add user info to opportunity
                evaluation.opportunity.address = address;
                evaluation.opportunity.walletId = positionsData.walletId || address; // Fallback to address

                console.log(
                  `💰 Rebalance opportunity for ${address}: ` +
                  `${(evaluation.opportunity.apyDiff * 100).toFixed(2)}% APY improvement, ` +
                  `$${evaluation.opportunity.expectedYearlyGain.toFixed(2)}/year`
                );

                await addToRebalanceQueue(evaluation.opportunity);
                totalOpportunities++;
              } else {
                console.log(`⏭️  Skipping ${address}: ${evaluation.reason}`);
                totalSkipped++;
              }
            }
          } catch (error) {
            console.error(`Error processing user ${address}:`, error);
          }
        })
      );
    }

    console.log(`✅ Check complete: ${totalOpportunities} opportunities found, ${totalSkipped} skipped`);

    return NextResponse.json({
      success: true,
      usersChecked: users.length,
      opportunitiesFound: totalOpportunities,
      skipped: totalSkipped,
    });
  } catch (error) {
    console.error("Error in check-rebalances:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check rebalances",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

