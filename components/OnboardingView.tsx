import { Header } from "./Header";

interface OnboardingViewProps {
  logout: () => void;
  onFundWallet: () => void;
  onEnableAutoBalancer: () => void;
  enablingAutoBalancer: boolean;
  autoBalancerJustEnabled: boolean;
}

export function OnboardingView({
  logout,
  onFundWallet,
  onEnableAutoBalancer,
  enablingAutoBalancer,
  autoBalancerJustEnabled,
}: OnboardingViewProps) {
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
              Two simple steps to enable auto-balancing
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
                  {autoBalancerJustEnabled ? (
                    <div className="flex items-center gap-2 text-green-600 text-xs sm:text-sm">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="font-medium">
                        Auto-balancer enabled!
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={onEnableAutoBalancer}
                      disabled={enablingAutoBalancer}
                      className="w-full sm:w-auto px-4 py-2 bg-black text-white text-xs sm:text-sm rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {enablingAutoBalancer && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      )}
                      {enablingAutoBalancer
                        ? "Enabling..."
                        : "Enable Auto Balancer"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
