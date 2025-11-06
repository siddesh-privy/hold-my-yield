import { NextResponse } from "next/server";
import { getTopRebalanceJobs } from "@/lib/rebalance-checker";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const jobs = await getTopRebalanceJobs(limit);

    return NextResponse.json({
      success: true,
      count: jobs.length,
      jobs: jobs.map((job) => ({
        ...job,
        apyDiffPercent: `${(job.apyDiff * 100).toFixed(2)}%`,
        expectedYearlyGain: `$${job.expectedYearlyGain.toFixed(2)}`,
        timeSinceCreated: `${Math.round((Date.now() - job.timestamp) / 1000 / 60)}m ago`,
      })),
    });
  } catch (error) {
    console.error("Error fetching rebalance queue:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch queue" },
      { status: 500 }
    );
  }
}

