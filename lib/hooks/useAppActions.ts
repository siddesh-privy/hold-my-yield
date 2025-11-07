"use client";
import { useState, useEffect } from "react";
import {
  usePrivy,
  useFundWallet,
  useSessionSigners,
  useWallets,
  useSendTransaction,
} from "@privy-io/react-auth";
import { base } from "viem/chains";
import type { Vault } from "@/app/api/vaults/route";
import type { UserPosition } from "@/app/api/user/positions/route";
import type { Transaction } from "@/app/api/user/transactions/route";
import { encodeFunctionData } from "viem";
import { USDC_ABI, USDC_ADDRESS } from "../CONSTANTS";

export function useAppActions() {
  const { user, logout, getAccessToken } = usePrivy();
  const { addSessionSigners, removeSessionSigners } = useSessionSigners();
  const { wallets } = useWallets();

  const { sendTransaction } = useSendTransaction({
    onSuccess: () => {
      fetchBalance();
    },
  });
  // State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showVaultsModal, setShowVaultsModal] = useState(false);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [vaultsLoading, setVaultsLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState("0.00");
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [bestAvailableApy, setBestAvailableApy] = useState(0);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [positionLoading, setPositionLoading] = useState(true);
  const [closingPosition, setClosingPosition] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [isCheckingDelegation, setIsCheckingDelegation] = useState(true);
  const [enablingAutoBalancer, setEnablingAutoBalancer] = useState(false);
  const [autoBalancerJustEnabled, setAutoBalancerJustEnabled] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [depositingToVault, setDepositingToVault] = useState(false);
  const [waitingForDeposit, setWaitingForDeposit] = useState(false);
  const [waitingForWithdrawal, setWaitingForWithdrawal] = useState(false);

  // Computed values
  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );

  const embeddedWalletAccount = user?.linkedAccounts?.find(
    (account) =>
      account.type === "wallet" && account.address === embeddedWallet?.address
  );

  const walletId =
    embeddedWalletAccount && "id" in embeddedWalletAccount
      ? embeddedWalletAccount.id
      : undefined;

  const autoBalancerEnabled =
    embeddedWalletAccount &&
    "delegated" in embeddedWalletAccount &&
    embeddedWalletAccount.delegated === true;

  // Once we have user data, wallet, and the account info with delegation status, we're done checking
  useEffect(() => {
    if (user && wallets.length > 0 && embeddedWalletAccount) {
      // Make sure the account has the delegation property loaded
      if ("delegated" in embeddedWalletAccount) {
        setIsCheckingDelegation(false);
      }
    }
  }, [user, wallets, embeddedWalletAccount]);

  // Show onboarding if:
  // 1. Auto-balancer not enabled (new user), OR
  // 2. Auto-balancer just enabled but onboarding not completed yet (stay until step 3)
  const showOnboarding =
    !isCheckingDelegation &&
    (!autoBalancerEnabled || (autoBalancerJustEnabled && !onboardingCompleted));

  // Methods
  const fetchBalance = async () => {
    if (!walletId) {
      setBalanceLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/user/balance?walletId=${walletId}`);
      const data = await response.json();

      if (data.success) {
        setWalletBalance(data.balance.formatted);
      } else {
        console.error("Balance API returned success=false:", data);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const { fundWallet } = useFundWallet({
    onUserExited: () => {
      fetchBalance();
    },
  });

  const handleFundWallet = () => {
    if (!embeddedWallet?.address) return;
    fundWallet({
      address: embeddedWallet.address,
      options: {
        chain: base,
        asset: "USDC",
        amount: "10",
      },
    });
  };

  const handleEnableAutoBalancer = async () => {
    if (!embeddedWallet?.address) return;

    setEnablingAutoBalancer(true);
    try {
      await addSessionSigners({
        address: embeddedWallet.address,
        signers: [
          {
            signerId: process.env.NEXT_PUBLIC_SESSION_SIGNER_ID!,
            policyIds: [],
          },
        ],
      });
      setAutoBalancerJustEnabled(true);
      // Complete onboarding after enabling auto-balancer
      setTimeout(() => {
        setOnboardingCompleted(true);
      }, 2000); // Give user time to see the success message
    } catch (error) {
      console.error("Failed to enable auto balancer:", error);
    } finally {
      setEnablingAutoBalancer(false);
    }
  };

  const handleDisableAutoBalancer = async () => {
    if (!embeddedWallet?.address) return;

    try {
      await removeSessionSigners({
        address: embeddedWallet.address,
      });
    } catch (error) {
      console.error("Failed to disable auto balancer:", error);
    }
  };

  const handleToggleAutoBalancer = () => {
    if (autoBalancerEnabled) {
      handleDisableAutoBalancer();
    } else {
      handleEnableAutoBalancer();
    }
  };

  const handleDepositToVault = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.error("No access token found");
      return;
    }

    if (!embeddedWallet?.address || !walletId) return;

    if (vaults.length === 0) {
      console.error("No vaults available");
      return;
    }

    setDepositingToVault(true);

    const highestApyVault = vaults.reduce((highest, current) => {
      return current.netApy > highest.netApy ? current : highest;
    }, vaults[0]);

    // Start polling for deposit to appear
    setWaitingForDeposit(true);

    // Fire and forget - let the API call happen in background
    fetch("/api/vaults/deposit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletId,
        market: highestApyVault.protocol,
        marketId: highestApyVault.marketAddress,
        amount: walletBalance,
        walletAddress: embeddedWallet.address,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) {
          console.error("Deposit failed:", data);
        }
      })
      .catch((error) => {
        console.error("Failed to deposit to vault:", error);
      })
      .finally(() => {
        setDepositingToVault(false);
      });
  };

  const handleWithdrawSubmit = async (address: string, amount: string) => {
    if (!embeddedWallet?.address) return;

    try {
      const data = encodeFunctionData({
        abi: USDC_ABI,
        functionName: "transfer",
        args: [address as `0x${string}`, BigInt(Number(amount) * 10 ** 6)],
      });

      await sendTransaction(
        {
          to: USDC_ADDRESS,
          data,
          value: 0,
          chainId: base.id,
        },
        {
          sponsor: true,
        }
      );
      setShowWithdrawModal(false);
    } catch (error) {
      console.error("Failed to withdraw:", error);
    }
  };

  const handleClosePosition = async () => {
    if (!walletId || !userPosition || !embeddedWallet?.address) {
      console.error("Missing required data for closing position");
      return;
    }

    setClosingPosition(true);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.error("Failed to get access token");
        setClosingPosition(false);
        return;
      }

      // Withdraw from vault (funds will go back to the embedded wallet)
      const withdrawResponse = await fetch("/api/vaults/withdraw", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletId,
          protocol: userPosition.protocol,
          marketAddress: userPosition.vaultAddress,
          amount: userPosition.deposited.amount,
          walletAddress: embeddedWallet.address,
        }),
      });

      const withdrawData = await withdrawResponse.json();

      if (!withdrawData.success) {
        console.error("Failed to withdraw from vault:", withdrawData);
        setClosingPosition(false);
        throw new Error("Vault withdrawal failed");
      }

      setWaitingForWithdrawal(true); // Start aggressive polling
      await Promise.all([
        fetchBalance(),
        fetchUserPosition(),
        fetchTransactions(),
      ]);

      setTimeout(() => {
        setClosingPosition(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to close position:", error);
      setClosingPosition(false);
      throw error;
    }
  };

  // Effects
  // Fetch available vaults
  useEffect(() => {
    const fetchVaults = async () => {
      try {
        const response = await fetch("/api/vaults", { cache: "no-store" });
        const data = await response.json();
        if (data.success) {
          setVaults(data.vaults);
          const maxApy = data.vaults.reduce(
            (max: number, vault: Vault) => Math.max(max, vault.netApy || 0),
            0
          );
          setBestAvailableApy(maxApy * 100);
        }
      } catch (error) {
        console.error("Failed to fetch vaults:", error);
      } finally {
        setVaultsLoading(false);
      }
    };

    fetchVaults();
  }, []);

  // Fetch wallet balance
  useEffect(() => {
    fetchBalance();
    // Refresh balance every 20 seconds
    const interval = setInterval(fetchBalance, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletId]);

  // Fetch user positions function
  const fetchUserPosition = async () => {
    if (!embeddedWallet?.address) {
      setPositionLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/user/positions?address=${embeddedWallet.address}`,
        {
          cache: "no-store",
        }
      );
      const data = await response.json();

      if (data.success && data.positions && data.positions.length > 0) {
        setUserPosition(data.positions[0]);
      } else {
        setUserPosition(null);
      }
    } catch (error) {
      console.error("Failed to fetch user positions:", error);
      setUserPosition(null);
    } finally {
      setPositionLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!embeddedWallet?.address) {
      setTransactionsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/user/transactions?address=${embeddedWallet.address}`,
        {
          cache: "no-store",
        }
      );
      const data = await response.json();

      if (data.success && data.transactions) {
        setTransactions(data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Failed to fetch user transactions:", error);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Fetch user positions and transactions
  useEffect(() => {
    fetchUserPosition();
    fetchTransactions();
    // Refresh positions and transactions every 20 seconds
    const interval = setInterval(() => {
      fetchUserPosition();
      fetchTransactions();
    }, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embeddedWallet?.address]);

  // Aggressive polling when waiting for deposit or withdrawal
  useEffect(() => {
    if (!waitingForDeposit && !waitingForWithdrawal) return;

    // Capture initial position state
    const initialPositionState = userPosition
      ? JSON.stringify(userPosition)
      : null;
    const startTime = Date.now();
    const POLL_DURATION = 30000; // 30 seconds

    // Poll immediately on start
    fetchBalance();
    fetchUserPosition();
    fetchTransactions();

    const aggressiveInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      // Stop after 30 seconds
      if (elapsed >= POLL_DURATION) {
        if (waitingForDeposit) setWaitingForDeposit(false);
        if (waitingForWithdrawal) setWaitingForWithdrawal(false);
        clearInterval(aggressiveInterval);
        return;
      }

      // Check if position has changed
      const currentPositionState = userPosition
        ? JSON.stringify(userPosition)
        : null;
      if (initialPositionState !== currentPositionState) {
        if (waitingForDeposit) setWaitingForDeposit(false);
        if (waitingForWithdrawal) setWaitingForWithdrawal(false);
        clearInterval(aggressiveInterval);
        return;
      }

      // Continue polling
      fetchBalance();
      fetchUserPosition();
      fetchTransactions();
    }, 5000); // Poll every 5 seconds

    // Timeout to ensure polling stops after 30 seconds
    const timeout = setTimeout(() => {
      if (waitingForDeposit) setWaitingForDeposit(false);
      if (waitingForWithdrawal) setWaitingForWithdrawal(false);
      clearInterval(aggressiveInterval);
    }, POLL_DURATION);

    return () => {
      clearInterval(aggressiveInterval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingForDeposit, waitingForWithdrawal]);

  return {
    state: {
      showOnboarding,
      showWithdrawModal,
      showVaultsModal,
      vaults,
      vaultsLoading,
      walletBalance,
      balanceLoading,
      bestAvailableApy,
      autoBalancerEnabled,
      userPosition,
      positionLoading,
      closingPosition,
      transactions,
      transactionsLoading,
      isCheckingDelegation,
      enablingAutoBalancer,
      autoBalancerJustEnabled,
      depositingToVault,
      waitingForDeposit: waitingForDeposit || waitingForWithdrawal,
    },
    actions: {
      setShowWithdrawModal,
      setShowVaultsModal,
      logout,
      handleFundWallet,
      handleEnableAutoBalancer,
      handleToggleAutoBalancer,
      handleDepositToVault,
      handleWithdrawSubmit,
      handleClosePosition,
      fetchBalance,
      getAccessToken,
    },
  };
}
