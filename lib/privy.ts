import { AuthorizationContext, PrivyClient } from "@privy-io/node";
import {
  USDC_ABI,
  USDC_ADDRESS,
  MORPHO_VAULT_ABI,
  MORPHO_REDEEM_ABI,
  AAVE_POOL_ABI,
  AAVE_WITHDRAW_ABI,
} from "./CONSTANTS";
import { encodeFunctionData } from "viem";
import { base } from "viem/chains";

export const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

export const authorizationContext: AuthorizationContext = {
  authorization_private_keys: [process.env.PRIVY_AUTH_KEY!],
};

export const verifyAuthToken = async (authToken: string) => {
  try {
    const strippedToken = authToken.replace("Bearer ", "");
    const verifiedClaims = await privy
      .utils()
      .auth()
      .verifyAuthToken(strippedToken);
    return verifiedClaims;
  } catch (error) {
    console.error("Failed to verify auth token:", error);
    return null;
  }
};

export const isUserWalletMatch = async (
  userId: string,
  walletId: string
): Promise<boolean> => {
  try {
    const user = await privy.users()._get(userId);

    if (!user) {
      return false;
    }

    const wallet = user.linked_accounts.find(
      (account) =>
        account.type === "wallet" && "id" in account && account.id === walletId
    );

    return !!wallet;
  } catch (error) {
    console.error("Failed to verify user wallet match:", error);
    return false;
  }
};

export const approveUSDC = async (
  walletId: string,
  amount: string,
  spender: string
): Promise<{
  success: boolean;
  hash?: string;
  caip2?: string;
  error?: unknown;
}> => {
  try {
    const encodedData = encodeFunctionData({
      abi: USDC_ABI,
      functionName: "approve",
      args: [spender as `0x${string}`, BigInt(Number(amount) * 10 ** 6)],
    });

    const { hash, caip2 } = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: `eip155:${base.id}`,
        params: {
          transaction: {
            to: USDC_ADDRESS,
            data: encodedData,
            chain_id: base.id,
          },
        },
        sponsor: true,
        authorization_context: authorizationContext,
      });

    return { success: true, hash, caip2 };
  } catch (error) {
    console.error("Failed to approve USDC:", error);
    return { success: false, error };
  }
};

export const withdrawUSDC = async (
  walletId: string,
  userAddress: string,
  amount: string,
  protocol: string,
  marketAddress: string
): Promise<{
  success: boolean;
  hash?: string;
  caip2?: string;
  error?: unknown;
}> => {
  try {
    let encodedData: `0x${string}`;

    if (protocol === "morpho") {
      encodedData = encodeFunctionData({
        abi: MORPHO_REDEEM_ABI,
        functionName: "redeem",
        args: [
          BigInt(amount),
          userAddress as `0x${string}`,
          userAddress as `0x${string}`,
        ],
      });
    } else if (protocol === "aave-v3") {
      const maxUint256 = BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      );

      encodedData = encodeFunctionData({
        abi: AAVE_WITHDRAW_ABI,
        functionName: "withdraw",
        args: [
          USDC_ADDRESS as `0x${string}`,
          maxUint256,
          userAddress as `0x${string}`,
        ],
      });
    } else {
      return { success: false, error: `Unsupported protocol: ${protocol}` };
    }

    const { hash, caip2 } = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: `eip155:${base.id}`,
        params: {
          transaction: {
            to: marketAddress,
            data: encodedData,
            chain_id: base.id,
          },
        },
        sponsor: true,
        authorization_context: authorizationContext,
      });

    return { success: true, hash, caip2 };
  } catch (error) {
    console.error("Failed to withdraw USDC:", error);
    return { success: false, error };
  }
};

export const depositUSDC = async (
  walletId: string,
  walletAddress: string,
  amount: string,
  protocol: string,
  marketAddress: string
): Promise<{
  success: boolean;
  hash?: string;
  caip2?: string;
  error?: unknown;
}> => {
  try {
    let encodedData: `0x${string}`;
    const rawAmount = BigInt(Math.floor(Number(amount) * 10 ** 6));

    if (protocol === "morpho") {
      encodedData = encodeFunctionData({
        abi: MORPHO_VAULT_ABI,
        functionName: "deposit",
        args: [rawAmount, walletAddress as `0x${string}`],
      });
    } else if (protocol === "aave-v3") {
      encodedData = encodeFunctionData({
        abi: AAVE_POOL_ABI,
        functionName: "supply",
        args: [
          USDC_ADDRESS as `0x${string}`,
          rawAmount,
          walletAddress as `0x${string}`,
          0,
        ],
      });
    } else {
      return { success: false, error: `Unsupported protocol: ${protocol}` };
    }

    const { hash, caip2 } = await privy
      .wallets()
      .ethereum()
      .sendTransaction(walletId, {
        caip2: `eip155:${base.id}`,
        params: {
          transaction: {
            to: marketAddress,
            data: encodedData,
            chain_id: base.id,
          },
        },
        sponsor: true,
        authorization_context: authorizationContext,
      });

    return { success: true, hash, caip2 };
  } catch (error) {
    console.error("Failed to deposit USDC:", error);
    return { success: false, error };
  }
};
