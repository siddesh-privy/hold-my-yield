import { Header } from "./Header";

interface OnboardingViewProps {
  logout: () => void;
  onFundWallet: () => void;
  onEnableAutoBalancer: () => void;
  onDepositToVault: () => void;
  bestAvailableApy: number;
  walletBalance: string;
}

export function OnboardingView({
  logout,
  onFundWallet,
  onEnableAutoBalancer,
  onDepositToVault,
  bestAvailableApy,
  walletBalance,
}: OnboardingViewProps) {
  const hasBalance = parseFloat(walletBalance) > 0;

  return (
    <div className="min-h-screen">
      <Header logout={logout} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="space-y-8 sm:space-y-12">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium mb-2 sm:mb-3">
              Get started
            </h1>
            <p className="text-sm sm:text-base text-gray-500">
              Three simple steps to start earning optimized yields
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
                    onClick={onFundWallet}
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
                    Allow the app to automatically move your funds between Aave
                    and Morpho to maximize your yields.
                  </p>
                  <button
                    onClick={onEnableAutoBalancer}
                    className="w-full sm:w-auto px-4 py-2 bg-black text-white text-xs sm:text-sm rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Enable Auto Balancer
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border rounded-lg p-4 sm:p-6 space-y-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black text-white flex items-center justify-center text-xs sm:text-sm font-medium shrink-0">
                  3
          </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-medium mb-2">
                    Deposit to Highest APY Vault
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                    Start earning{" "}
                    <span className="font-semibold text-black">
                      {bestAvailableApy.toFixed(2)}% APY
                    </span>{" "}
                    by depositing your funds into the best performing vault.
                  </p>
                  {!hasBalance && (
                    <p className="text-xs sm:text-sm text-orange-600 mb-3 sm:mb-4">
                      Please deposit USDC to continue
                    </p>
                  )}
          <button
                    onClick={onDepositToVault}
                    disabled={!hasBalance}
                    className={`w-full sm:w-auto px-4 py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                      hasBalance
                        ? "bg-black text-white hover:bg-gray-800"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Deposit to Vault
          </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
