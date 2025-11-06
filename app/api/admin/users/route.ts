import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  try {
    // Get all users with auto-balancer enabled
    const users = await kv.smembers<string>("users:auto_balance_enabled");

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (address) => {
        const lastRebalance = await kv.get<number>(`user:last_rebalance:${address}`);
        const today = new Date().toISOString().split("T")[0];
        const dailyCount = await kv.get<number>(`user:rebalance_count:${address}:${today}`) || 0;

        return {
          address,
          lastRebalance: lastRebalance
            ? new Date(lastRebalance).toLocaleString()
            : "Never",
          rebalancesToday: dailyCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      count: users?.length || 0,
      users: usersWithStats,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

