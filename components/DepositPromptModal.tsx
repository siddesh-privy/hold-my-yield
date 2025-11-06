import { useState } from "react";

interface DepositPromptModalProps {
  balance: string; // USDC balance (formatted)
  bestVault: {
    name: string;
    apy: number;
  };
  onDeposit: () => void;
  onSkip: () => void;
}

export function DepositPromptModal({
  balance,
  bestVault,
  onDeposit,
  onSkip,
}: DepositPromptModalProps) {
  const [isDepositing, setIsDepositing] = useState(false);

  const handleDeposit = async () => {
    setIsDepositing(true);
    try {
      await onDeposit();
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-5 sm:p-6 space-y-5">
        <div className="text-center">
          <div className="text-4xl mb-3">💰</div>
          <h3 className="text-lg sm:text-xl font-medium mb-2">
            Funds Detected!
          </h3>
          <p className="text-sm text-gray-600">
            You have <span className="font-semibold">${balance} USDC</span> in
            your wallet.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Best Available Vault:</span>
            <span className="font-medium text-green-600">
              {bestVault.apy.toFixed(2)}% APY
            </span>
          </div>
          <div className="text-xs text-gray-500">{bestVault.name}</div>
        </div>

        <p className="text-sm text-gray-600 text-center">
          Would you like to deposit your funds into the best vault now?
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleDeposit}
            disabled={isDepositing}
            className="w-full px-4 py-3 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDepositing ? "Depositing..." : "Yes, Deposit Now"}
          </button>
          <button
            onClick={onSkip}
            disabled={isDepositing}
            className="w-full px-4 py-3 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Skip
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Note: Funds will be automatically deposited during the next daily
          rebalance if you skip.
        </p>
      </div>
    </div>
  );
}

