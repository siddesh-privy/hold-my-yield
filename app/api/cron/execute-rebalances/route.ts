import { NextResponse } from "next/server";
import {
  getTopRebalanceJobs,
  removeFromQueue,
  recordRebalance,
  logRebalanceHistory,
} from "@/lib/rebalance-checker";
import { executeRebalance } from "@/lib/rebalance-executor";

export const maxDuration = 60; // 60 seconds max execution time

export async function GET(request: Request) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🚀 Starting rebalance execution...");

    // Get top 5 jobs from queue
    const jobs = await getTopRebalanceJobs(5);

    if (jobs.length === 0) {
      console.log("No rebalances to execute");
      return NextResponse.json({
        success: true,
        message: "No rebalances to execute",
        executed: 0,
      });
    }

    console.log(`Found ${jobs.length} rebalances to execute`);

    const results = {
      total: jobs.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each job
    for (const job of jobs) {
      try {
        console.log(`\n📊 Processing rebalance for ${job.address}`);
        console.log(`  Priority: ${job.priority.toFixed(2)}`);
        console.log(`  Amount: $${job.amountUsd.toLocaleString()}`);
        console.log(
          `  APY: ${(job.currentApy * 100).toFixed(2)}% → ${(
            job.targetApy * 100
          ).toFixed(2)}%`
        );

        // Execute the rebalance
        const result = await executeRebalance(job);

        // Log to history
        await logRebalanceHistory(job, result);

        if (result.success) {
          // Remove from queue
          await removeFromQueue(job);

          // Record rebalance (update rate limits)
          await recordRebalance(job.address);

          results.successful++;
          console.log(`✅ Rebalance successful: ${result.txHash}`);
        } else {
          results.failed++;
          results.errors.push(`${job.address}: ${result.error}`);
          console.error(`❌ Rebalance failed: ${result.error}`);

          // Still remove from queue to avoid infinite retries
          // In production, you might want retry logic here
          await removeFromQueue(job);
        }

        // Wait between transactions to avoid nonce issues
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        results.failed++;
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`${job.address}: ${errorMsg}`);
        console.error(`Error processing job for ${job.address}:`, error);

        // Remove from queue to prevent blocking
        await removeFromQueue(job);
      }
    }

    console.log(`\n✅ Execution complete:`);
    console.log(`  Total: ${results.total}`);
    console.log(`  Successful: ${results.successful}`);
    console.log(`  Failed: ${results.failed}`);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Error in execute-rebalances:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute rebalances",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
