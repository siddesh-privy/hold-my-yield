import { NextResponse } from "next/server";

/**
 * TEST ENDPOINT: Manually trigger the auto-rebalance job
 * Only works in development (TESTING_MODE=true)
 * 
 * Usage: curl http://localhost:3000/api/test/trigger-rebalance
 */
export async function GET() {
  // Only allow in testing mode
  if (process.env.TESTING_MODE !== "true") {
    return NextResponse.json(
      { error: "This endpoint is only available in testing mode" },
      { status: 403 }
    );
  }

  try {
    console.log("🧪 Manual rebalance trigger (TEST MODE)");

    // Call the actual cron endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/cron/auto-rebalance`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      }
    );

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "Rebalance job triggered manually",
      result: data,
    });
  } catch (error) {
    console.error("Error triggering rebalance:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to trigger rebalance",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

