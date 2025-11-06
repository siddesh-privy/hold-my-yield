"use client";
import {
  usePrivy,
  useFundWallet,
  useSessionSigners,
  useWallets,
} from "@privy-io/react-auth";
import { useState } from "react";
import { base } from "viem/chains";

export default function Home() {
  const { authenticated, ready, login, logout } = usePrivy();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  if (authenticated) {
    return <MainApp logout={logout} />;
  }

  return <LandingPage login={login} />;
}

function LandingPage({ login }: { login: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full space-y-8 sm:space-y-12">
        <div className="space-y-4 sm:space-y-6">
          <h1 className="text-3xl sm:text-5xl font-medium tracking-tight">
            Hold My Yield
          </h1>
          <p className="text-base sm:text-lg text-gray-500 leading-relaxed">
            Automatically move your assets between Morpho and Aave to earn the
            best yields. No babysitting required.
          </p>
        </div>

        <button
          onClick={login}
          className="w-full sm:w-auto px-5 py-2.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

function MainApp({ logout }: { logout: () => void }) {
  const { fundWallet } = useFundWallet();
  const { addSessionSigners, removeSessionSigners } = useSessionSigners();
  const { wallets } = useWallets();
  const { user } = usePrivy();
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Check if onboarding has been completed
    if (typeof window !== "undefined") {
      const onboardingComplete = localStorage.getItem("onboarding_complete");
      return !onboardingComplete;
    }
    return true;
  });
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );

  // Check if auto balancer is enabled by checking if wallet is delegated
  // Find the wallet in user's linked accounts to check delegated status
  const autoBalancerEnabled =
    user?.linkedAccounts?.find(
      (account) =>
        account.type === "wallet" &&
        account.address === embeddedWallet?.address &&
        "delegated" in account &&
        account.delegated === true
    ) !== undefined;

  const handleFundWallet = () => {
    if (!embeddedWallet?.address) return;
    fundWallet({
      address: embeddedWallet.address,
      options: {
        chain: base,
        asset: "USDC",
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
      // No need to update state - the wallet.delegated property will be updated
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
      // No need to update state - the wallet.delegated property will be updated
    } catch (error) {
      console.error("Failed to disable auto balancer:", error);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem("onboarding_complete", "true");
    setShowOnboarding(false);
  };

  const handleWithdraw = () => {
    setShowWithdrawModal(true);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!embeddedWallet?.address || !withdrawAddress || !withdrawAmount) return;

    try {
      // TODO: Implement USDC withdrawal transaction
      // This will send USDC from the wallet to the recipient address
      console.log("Withdraw", withdrawAmount, "USDC to", withdrawAddress);

      // Close modal and reset form
      setShowWithdrawModal(false);
      setWithdrawAddress("");
      setWithdrawAmount("");
    } catch (error) {
      console.error("Failed to withdraw:", error);
    }
  };

  const closeWithdrawModal = () => {
    setShowWithdrawModal(false);
    setWithdrawAddress("");
    setWithdrawAmount("");
  };

  if (showOnboarding) {
    return (
      <div className="min-h-screen">
        <header className="border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <span className="text-sm sm:text-base font-medium">
              Hold My Yield
            </span>
            <button
              onClick={logout}
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="space-y-8 sm:space-y-12">
            <div>
              <h1 className="text-2xl sm:text-3xl font-medium mb-2 sm:mb-3">
                Get started
              </h1>
              <p className="text-sm sm:text-base text-gray-500">
                Two simple steps to start earning optimized yields
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {/* Step 1 */}
              <div className="border rounded-lg p-4 sm:p-6 space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black text-white flex items-center justify-center text-xs sm:text-sm font-medium shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm sm:text-base font-medium mb-2">
                      Deposit Base USDC
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                      Add USDC to your wallet to get started. Gas is on us!
                    </p>
                    <button
                      onClick={handleFundWallet}
                      className="w-full sm:w-auto px-4 py-2 bg-black text-white text-xs sm:text-sm rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Fund Wallet
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="border rounded-lg p-4 sm:p-6 space-y-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black text-white flex items-center justify-center text-xs sm:text-sm font-medium shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm sm:text-base font-medium mb-2">
                      Enable Auto Balancer
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                      Allow the app to automatically move your funds between
                      Aave and Morpho to maximize your yields.
                    </p>
                    <button
                      onClick={handleEnableAutoBalancer}
                      className="w-full sm:w-auto px-4 py-2 bg-black text-white text-xs sm:text-sm rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Enable Auto Balancer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={completeOnboarding}
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 sm:p-6 space-y-5 sm:space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-medium">
                Withdraw USDC
              </h3>
              <button
                onClick={closeWithdrawModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="recipient"
                  className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
                >
                  Recipient Address
                </label>
                <input
                  id="recipient"
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="amount"
                  className="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
                >
                  Amount (USDC)
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeWithdrawModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-xs sm:text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-black text-white text-xs sm:text-sm rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Withdraw
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="min-h-screen">
        <header className="border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <span className="text-sm sm:text-base font-medium">
              Hold My Yield
            </span>
            <button
              onClick={logout}
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-medium mb-1 sm:mb-2">
                  Dashboard
                </h2>
                <p className="text-sm sm:text-base text-gray-500">
                  Manage your yield optimization
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={handleWithdraw}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Withdraw
                </button>
                <button
                  onClick={handleFundWallet}
                  className="w-full sm:w-auto px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Add Funds
                </button>
                <button
                  onClick={
                    autoBalancerEnabled
                      ? handleDisableAutoBalancer
                      : handleEnableAutoBalancer
                  }
                  className={`w-full sm:w-auto px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
                    autoBalancerEnabled
                      ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      : "border border-black text-black hover:bg-gray-50"
                  }`}
                >
                  {autoBalancerEnabled
                    ? "Disable Auto Balancer"
                    : "Enable Auto Balancer"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="border rounded-lg p-4 sm:p-5 space-y-2 sm:space-y-3">
                <div className="text-xs sm:text-sm text-gray-500">
                  Total Deposited
                </div>
                <div className="text-2xl sm:text-3xl font-medium">$0.00</div>
              </div>

              <div className="border rounded-lg p-4 sm:p-5 space-y-2 sm:space-y-3">
                <div className="text-xs sm:text-sm text-gray-500">
                  Wallet USDC Balance
                </div>
                <div className="text-2xl sm:text-3xl font-medium">$0.00</div>
              </div>

              <div className="border rounded-lg p-4 sm:p-5 space-y-2 sm:space-y-3">
                <div className="text-xs sm:text-sm text-gray-500">
                  Current Yield
                </div>
                <div className="text-2xl sm:text-3xl font-medium">0.00%</div>
              </div>
            </div>

            <div className="border rounded-lg p-4 sm:p-6">
              <h3 className="font-medium mb-3 sm:mb-4 text-sm sm:text-base">
                Transactions
              </h3>
              <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-500">
                No transactions yet
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
