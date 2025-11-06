import { kv } from "@vercel/kv";

export interface RebalanceOpportunity {
  address: string;
  walletId: string;
  positionId: string;
  fromProtocol: "morpho" | "aave-v3";
  fromVault: string;
  toProtocol: "morpho" | "aave-v3";
  toVault: string;
  amount: string; // Raw USDC amount
  amountUsd: number;
  currentApy: number;
  targetApy: number;
  apyDiff: number;
  expectedYearlyGain: number; // In USD
  priority: number;
  timestamp: number;
}

export const REBALANCE_CONFIG = {
  minApyDifference: 0.005, // 0.5% minimum APY improvement
  minTimeBetweenRebalances: 12 * 60 * 60 * 1000, // 12 hours in ms
  minProfitMultiplier: 3, // Expected gain must be 3x gas cost
  maxRebalancesPerDay: 2,
  minPositionSize: 100, // $100 minimum
  gasEstimate: 0.10, // $0.10 estimated gas cost on Base
};

export async function canRebalance(address: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // Check last rebalance time
  const lastRebalanceTime = await kv.get<number>(`user:last_rebalance:${address}`);
  if (lastRebalanceTime) {
    const timeSince = Date.now() - lastRebalanceTime;
    if (timeSince < REBALANCE_CONFIG.minTimeBetweenRebalances) {
      return {
        allowed: false,
        reason: `Too soon since last rebalance (${Math.round(timeSince / 1000 / 60)} min ago)`,
      };
    }
  }

  // Check daily rebalance count
  const today = new Date().toISOString().split("T")[0];
  const dailyCount = await kv.get<number>(`user:rebalance_count:${address}:${today}`) || 0;
  if (dailyCount >= REBALANCE_CONFIG.maxRebalancesPerDay) {
    return {
      allowed: false,
      reason: `Max rebalances per day reached (${dailyCount})`,
    };
  }

  return { allowed: true };
}

export function evaluateRebalanceOpportunity(
  position: any,
  bestVault: any
): { shouldRebalance: boolean; opportunity?: RebalanceOpportunity; reason?: string } {
  const apyDiff = bestVault.netApy - position.currentApy;

  // Check minimum APY difference
  if (apyDiff < REBALANCE_CONFIG.minApyDifference) {
    return {
      shouldRebalance: false,
      reason: `APY difference too small (${(apyDiff * 100).toFixed(2)}%)`,
    };
  }

  // Check minimum position size
  if (position.deposited.usd < REBALANCE_CONFIG.minPositionSize) {
    return {
      shouldRebalance: false,
      reason: `Position too small ($${position.deposited.usd})`,
    };
  }

  // Calculate expected gains
  const yearlyGain = position.deposited.usd * apyDiff;
  const expectedGainBeforeNextRebalance =
    (yearlyGain / 365) *
    (REBALANCE_CONFIG.minTimeBetweenRebalances / (24 * 60 * 60 * 1000));

  // Check profitability
  if (
    expectedGainBeforeNextRebalance <
    REBALANCE_CONFIG.gasEstimate * REBALANCE_CONFIG.minProfitMultiplier
  ) {
    return {
      shouldRebalance: false,
      reason: `Not profitable enough (expected $${expectedGainBeforeNextRebalance.toFixed(2)} vs $${(REBALANCE_CONFIG.gasEstimate * REBALANCE_CONFIG.minProfitMultiplier).toFixed(2)} threshold)`,
    };
  }

  // Calculate priority score (higher = more important)
  const priority =
    expectedGainBeforeNextRebalance * 100 + // More profit = higher priority
    (position.deposited.usd / 100) + // Larger positions = higher priority
    apyDiff * 10000; // Better APY diff = higher priority

  const opportunity: RebalanceOpportunity = {
    address: "", // Will be set by caller
    walletId: "", // Will be set by caller
    positionId: position.id,
    fromProtocol: position.protocol,
    fromVault: position.vaultAddress,
    toProtocol: bestVault.protocol,
    toVault: bestVault.marketAddress || bestVault.address,
    amount: position.deposited.amount,
    amountUsd: position.deposited.usd,
    currentApy: position.currentApy,
    targetApy: bestVault.netApy,
    apyDiff,
    expectedYearlyGain: yearlyGain,
    priority,
    timestamp: Date.now(),
  };

  return { shouldRebalance: true, opportunity };
}

export async function addToRebalanceQueue(opportunity: RebalanceOpportunity) {
  // Add to sorted set (sorted by priority, higher = better)
  await kv.zadd("rebalance_queue", {
    score: opportunity.priority,
    member: JSON.stringify(opportunity),
  });
}

export async function getTopRebalanceJobs(count: number = 5): Promise<RebalanceOpportunity[]> {
  // Get top items from queue (highest priority first)
  const items = await kv.zrange("rebalance_queue", 0, count - 1, {
    rev: true, // Highest score first
  });

  return items.map((item) => JSON.parse(item));
}

export async function removeFromQueue(opportunity: RebalanceOpportunity) {
  await kv.zrem("rebalance_queue", JSON.stringify(opportunity));
}

export async function recordRebalance(address: string) {
  // Update last rebalance time
  await kv.set(`user:last_rebalance:${address}`, Date.now());

  // Increment daily count
  const today = new Date().toISOString().split("T")[0];
  const currentCount = await kv.get<number>(`user:rebalance_count:${address}:${today}`) || 0;
  await kv.set(`user:rebalance_count:${address}:${today}`, currentCount + 1, {
    ex: 86400, // Expire after 24 hours
  });
}

export async function logRebalanceHistory(
  opportunity: RebalanceOpportunity,
  result: { success: boolean; txHash?: string; error?: string }
) {
  const historyEntry = {
    ...opportunity,
    ...result,
    executedAt: Date.now(),
  };

  // Add to history list (keep last 1000 entries)
  await kv.lpush("rebalance_history", JSON.stringify(historyEntry));
  await kv.ltrim("rebalance_history", 0, 999);
}

