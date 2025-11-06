import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import {
  canRebalance,
  evaluateRebalanceOpportunity,
  addToRebalanceQueue,
  getTopRebalanceJobs,
  removeFromQueue,
  recordRebalance,
  logRebalanceHistory,
  type RebalanceOpportunity,
} from "@/lib/rebalance-checker";
import { executeRebalance } from "@/lib/rebalance-executor";

export const maxDuration = 300; // 5 minutes max execution time

/**
 * Combined cron job that checks for rebalance opportunities and executes them
 * Runs once daily on Hobby plan
 */
export async function GET(request: Request) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🤖 Starting combined auto-rebalance job...");

    // PHASE 1: CHECK FOR REBALANCE OPPORTUNITIES
    console.log("\n📊 Phase 1: Checking for opportunities...");

    const users = await kv.smembers("users:auto_balance_enabled");
    
    if (!users || users.length === 0) {
      console.log("No users with auto-balancer enabled");
      return NextResponse.json({
        success: true,
        message: "No users to check",
        usersChecked: 0,
        opportunitiesFound: 0,
        rebalancesExecuted: 0,
      });
    }

    console.log(`Found ${users.length} users with auto-balancer enabled`);

    // Get current best vaults
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

    const bestVault = vaultsData.vaults[0];
    console.log(`Best vault: ${bestVault.name} with ${(bestVault.netApy * 100).toFixed(2)}% APY`);

    let opportunitiesFound = 0;
    let skipped = 0;

    // Check users in batches
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (address) => {
          try {
            const canRebalanceResult = await canRebalance(address as string);
            if (!canRebalanceResult.allowed) {
              console.log(`⏭️  Skipping ${address}: ${canRebalanceResult.reason}`);
              skipped++;
              return;
            }

            // Fetch user positions
            const positionsResponse = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/user/positions?address=${address}`
            );
            const positionsData = await positionsResponse.json();

            // Get wallet ID from linked accounts
            const privyResponse = await fetch(
              `https://api.privy.io/v1/users/${address}`,
              {
                headers: {
                  "Authorization": `Basic ${btoa(`${process.env.NEXT_PUBLIC_PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`)}`,
                },
              }
            );
            
            let walletId: string | undefined;
            if (privyResponse.ok) {
              const userData = await privyResponse.json();
              const embeddedWalletAccount = userData.linkedAccounts?.find(
                (account: any) => account.type === "wallet" && account.address?.toLowerCase() === (address as string).toLowerCase()
              );
              walletId = embeddedWalletAccount?.id;
            }

            // Check if user has wallet balance to deposit
            if (walletId) {
              const balanceResponse = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/user/balance?walletId=${walletId}`
              );
              const balanceData = await balanceResponse.json();

              if (balanceData.success && balanceData.balance) {
                const walletBalance = parseFloat(balanceData.balance.raw) / 1e6;
                
                // If wallet has > $1 USDC, create deposit opportunity
                if (walletBalance >= 1) {
                  console.log(`💵 ${address} has $${walletBalance.toFixed(2)} in wallet - creating deposit opportunity`);
                  
                  const depositOpportunity: RebalanceOpportunity = {
                    address: address as string,
                    walletId: walletId,
                    fromProtocol: "wallet" as any, // Special case for wallet deposits
                    fromVault: "wallet",
                    toProtocol: bestVault.protocol,
                    toVault: bestVault.address || bestVault.marketAddress,
                    amountUsd: walletBalance,
                    amountRaw: balanceData.balance.raw,
                    currentApy: 0, // No yield in wallet
                    targetApy: bestVault.netApy,
                    apyDiff: bestVault.netApy,
                    expectedYearlyGain: walletBalance * bestVault.netApy,
                    priority: 1000, // High priority for deposits
                    timestamp: Date.now(),
                  };

                  await addToRebalanceQueue(depositOpportunity);
                  opportunitiesFound++;
                }
              }
            }

            // Check existing positions for rebalancing
            if (!positionsData.success || !positionsData.positions || positionsData.positions.length === 0) {
              return;
            }

            for (const position of positionsData.positions) {
              if (position.vaultAddress === bestVault.address || 
                  position.vaultAddress === bestVault.marketAddress) {
                continue;
              }

              const evaluation = evaluateRebalanceOpportunity(position, bestVault);

              if (evaluation.shouldRebalance && evaluation.opportunity) {
                evaluation.opportunity.address = address as string;
                evaluation.opportunity.walletId = walletId || address as string;

                console.log(
                  `💰 Opportunity for ${address}: ` +
                  `${(evaluation.opportunity.apyDiff * 100).toFixed(2)}% APY improvement`
                );

                await addToRebalanceQueue(evaluation.opportunity);
                opportunitiesFound++;
              } else {
                skipped++;
              }
            }
          } catch (error) {
            console.error(`Error processing user ${address}:`, error);
          }
        })
      );
    }

    console.log(`✅ Check complete: ${opportunitiesFound} opportunities found, ${skipped} skipped`);

    // PHASE 2: EXECUTE REBALANCES
    console.log("\n🚀 Phase 2: Executing rebalances...");

    const jobs = await getTopRebalanceJobs(10); // Process up to 10 rebalances per day

    if (jobs.length === 0) {
      console.log("No rebalances to execute");
      return NextResponse.json({
        success: true,
        usersChecked: users.length,
        opportunitiesFound,
        skipped,
        rebalancesExecuted: 0,
      });
    }

    console.log(`Found ${jobs.length} rebalances to execute`);

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const job of jobs) {
      try {
        console.log(`\n📊 Processing rebalance for ${job.address}`);
        console.log(`  Amount: $${job.amountUsd.toLocaleString()}`);
        console.log(`  APY: ${(job.currentApy * 100).toFixed(2)}% → ${(job.targetApy * 100).toFixed(2)}%`);

        // Handle wallet deposits (from wallet to vault)
        let result;
        if (job.fromProtocol === "wallet" && job.fromVault === "wallet") {
          // This is a deposit from wallet, use the initial deposit logic
          const { initialDeposit } = await import("@/lib/rebalance-executor");
          result = await initialDeposit(
            job.walletId,
            job.address,
            job.amountRaw,
            {
              protocol: job.toProtocol,
              address: job.toVault,
            }
          );
        } else {
          // Normal rebalance between vaults
          result = await executeRebalance(job);
        }

        await logRebalanceHistory(job, result);

        if (result.success) {
          await removeFromQueue(job);
          await recordRebalance(job.address);
          results.successful++;
          console.log(`✅ Rebalance successful: ${result.txHash}`);
        } else {
          results.failed++;
          results.errors.push(`${job.address}: ${result.error}`);
          console.error(`❌ Rebalance failed: ${result.error}`);
          await removeFromQueue(job);
        }

        // Wait between transactions
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`${job.address}: ${errorMsg}`);
        console.error(`Error processing job for ${job.address}:`, error);
        await removeFromQueue(job);
      }
    }

    console.log(`\n✅ Auto-rebalance complete!`);
    console.log(`  Users checked: ${users.length}`);
    console.log(`  Opportunities found: ${opportunitiesFound}`);
    console.log(`  Rebalances executed: ${results.successful}`);
    console.log(`  Failed: ${results.failed}`);

    return NextResponse.json({
      success: true,
      usersChecked: users.length,
      opportunitiesFound,
      skipped,
      rebalancesExecuted: results.successful,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Error in auto-rebalance:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to complete auto-rebalance",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

