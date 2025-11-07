import { useState } from "react";

interface WithdrawModalProps {
  onClose: () => void;
  onSubmit: (address: string, amount: string) => Promise<void>;
  walletBalance: string;
}

export function WithdrawModal({
  onClose,
  onSubmit,
  walletBalance,
}: WithdrawModalProps) {
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAddress || !withdrawAmount) return;

    await onSubmit(withdrawAddress, withdrawAmount);
    setWithdrawAddress("");
    setWithdrawAmount("");
  };

  const handleMaxClick = () => {
    setWithdrawAmount(walletBalance);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-5 sm:p-6 space-y-5 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-medium">Withdraw USDC</h3>
          <button
            onClick={onClose}
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="relative">
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 pr-16 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={handleMaxClick}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-black bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Max
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Available balance: {walletBalance} USDC
          </div>
          <div className="flex gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-xs sm:text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Number(walletBalance) === 0}
              className="flex-1 px-4 py-2 bg-black text-white text-xs sm:text-sm rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Withdraw
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
