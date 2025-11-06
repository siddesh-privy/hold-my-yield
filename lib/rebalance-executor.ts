import { privyServer, authorizationContext } from "./privy-server";
import { encodeFunctionData, maxUint256 } from "viem";
import {
  USDC_ABI,
  MORPHO_VAULT_ABI,
  AAVE_POOL_ABI,
  BASE_ADDRESSES,
  BASE_CHAIN_ID,
} from "./vault-abis";
import type { RebalanceOpportunity } from "./rebalance-checker";

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  step?: string;
}

/**
 * Check and approve USDC spending if needed
 */
async function ensureUSDCApproval(
  walletId: string,
  spender: string
): Promise<TransactionResult> {
  try {
    console.log(`Approving ${spender} to spend USDC...`);

    const approveData = encodeFunctionData({
      abi: USDC_ABI,
      functionName: "approve",
      args: [spender as `0x${string}`, maxUint256],
    });

    const result = await privyServer
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: `eip155:${BASE_CHAIN_ID}`,
        params: {
          transaction: {
            to: BASE_ADDRESSES.USDC,
            data: approveData,
            chain_id: BASE_CHAIN_ID,
          },
        },
        sponsor: true, // Privy sponsors gas fees
        authorization_context: authorizationContext,
      });

    console.log(`✅ Approval tx: ${result.hash}`);

    // Wait a bit for approval to be mined
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      success: true,
      txHash: result.hash,
      step: "approval",
    };
  } catch (error) {
    console.error("Approval failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Approval failed",
      step: "approval",
    };
  }
}

/**
 * Deposit USDC into Morpho vault
 */
async function depositToMorpho(
  walletId: string,
  walletAddress: string,
  vaultAddress: string,
  amount: string
): Promise<TransactionResult> {
  try {
    console.log(`Depositing ${amount} USDC to Morpho vault ${vaultAddress}...`);

    // Approve vault to spend USDC
    const approvalResult = await ensureUSDCApproval(walletId, vaultAddress);
    if (!approvalResult.success) {
      return approvalResult;
    }

    // Deposit to vault
    const depositData = encodeFunctionData({
      abi: MORPHO_VAULT_ABI,
      functionName: "deposit",
      args: [BigInt(amount), walletAddress as `0x${string}`],
    });

    const result = await privyServer
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: `eip155:${BASE_CHAIN_ID}`,
        params: {
          transaction: {
            to: vaultAddress,
            data: depositData,
            chain_id: BASE_CHAIN_ID,
          },
        },
        sponsor: true, // Privy sponsors gas fees
        authorization_context: authorizationContext,
      });

    console.log(`✅ Morpho deposit tx: ${result.hash}`);

    return {
      success: true,
      txHash: result.hash,
      step: "deposit",
    };
  } catch (error) {
    console.error("Morpho deposit failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Deposit failed",
      step: "deposit",
    };
  }
}

/**
 * Withdraw USDC from Morpho vault
 */
async function withdrawFromMorpho(
  walletId: string,
  walletAddress: string,
  vaultAddress: string,
  amount: string
): Promise<TransactionResult> {
  try {
    console.log(
      `Withdrawing ${amount} USDC from Morpho vault ${vaultAddress}...`
    );

    const withdrawData = encodeFunctionData({
      abi: MORPHO_VAULT_ABI,
      functionName: "withdraw",
      args: [
        BigInt(amount),
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
            to: vaultAddress,
            data: withdrawData,
            chain_id: BASE_CHAIN_ID,
          },
        },
        sponsor: true, // Privy sponsors gas fees
        authorization_context: authorizationContext,
      });

    console.log(`✅ Morpho withdraw tx: ${result.hash}`);

    return {
      success: true,
      txHash: result.hash,
      step: "withdraw",
    };
  } catch (error) {
    console.error("Morpho withdraw failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Withdraw failed",
      step: "withdraw",
    };
  }
}

/**
 * Deposit USDC into Aave V3
 */
async function depositToAave(
  walletId: string,
  walletAddress: string,
  amount: string
): Promise<TransactionResult> {
  try {
    console.log(`Depositing ${amount} USDC to Aave V3...`);

    // Approve Aave pool to spend USDC
    const approvalResult = await ensureUSDCApproval(
      walletId,
      BASE_ADDRESSES.AAVE_POOL
    );
    if (!approvalResult.success) {
      return approvalResult;
    }

    // Supply to Aave
    const supplyData = encodeFunctionData({
      abi: AAVE_POOL_ABI,
      functionName: "supply",
      args: [
        BASE_ADDRESSES.USDC as `0x${string}`,
        BigInt(amount),
        walletAddress as `0x${string}`,
        0, // referralCode
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
            data: supplyData,
            chain_id: BASE_CHAIN_ID,
          },
        },
        sponsor: true, // Privy sponsors gas fees
        authorization_context: authorizationContext,
      });

    console.log(`✅ Aave deposit tx: ${result.hash}`);

    return {
      success: true,
      txHash: result.hash,
      step: "deposit",
    };
  } catch (error) {
    console.error("Aave deposit failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Deposit failed",
      step: "deposit",
    };
  }
}

