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
import { OnboardingView } from "./OnboardingView";
import { Dashboard } from "./Dashboard";
import { VaultsModal } from "./VaultsModal";
import { WithdrawModal } from "./WithdrawModal";

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
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [vaultsLoading, setVaultsLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState("0.00");
  const [balanceLoading, setBalanceLoading] = useState(true);

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

      // Register user for auto-balancing
      await fetch("/api/user/register-auto-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: embeddedWallet.address }),
      });

      completeOnboarding();
    } catch (error) {
      console.error("Failed to enable auto balancer:", error);
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

      <Dashboard
        logout={logout}
        autoBalancerEnabled={autoBalancerEnabled || false}
        walletBalance={walletBalance}
        balanceLoading={balanceLoading}
        onWithdraw={() => setShowWithdrawModal(true)}
        onAddFunds={handleFundWallet}
        onToggleAutoBalancer={handleToggleAutoBalancer}
        onShowVaults={() => setShowVaultsModal(true)}
      />
    </>
  );
}
