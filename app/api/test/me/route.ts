import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * TEST ENDPOINT: Get current user's wallet address from Privy session
 * Only works in development (TESTING_MODE=true)
 * 
 * Usage: Open http://localhost:3000/api/test/me in browser while logged in
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
    const cookieStore = await cookies();
    const privyToken = cookieStore.get("privy-token")?.value;
    const privyIdToken = cookieStore.get("privy-id-token")?.value;

    if (!privyToken && !privyIdToken) {
      return NextResponse.json(
        { 
          error: "Not authenticated",
          message: "Please log in first at http://localhost:3000"
        },
        { status: 401 }
      );
    }

    // Decode the JWT to get user info (basic decode, not verified)
    let decodedToken;
    try {
      const tokenToDecode = privyIdToken || privyToken;
      
      if (!tokenToDecode) {
        return NextResponse.json({
          error: "No token found",
          message: "Try using the browser Network tab to find your address in API calls"
        });
      }
      
      const base64Url = tokenToDecode.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      decodedToken = JSON.parse(jsonPayload);
    } catch (e) {
      return NextResponse.json({
        error: "Could not decode token",
        message: "Try using the browser Network tab to find your address in API calls"
      });
    }

    return NextResponse.json({
      success: true,
      message: "Copy the address below and use it to register",
      userId: decodedToken.sub || decodedToken.userId,
      token: decodedToken,
      instructions: [
        "1. Copy the address from the response",
        "2. Run: curl -X POST http://localhost:3000/api/test/register-user -H 'Content-Type: application/json' -d '{\"address\":\"YOUR_ADDRESS\"}'",
        "3. Verify: curl http://localhost:3000/api/test/register-user",
        "4. Test: curl http://localhost:3000/api/test/trigger-rebalance"
      ]
    });
  } catch (error) {
    console.error("Error getting user info:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get user info",
        message: error instanceof Error ? error.message : "Unknown error",
        fallback: "Check browser Network tab for /api/user/positions?address=YOUR_ADDRESS"
      },
      { status: 500 }
    );
  }
}

