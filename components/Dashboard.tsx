import { Header } from "./Header";

interface Position {
  id: string;
  protocol: "aave-v3" | "morpho";
  vaultAddress: string;
  vaultName: string;
  deposited: {
    usd: number;
    formatted: string;
  };
  currentApy: number;
}

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

interface DashboardProps {
  logout: () => void;
  autoBalancerEnabled: boolean;
  walletBalance: string;
  balanceLoading: boolean;
  totalDeposited: string;
  positionsLoading: boolean;
  positions: Position[];
  transactions: Transaction[];
  transactionsLoading: boolean;
  bestAvailableApy?: number; // Highest APY from all vaults
  onWithdraw: () => void;
  onAddFunds: () => void;
  onToggleAutoBalancer: () => void;
  onShowVaults: () => void;
  onRefreshBalance?: () => void; // Optional: manual balance refresh
  onCloseAllPositions?: () => void; // Optional: close all positions and withdraw
}

export function Dashboard({
  logout,
  autoBalancerEnabled,
  walletBalance,
  balanceLoading,
  totalDeposited,
  positionsLoading,
  positions,
  transactions,
  transactionsLoading,
  bestAvailableApy,
  onWithdraw,
  onAddFunds,
  onToggleAutoBalancer,
  onShowVaults,
  onRefreshBalance,
  onCloseAllPositions,
}: DashboardProps) {
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return "↓";
      case "withdraw":
        return "↑";
      case "rebalance":
        return "⇄";
      default:
        return "•";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "deposit":
        return "text-green-600";
      case "withdraw":
        return "text-red-600";
      case "rebalance":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

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
              <div className="text-2xl sm:text-3xl font-medium">
                {positionsLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : (
                  `$${Number(totalDeposited).toFixed(2)}`
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4 sm:p-5 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs sm:text-sm text-gray-500">
                  Wallet Balance
                </div>
                {onRefreshBalance && (
                  <button
                    onClick={onRefreshBalance}
                    disabled={balanceLoading}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    title="Refresh balance"
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
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-medium">
                {balanceLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : (
                  `$${Number(walletBalance).toFixed(2)}`
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
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
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

          {/* Current Positions */}
          <div className="border rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm sm:text-base">
                  Current Positions
                </h3>
                {onRefreshBalance && (
                  <button
                    onClick={onRefreshBalance}
                    disabled={positionsLoading}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    title="Refresh positions"
                  >
                    <svg
                      className={`w-4 h-4 ${
                        positionsLoading ? "animate-spin" : ""
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
                )}
              </div>
              {positions.length > 0 && onCloseAllPositions && (
                <button
                  onClick={onCloseAllPositions}
                  className="text-xs sm:text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Close All & Withdraw
                </button>
              )}
            </div>
            {positionsLoading ? (
              <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-400">
                Loading positions...
              </div>
            ) : positions.length === 0 ? (
              <div className="space-y-3">
                <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-500">
                  {parseFloat(totalDeposited) > 0 ? (
                    <>
                      <div className="mb-2">
                        ⏳ Your deposit is being indexed...
                      </div>
                      <div className="text-xs text-gray-400">
                        Position will appear shortly (usually 1-2 minutes)
                      </div>
                      <div className="text-xs text-red-500 mt-2">
                        Debug: positions.length = {positions.length},
                        totalDeposited = {totalDeposited}
                      </div>
                    </>
                  ) : (
                    "No active positions yet. Enable auto-balancer to start earning!"
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((position) => (
                  <div
                    key={position.id}
                    className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      {/* Left: Vault Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase font-medium">
                            {position.protocol === "morpho"
                              ? "Morpho"
                              : "Aave V3"}
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-gray-900">
                            {position.vaultName}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 font-mono truncate">
                          {position.vaultAddress.slice(0, 6)}...
                          {position.vaultAddress.slice(-4)}
                        </div>
                      </div>

                      {/* Right: Amount & APY */}
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-0.5">
                            Deposited
                          </div>
                          <div className="text-sm sm:text-base font-medium">
                            ${position.deposited.usd.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-0.5">
                            APY
                          </div>
                          <div className="text-sm sm:text-base font-medium text-green-600">
                            {position.currentApy.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transactions */}
          <div className="border rounded-lg p-4 sm:p-6">
            <h3 className="font-medium mb-3 sm:mb-4 text-sm sm:text-base">
              Recent Transactions
            </h3>
            {transactionsLoading ? (
              <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-400">
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-500">
                No transactions yet
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Type & Details */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={`text-lg font-bold ${getTypeColor(
                            tx.type
                          )}`}
                        >
                          {getTypeIcon(tx.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs sm:text-sm font-medium capitalize">
                              {tx.type}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                              {tx.protocol === "morpho" ? "Morpho" : "Aave"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {tx.type === "rebalance" && tx.from && tx.to ? (
                              <>
                                {tx.from.slice(0, 6)}...{tx.from.slice(-4)} →{" "}
                                {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                              </>
                            ) : (
                              <>
                                {tx.vaultAddress.slice(0, 6)}...
                                {tx.vaultAddress.slice(-4)}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Time */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-medium">
                          ${tx.amountUsd.toFixed(2)}
                        </div>
                        <a
                          href={`https://basescan.org/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          {formatTimestamp(tx.timestamp)}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
