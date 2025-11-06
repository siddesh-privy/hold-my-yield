"use client";
import {
  usePrivy,
  useFundWallet,
  useSessionSigners,
  useWallets,
} from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { base } from "viem/chains";
import type { Vault } from "@/app/api/vaults/route";
import type { UserPosition } from "@/app/api/user/positions/route";

interface Transaction {
  id: string;
  hash: string;
  type: "deposit" | "withdraw" | "rebalance";
  protocol: "morpho" | "aave-v3";
  amount: string;
  amountUsd: number;
  from?: string;
  to?: string;
  vaultAddress: string;
  vaultName: string;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
}
import { OnboardingView } from "./OnboardingView";
import { Dashboard } from "./Dashboard";
import { VaultsModal } from "./VaultsModal";
import { WithdrawModal } from "./WithdrawModal";
import { DepositPromptModal } from "./DepositPromptModal";

export function MainApp() {
  const { fundWallet } = useFundWallet();
  const { addSessionSigners, removeSessionSigners } = useSessionSigners();
  const { wallets } = useWallets();
  const { user, logout } = usePrivy();

  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== "undefined") {
      const onboardingComplete = localStorage.getItem("onboarding_complete");
      return !onboardingComplete;
    }
    return true;
  });

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showVaultsModal, setShowVaultsModal] = useState(false);
  const [showDepositPromptModal, setShowDepositPromptModal] = useState(false);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [vaultsLoading, setVaultsLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState("0.00");
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [totalDeposited, setTotalDeposited] = useState("0.00");
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );

  // Get wallet info from user's linked accounts
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

  const handleFundWallet = () => {
    if (!embeddedWallet?.address) return;

    const previousBalance = parseFloat(walletBalance);

    // Open funding modal
    fundWallet({
      address: embeddedWallet.address,
      options: {
        chain: base,
        asset: "USDC",
        amount: "10",
      },
    });

    // Start polling for balance updates (user might buy/send/bridge)
    // Poll every 5 seconds for 2 minutes, then stop
    let pollCount = 0;
    const maxPolls = 24; // 2 minutes (24 * 5 seconds)

    const pollInterval = setInterval(async () => {
      pollCount++;

      if (pollCount > maxPolls) {
        clearInterval(pollInterval);
        return;
      }

      // Refresh balance
      if (walletId) {
        try {
          const response = await fetch(
            `/api/user/balance?walletId=${walletId}`
          );
          const data = await response.json();

          if (data.success) {
            const newBalance = data.balance.formatted;
            const newBalanceNum = parseFloat(newBalance);

            // If balance changed, update and stop polling
            if (newBalance !== walletBalance) {
              setWalletBalance(newBalance);
              clearInterval(pollInterval);

              // If balance increased by at least $1, show deposit prompt
              if (autoBalancerEnabled && newBalanceNum - previousBalance >= 1) {
                setShowDepositPromptModal(true);
              }
            }
          }
        } catch (error) {
          console.error("Error polling balance:", error);
        }
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleEnableAutoBalancer = async () => {
    if (!embeddedWallet?.address || !walletId) return;

    try {
      // Step 1: Add session signers
      await addSessionSigners({
        address: embeddedWallet.address,
        signers: [
          {
            signerId: process.env.NEXT_PUBLIC_SESSION_SIGNER_ID!,
            policyIds: [],
          },
        ],
      });

      // Step 2: Register user for auto-balancing
      await fetch("/api/user/register-auto-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: embeddedWallet.address }),
      });

      // Step 3: Trigger initial deposit if user has USDC balance
      if (walletBalance && parseFloat(walletBalance) >= 1) {
        console.log("Triggering initial deposit...");
        const rawBalance = (parseFloat(walletBalance) * 1e6).toString();

        const depositResponse = await fetch("/api/user/initial-deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletId,
            walletAddress: embeddedWallet.address,
            usdcBalance: rawBalance,
          }),
        });

        const depositData = await depositResponse.json();

        if (depositData.success) {
          console.log("✅ Initial deposit successful:", depositData.txHash);

          // Refresh balance and positions after deposit
          setTimeout(() => {
            refreshBalance();
            refreshPositions();
          }, 3000); // Wait 3s for transaction to be indexed
        } else {
          console.error("❌ Initial deposit failed:", depositData.error);
        }
      }

      completeOnboarding();
    } catch (error) {
      console.error("Failed to enable auto balancer:", error);
    }
  };

  const handleDepositNow = async () => {
    if (!walletId || !embeddedWallet?.address) return;

    try {
      const rawBalance = (parseFloat(walletBalance) * 1e6).toString();

      const depositResponse = await fetch("/api/user/initial-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          walletAddress: embeddedWallet.address,
          usdcBalance: rawBalance,
        }),
      });

      const depositData = await depositResponse.json();

      if (depositData.success) {
        setShowDepositPromptModal(false);

        // Refresh balance and positions after deposit
        setTimeout(() => {
          refreshBalance();
          refreshPositions();
        }, 3000);
      } else {
        alert(`Deposit failed: ${depositData.error}`);
      }
    } catch (error) {
      console.error("Failed to deposit:", error);
      alert("Failed to deposit. Please try again.");
    }
  };

  const handleDisableAutoBalancer = async () => {
    if (!embeddedWallet?.address) return;

    try {
      await removeSessionSigners({
        address: embeddedWallet.address,
      });

      // Unregister user from auto-balancing
      await fetch("/api/user/unregister-auto-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: embeddedWallet.address }),
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

  const completeOnboarding = () => {
    localStorage.setItem("onboarding_complete", "true");
    setShowOnboarding(false);
  };

  const refreshBalance = async () => {
    if (!walletId) return;

    setBalanceLoading(true);
    try {
      const response = await fetch(`/api/user/balance?walletId=${walletId}`);
      const data = await response.json();

      if (data.success) {
        setWalletBalance(data.balance.formatted);
        console.log("💰 Balance refreshed:", data.balance.formatted);
      }
    } catch (error) {
      console.error("Failed to refresh balance:", error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const refreshPositions = async () => {
    if (!embeddedWallet?.address) return;

    setPositionsLoading(true);
    try {
      const response = await fetch(
        `/api/user/positions?address=${embeddedWallet.address}`
      );
      const data = await response.json();

      if (data.success && data.summary) {
        setTotalDeposited(data.summary.totalDeposited.toFixed(2));

        // Filter out positions with $0 deposited
        const activePositions = (data.positions || []).filter(
          (p: UserPosition) => p.deposited.usd > 0.01 // Ignore dust amounts
        );
        setPositions(activePositions);
      }
    } catch (error) {
      console.error("Failed to refresh positions:", error);
    } finally {
      setPositionsLoading(false);
    }
  };

  const handleCloseAllPositions = async () => {
    if (!walletId || !embeddedWallet?.address) return;

    const confirmed = window.confirm(
      "Are you sure you want to close all positions and withdraw all funds to your wallet?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/user/close-positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          walletAddress: embeddedWallet.address,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Immediately clear positions from UI
        setPositions([]);
        setTotalDeposited("0.00");

        // Show success message
        alert(
          "All positions closed successfully! Funds are now in your wallet.\n\n" +
            "Note: It may take 1-2 minutes for the position to fully disappear from the API."
        );

        // Refresh balances after a delay to get updated wallet balance
        setTimeout(() => {
          refreshBalance();
          refreshPositions();
        }, 3000);

        // Also refresh after 30 seconds to catch API updates
        setTimeout(() => {
          refreshPositions();
        }, 30000);
      } else {
        alert(`Failed to close positions: ${data.error}`);
      }
    } catch (error) {
      console.error("Error closing positions:", error);
      alert("Failed to close positions. Please try again.");
    }
  };

  // Fetch available vaults
  useEffect(() => {
    const fetchVaults = async () => {
      try {
        const response = await fetch("/api/vaults");
        const data = await response.json();
        if (data.success) {
          setVaults(data.vaults);
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
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchBalance();
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [walletId]);

  // Fetch user positions (total deposited & current yield)
  useEffect(() => {
    const fetchPositions = async () => {
      if (!embeddedWallet?.address) {
        setPositionsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/user/positions?address=${embeddedWallet.address}`
        );
        const data = await response.json();

        if (data.success && data.summary) {
          setTotalDeposited(data.summary.totalDeposited.toFixed(2));

          // Filter out positions with $0 deposited
          const activePositions = (data.positions || []).filter(
            (p: UserPosition) => p.deposited.usd > 0.01 // Ignore dust amounts
          );
          setPositions(activePositions);
        }
      } catch (error) {
        console.error("Failed to fetch positions:", error);
      } finally {
        setPositionsLoading(false);
      }
    };

    fetchPositions();
    // Refresh positions every 30 seconds
    const interval = setInterval(fetchPositions, 30000);
    return () => clearInterval(interval);
  }, [embeddedWallet?.address]);

  // Fetch user transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!embeddedWallet?.address) {
        setTransactionsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/user/transactions?address=${embeddedWallet.address}&limit=20`
        );
        const data = await response.json();

        if (data.success) {
          setTransactions(data.transactions || []);
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
    // Refresh transactions every 30 seconds
    const interval = setInterval(fetchTransactions, 30000);
    return () => clearInterval(interval);
  }, [embeddedWallet?.address]);

  if (showOnboarding) {
    return (
      <OnboardingView
        logout={logout}
        onFundWallet={handleFundWallet}
        onEnableAutoBalancer={handleEnableAutoBalancer}
        onSkip={completeOnboarding}
      />
    );
  }

  const bestVault = vaults.length > 0 ? vaults[0] : null;

  return (
    <>
      {showVaultsModal && (
        <VaultsModal
          vaults={vaults}
          loading={vaultsLoading}
          onClose={() => setShowVaultsModal(false)}
        />
      )}

      {showWithdrawModal && (
        <WithdrawModal
          onClose={() => setShowWithdrawModal(false)}
          walletBalance={walletBalance}
        />
      )}

      {showDepositPromptModal && bestVault && (
        <DepositPromptModal
          balance={walletBalance}
          bestVault={{
            name: bestVault.name,
            apy: bestVault.netApy * 100,
          }}
          onDeposit={handleDepositNow}
          onSkip={() => setShowDepositPromptModal(false)}
        />
      )}

      <Dashboard
        logout={logout}
        autoBalancerEnabled={autoBalancerEnabled || false}
        walletBalance={walletBalance}
        balanceLoading={balanceLoading}
        totalDeposited={totalDeposited}
        positionsLoading={positionsLoading}
        positions={positions}
        transactions={transactions}
        transactionsLoading={transactionsLoading}
        bestAvailableApy={bestVault ? bestVault.netApy * 100 : undefined}
        onWithdraw={() => setShowWithdrawModal(true)}
        onAddFunds={handleFundWallet}
        onToggleAutoBalancer={handleToggleAutoBalancer}
        onShowVaults={() => setShowVaultsModal(true)}
        onRefreshBalance={() => {
          refreshBalance();
          refreshPositions();
        }}
        onCloseAllPositions={handleCloseAllPositions}
      />
    </>
  );
}
