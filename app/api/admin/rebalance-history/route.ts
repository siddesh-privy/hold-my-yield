import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get recent history
    const history = await kv.lrange("rebalance_history", 0, limit - 1);

    const parsedHistory = history.map((item) => JSON.parse(item as string)).map((entry) => ({
      ...entry,
      apyDiffPercent: `${(entry.apyDiff * 100).toFixed(2)}%`,
      expectedYearlyGain: `$${entry.expectedYearlyGain.toFixed(2)}`,
      executedAtFormatted: new Date(entry.executedAt).toLocaleString(),
    }));

    // Calculate stats
    const successCount = parsedHistory.filter((e) => e.success).length;
    const totalGain = parsedHistory
      .filter((e) => e.success)
      .reduce((sum, e) => sum + e.expectedYearlyGain, 0);

    return NextResponse.json({
      success: true,
      count: parsedHistory.length,
      stats: {
        total: parsedHistory.length,
        successful: successCount,
        failed: parsedHistory.length - successCount,
        successRate: `${((successCount / parsedHistory.length) * 100).toFixed(1)}%`,
        totalExpectedGain: `$${totalGain.toFixed(2)}/year`,
      },
      history: parsedHistory,
    });
  } catch (error) {
    console.error("Error fetching rebalance history:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

