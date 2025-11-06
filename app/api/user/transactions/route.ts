import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";

export interface Transaction {
  id: string;
  hash: string;
  type: "deposit" | "withdraw" | "rebalance";
  protocol: "morpho" | "aave-v3";
  amount: string;
  amountUsd: number;
  from?: string; // For rebalances
  to?: string; // For rebalances
  vaultAddress: string;
  vaultName: string;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
}

/**
 * Get user transaction history from Redis
 * Transactions are stored when executed via backend
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("address");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: "Address parameter is required" },
        { status: 400 }
      );
    }

    // Get transactions from Redis list
    const txKey = `user:transactions:${userAddress.toLowerCase()}`;
    const txData = await kv.lrange(txKey, 0, limit - 1);

    const transactions: Transaction[] = txData
      .map((item) => {
        try {
          return JSON.parse(item as string) as Transaction;
        } catch (error) {
          console.error("Error parsing transaction:", error);
          return null;
        }
      })
      .filter((tx): tx is Transaction => tx !== null)
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

    return NextResponse.json({
      success: true,
      address: userAddress,
      transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch transactions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Store a new transaction
 */
export async function POST(request: Request) {
  try {
    const transaction: Transaction = await request.json();

    if (!transaction.hash || !transaction.type) {
      return NextResponse.json(
        { success: false, error: "Invalid transaction data" },
        { status: 400 }
      );
    }

    // Extract user address from the transaction (assuming it's in the hash or vault)
    // In practice, you'd pass this as a parameter
    const { userAddress } = await request.json();
    
    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: "User address is required" },
        { status: 400 }
      );
    }

    const txKey = `user:transactions:${userAddress.toLowerCase()}`;
    
    // Add to list (newest at front)
    await kv.lpush(txKey, JSON.stringify(transaction));
    
    // Keep only last 100 transactions
    await kv.ltrim(txKey, 0, 99);

    console.log(`📝 Transaction stored for ${userAddress}:`, {
      hash: transaction.hash,
      type: transaction.type,
      protocol: transaction.protocol,
      amount: transaction.amountUsd,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error storing transaction:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to store transaction",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

