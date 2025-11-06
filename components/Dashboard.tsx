import { Header } from "./Header";

interface DashboardProps {
  logout: () => void;
  autoBalancerEnabled: boolean;
  walletBalance: string;
  balanceLoading: boolean;
  onWithdraw: () => void;
  onAddFunds: () => void;
  onToggleAutoBalancer: () => void;
  onShowVaults: () => void;
}

export function Dashboard({
  logout,
  autoBalancerEnabled,
  walletBalance,
  balanceLoading,
  onWithdraw,
  onAddFunds,
  onToggleAutoBalancer,
  onShowVaults,
}: DashboardProps) {
  return (
    <div className="min-h-screen">
      <Header logout={logout} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-medium mb-1 sm:mb-2">
                Dashboard
              </h2>
              <p className="text-sm sm:text-base text-gray-500">
                Manage your assets and yields
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <button
                onClick={onWithdraw}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Withdraw
              </button>
              <button
                onClick={onAddFunds}
                className="w-full sm:w-auto px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
              >
                Add Funds
              </button>
              <button
                onClick={onToggleAutoBalancer}
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
              <div className="text-2xl sm:text-3xl font-medium">
                {balanceLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : (
                  `$${walletBalance}`
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4 sm:p-5 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs sm:text-sm text-gray-500">
                  Current Yield
                </div>
                <button
                  onClick={onShowVaults}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="View available markets"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
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
  );
}
