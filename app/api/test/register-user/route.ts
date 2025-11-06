import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";

/**
 * TEST ENDPOINT: Manually register a user for auto-balancing
 * Only works in development (TESTING_MODE=true)
 * 
 * Usage: curl -X POST http://localhost:3000/api/test/register-user -H "Content-Type: application/json" -d '{"address":"0x..."}'
 */
export async function POST(request: Request) {
  // Only allow in testing mode
  if (process.env.TESTING_MODE !== "true") {
    return NextResponse.json(
      { error: "This endpoint is only available in testing mode" },
      { status: 403 }
    );
  }

  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    const lowerAddress = address.toLowerCase();

    // Add user to auto-balance set
    await kv.sadd("users:auto_balance_enabled", lowerAddress);
    
    // Initialize counters
    await kv.set(`user:last_rebalance:${lowerAddress}`, 0);
    await kv.set(`user:rebalances_today:${lowerAddress}`, 0);

    // Check registration
    const users = await kv.smembers("users:auto_balance_enabled");

    return NextResponse.json({
      success: true,
      message: `User ${address} registered for auto-balancing`,
      totalUsers: users?.length || 0,
      registeredUsers: users,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to register user",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Only allow in testing mode
  if (process.env.TESTING_MODE !== "true") {
    return NextResponse.json(
      { error: "This endpoint is only available in testing mode" },
      { status: 403 }
    );
  }

  try {
    const users = await kv.smembers("users:auto_balance_enabled");

    return NextResponse.json({
      success: true,
      totalUsers: users?.length || 0,
      users: users || [],
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}

