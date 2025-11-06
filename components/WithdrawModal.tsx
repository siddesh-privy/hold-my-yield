import { USDC_BASE_ADDRESS } from "@/app/api/vaults/morpho/route";
import { USDC_ABI } from "@/lib/vault-abis";
import { useSendTransaction } from "@privy-io/react-auth";
import { useState } from "react";
import { encodeFunctionData } from "viem";
import { base } from "viem/chains";

interface WithdrawModalProps {
  onClose: () => void;
  walletBalance?: string; // Optional: available USDC balance
}

export function WithdrawModal({ onClose, walletBalance }: WithdrawModalProps) {
  const { sendTransaction } = useSendTransaction();
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate Ethereum address
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Validate amount
  const validateAmount = (amount: string): string | null => {
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return "Amount must be greater than 0";
    }

    if (walletBalance) {
      const balance = parseFloat(walletBalance);
      if (numAmount > balance) {
        return `Insufficient balance. Available: $${balance} USDC`;
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate address
    if (!withdrawAddress) {
      setError("Please enter a recipient address");
      return;
    }

    if (!isValidAddress(withdrawAddress)) {
      setError("Invalid Ethereum address format");
      return;
    }

    // Validate amount
    if (!withdrawAmount) {
      setError("Please enter an amount");
      return;
    }

    const amountError = validateAmount(withdrawAmount);
    if (amountError) {
      setError(amountError);
      return;
    }

    setIsSubmitting(true);

    try {
      const data = encodeFunctionData({
        abi: USDC_ABI,
        functionName: "transfer",
        args: [
          withdrawAddress as `0x${string}`,
          BigInt(Number(withdrawAmount) * 10 ** 6),
        ],
      });

      await sendTransaction(
        {
          to: USDC_BASE_ADDRESS,
          data,
          chainId: base.id,
        },
        {
          sponsor: true,
        }
      );

      // Success - reset form and close
      setWithdrawAddress("");
      setWithdrawAmount("");
      setError("");
      onClose();
    } catch (error) {
      console.error("Failed to withdraw:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to process withdrawal. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
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
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs sm:text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Recipient Address */}
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
              onChange={(e) => {
                setWithdrawAddress(e.target.value);
                setError(""); // Clear error on input
              }}
              placeholder="0x..."
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${
                error && !isValidAddress(withdrawAddress) && withdrawAddress
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              disabled={isSubmitting}
              required
            />
            {withdrawAddress && !isValidAddress(withdrawAddress) && (
              <p className="mt-1 text-xs text-gray-500">
                Enter a valid Ethereum address (0x...)
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="amount"
                className="block text-xs sm:text-sm font-medium text-gray-700"
              >
                Amount (USDC)
              </label>
              {walletBalance && (
                <span className="text-xs text-gray-500">
                  Available: ${walletBalance}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={withdrawAmount}
                onChange={(e) => {
                  setWithdrawAmount(e.target.value);
                  setError(""); // Clear error on input
                }}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                disabled={isSubmitting}
                required
              />
              {walletBalance && (
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(walletBalance)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-black transition-colors"
                  disabled={isSubmitting}
                >
                  Max
                </button>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-xs sm:text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-black text-white text-xs sm:text-sm rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Withdraw"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
