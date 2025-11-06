import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Address required" },
        { status: 400 }
      );
    }

    // Remove user from auto-balance set
    await kv.srem("users:auto_balance_enabled", address.toLowerCase());

    console.log(`User ${address} unregistered from auto-balancing`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unregistering user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to unregister" },
      { status: 500 }
    );
  }
}
