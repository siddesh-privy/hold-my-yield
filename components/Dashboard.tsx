import { Header } from "./Header";
import type { UserPosition } from "@/app/api/user/positions/route";
import type { Transaction } from "@/app/api/user/transactions/route";

interface DashboardProps {
  logout: () => void;
  walletBalance: string;
  balanceLoading: boolean;
  bestAvailableApy: number;
  onWithdraw: () => void;
  onAddFunds: () => void;
  onShowVaults: () => void;
  onRefreshBalance: () => void;
  onClosePosition: () => void;
  onDepositToVault: () => void;
  depositingToVault: boolean;
  userPosition: UserPosition | null;
  positionLoading: boolean;
  closingPosition: boolean;
  transactions: Transaction[];
  transactionsLoading: boolean;
  waitingForDeposit: boolean;
}

export function Dashboard({
  logout,
  walletBalance,
  balanceLoading,
  bestAvailableApy,
  onWithdraw,
  onAddFunds,
  onShowVaults,
  onRefreshBalance,
  onClosePosition,
  onDepositToVault,
  depositingToVault,
  userPosition,
  positionLoading,
  closingPosition,
  transactions,
  transactionsLoading,
  waitingForDeposit,
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
              <p className="text-xs text-gray-400 mt-1">
                ⚡ Auto-rebalancing every 3 hours
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {parseFloat(walletBalance) > 0 && (
                <button
                  onClick={onDepositToVault}
                  disabled={depositingToVault}
                  className={`w-full sm:w-auto px-4 py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    depositingToVault
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {depositingToVault && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {depositingToVault ? "Depositing..." : "Deposit to Vault"}
                </button>
              )}
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
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="border rounded-lg p-4 sm:p-5 space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2">
                <div className="text-xs sm:text-sm text-gray-500">
                  Total Deposited
                </div>
                {waitingForDeposit && (
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-blue-600"></div>
                    <span className="text-[10px]">Updating...</span>
                  </div>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-medium">
                {positionLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : userPosition ? (
                  `$${userPosition.deposited.formatted}`
                ) : (
                  "$0.00"
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4 sm:p-5 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs sm:text-sm text-gray-500">
                  Wallet USDC Balance
                </div>
                <button
                  onClick={onRefreshBalance}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Refresh balance"
                  disabled={balanceLoading}
                >
                  <svg
                    className={`w-4 h-4 ${
                      balanceLoading ? "animate-spin" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
              <div className="text-2xl sm:text-3xl font-medium">
                {balanceLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : (
                  `$${walletBalance}`
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4 sm:p-5 space-y-2 sm:space-y-3 bg-green-50">
              <div className="flex items-center justify-between">
                <div className="text-xs sm:text-sm text-green-700 font-medium">
                  Current APY
                </div>
                <button
                  onClick={onShowVaults}
                  className="text-green-600 hover:text-green-800 transition-colors"
                  title="View all markets"
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
              <div className="text-2xl sm:text-3xl font-medium text-green-600">
                {bestAvailableApy !== undefined ? (
                  `${bestAvailableApy.toFixed(2)}%`
                ) : (
                  <span className="text-green-400">--</span>
                )}
              </div>
              <div className="text-xs text-green-600">
                Earning highest yield
              </div>
            </div>
          </div>

          {/* Active Position Card */}
          <div className="border rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-medium text-sm sm:text-base">
                Active Position
              </h3>
              {waitingForDeposit && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span>Updating...</span>
                </div>
              )}
            </div>
            {positionLoading ? (
              <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-400">
                Loading position...
              </div>
            ) : userPosition ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm sm:text-base">
                        {userPosition.vaultName}
                      </h4>
                      <span className="px-2 py-0.5 text-xs bg-black text-white rounded">
                        {userPosition.protocol === "morpho"
                          ? "Morpho"
                          : "Aave V3"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-600">
                      <div>
                        <span className="text-gray-500">Deposited:</span>{" "}
                        <span className="font-medium">
                          ${userPosition.deposited.formatted}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Current APY:</span>{" "}
                        <span className="font-medium text-green-600">
                          {(
                            (userPosition.netApy || userPosition.currentApy) *
                            100
                          ).toFixed(2)}
                          %
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">
                          Est. Yearly Yield:
                        </span>{" "}
                        <span className="font-medium text-green-600">
                          ${userPosition.estimatedYearlyYield.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onClosePosition}
                    disabled={closingPosition}
                    className="w-full sm:w-auto px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    {closingPosition ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Closing...</span>
                      </>
                    ) : (
                      "Close Position"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-500">
                No active positions yet
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-medium text-sm sm:text-base">
                Recent Transactions
              </h3>
              {waitingForDeposit && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span>Updating...</span>
                </div>
              )}
            </div>
            {transactionsLoading ? (
              <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-400">
                Loading transactions...
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            tx.type === "deposit"
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {tx.type === "deposit" ? "Deposit" : "Withdraw"}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-black text-white rounded">
                          {tx.protocol === "morpho" ? "Morpho" : "Aave V3"}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        {tx.vaultName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(tx.timestamp * 1000).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                      <div className="text-sm font-medium">
                        ${tx.amount.formatted}
                      </div>
                      <a
                        href={`https://basescan.org/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-500">
                No transactions yet
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