/**
 * Withdraw USDC from Aave V3
 */
async function withdrawFromAave(
  walletId: string,
  walletAddress: string,
  amount: string
): Promise<TransactionResult> {
  try {
    console.log(`Withdrawing ${amount} USDC from Aave V3...`);

    const withdrawData = encodeFunctionData({
      abi: AAVE_POOL_ABI,
      functionName: "withdraw",
      args: [
        BASE_ADDRESSES.USDC as `0x${string}`,
        BigInt(amount),
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
        sponsor: true, // Privy sponsors gas fees
        authorization_context: authorizationContext,
      });

    console.log(`✅ Aave withdraw tx: ${result.hash}`);

    return {
      success: true,
      txHash: result.hash,
      step: "withdraw",
    };
  } catch (error) {
    console.error("Aave withdraw failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Withdraw failed",
      step: "withdraw",
    };
  }
}

/**
 * Execute a complete rebalance: withdraw from old vault, deposit to new vault
 */
export async function executeRebalance(
  opportunity: RebalanceOpportunity
): Promise<TransactionResult> {
  try {
    console.log(`\n🔄 Executing rebalance for ${opportunity.address}`);
    console.log(
      `  From: ${opportunity.fromProtocol} (${opportunity.fromVault})`
    );
    console.log(`  To: ${opportunity.toProtocol} (${opportunity.toVault})`);
    console.log(`  Amount: $${opportunity.amountUsd} USDC`);

    // Step 1: Withdraw from current vault
    let withdrawResult: TransactionResult;

    if (opportunity.fromProtocol === "morpho") {
      withdrawResult = await withdrawFromMorpho(
        opportunity.walletId,
        opportunity.address,
        opportunity.fromVault,
        opportunity.amount
      );
    } else {
      withdrawResult = await withdrawFromAave(
        opportunity.walletId,
        opportunity.address,
        opportunity.amount
      );
    }

    if (!withdrawResult.success) {
      return {
        success: false,
        error: `Withdraw failed: ${withdrawResult.error}`,
        step: "withdraw",
      };
    }

    // Wait for withdraw to be mined
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 2: Deposit to new vault
    let depositResult: TransactionResult;

    if (opportunity.toProtocol === "morpho") {
      depositResult = await depositToMorpho(
        opportunity.walletId,
        opportunity.address,
        opportunity.toVault,
        opportunity.amount
      );
    } else {
      depositResult = await depositToAave(
        opportunity.walletId,
        opportunity.address,
        opportunity.amount
      );
    }

    if (!depositResult.success) {
      return {
        success: false,
        error: `Deposit failed: ${depositResult.error}`,
        step: "deposit",
        txHash: withdrawResult.txHash, // Include withdraw tx
      };
    }

    console.log(`✅ Rebalance complete!`);
    console.log(`  Withdraw tx: ${withdrawResult.txHash}`);
    console.log(`  Deposit tx: ${depositResult.txHash}`);

    return {
      success: true,
      txHash: depositResult.txHash,
      step: "complete",
    };
  } catch (error) {
    console.error("Rebalance execution failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      step: "unknown",
    };
  }
}

/**
 * Deposit all available USDC balance into the best vault
 * Called when user initially enables auto-balancer
 */
export async function initialDeposit(
  walletId: string,
  walletAddress: string,
  usdcBalance: string, // Raw USDC amount (6 decimals)
  bestVault: {
    protocol: "morpho" | "aave-v3";
    address: string;
  }
): Promise<TransactionResult> {
  try {
    console.log(`\n💰 Initial deposit for ${walletAddress}`);
    console.log(`  Amount: ${parseFloat(usdcBalance) / 1e6} USDC`);
    console.log(`  Vault: ${bestVault.protocol} (${bestVault.address})`);

    if (bestVault.protocol === "morpho") {
      return await depositToMorpho(
        walletId,
        walletAddress,
        bestVault.address,
        usdcBalance
      );
    } else {
      return await depositToAave(walletId, walletAddress, usdcBalance);
    }
  } catch (error) {
    console.error("Initial deposit failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Initial deposit failed",
      step: "initial_deposit",
    };
  }
}
