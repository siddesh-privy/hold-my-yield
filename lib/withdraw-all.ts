import { privyServer, authorizationContext } from "./privy-server";
import { encodeFunctionData } from "viem";
import {
  MORPHO_VAULT_ABI,
  AAVE_POOL_ABI,
  BASE_ADDRESSES,
  BASE_CHAIN_ID,
} from "./vault-abis";
import type { UserPosition } from "@/app/api/user/positions/route";

interface WithdrawAllResult {
  success: boolean;
  transactions?: string[];
  error?: string;
}

/**
 * Withdraw from all user positions (Morpho and Aave)
 */
export async function executeWithdrawAll(
  walletId: string,
  walletAddress: string,
  positions: UserPosition[]
): Promise<WithdrawAllResult> {
  const transactions: string[] = [];
  const errors: string[] = [];

  try {
    for (const position of positions) {
      try {
        if (position.protocol === "morpho") {
          // Withdraw from Morpho vault
          // Convert amount to BigInt (remove decimals from string)
          const amountBigInt = BigInt(
            position.deposited.amount.replace(".", "").split(".")[0]
          );

          const withdrawData = encodeFunctionData({
            abi: MORPHO_VAULT_ABI,
            functionName: "withdraw",
            args: [
              amountBigInt,
              walletAddress as `0x${string}`,
              walletAddress as `0x${string}`,
            ],
          });

          const result = await privyServer
            .wallets()
            .ethereum()
            .sendTransaction(walletId, {
              caip2: `eip155:${BASE_CHAIN_ID}`,
              params: {
                transaction: {
                  to: position.vaultAddress as `0x${string}`,
                  data: withdrawData,
                  chain_id: BASE_CHAIN_ID,
                },
              },
              sponsor: true,
              authorization_context: authorizationContext,
            });

          transactions.push(result.hash);
        } else if (position.protocol === "aave-v3") {
          // Withdraw from Aave
          // For Aave, amount should be in USDC's smallest unit (6 decimals)
          const amountInSmallestUnit = BigInt(
            Math.floor(position.deposited.usd * 1e6)
          );

          const withdrawData = encodeFunctionData({
            abi: AAVE_POOL_ABI,
            functionName: "withdraw",
            args: [
              BASE_ADDRESSES.USDC,
              amountInSmallestUnit,
              walletAddress as `0x${string}`,
            ],
          });

          const result = await privyServer
            .wallets()
            .ethereum()
            .sendTransaction(walletId, {
              caip2: `eip155:${BASE_CHAIN_ID}`,
              params: {
                transaction: {
                  to: BASE_ADDRESSES.AAVE_POOL,
                  data: withdrawData,
                  chain_id: BASE_CHAIN_ID,
                },
              },
              sponsor: true,
              authorization_context: authorizationContext,
            });

          transactions.push(result.hash);
        }

        // Wait a bit between transactions
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${position.protocol}: ${errorMsg}`);
        // Continue with other positions even if one fails
      }
    }

    if (transactions.length === 0) {
      return {
        success: false,
        error: `No withdrawals succeeded. Errors: ${errors.join(", ")}`,
      };
    }

    return {
      success: true,
      transactions,
    };
  } catch (error) {
    console.error("Error in executeWithdrawAll:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Withdrawal failed",
    };
  }
}
