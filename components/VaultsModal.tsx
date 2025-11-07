import type { Vault } from "@/app/api/vaults/route";

interface VaultsModalProps {
  vaults: Vault[];
  loading: boolean;
  onClose: () => void;
}

export function VaultsModal({ vaults, loading, onClose }: VaultsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b">
          <div>
            <h3 className="text-base sm:text-lg font-medium">
              Available Markets
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              We automatically optimize across these markets
            </p>
          </div>
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

        <div className="overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="text-center py-8 text-sm text-gray-500">
              Loading markets...
            </div>
          ) : vaults.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No markets available
            </div>
          ) : (
            <div className="space-y-3">
              {vaults.map((vault) => (
                  <div
                    key={vault.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-medium uppercase">
                            {vault.protocol}
                          </span>
                          <h4 className="text-sm font-medium truncate">
                            {vault.name}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {vault.asset.symbol} • $
                          {(vault.totalAssetsUsd / 1000000).toFixed(2)}M
                          liquidity
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium text-green-600">
                          {(vault.apy * 100).toFixed(2)}%
                        </div>
                        {vault.netApy > vault.apy && (
                          <div className="text-xs text-green-500">
                            +{((vault.netApy - vault.apy) * 100).toFixed(2)}% rewards
                          </div>
                        )}
                        <div className="text-xs text-gray-500">APY</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="border-t p-4 sm:p-5 bg-gray-50">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-gray-500">
              Total Markets: {vaults.length}
            </span>
            <span className="text-gray-500">
              {vaults.filter((v) => v.protocol === "morpho").length} Morpho •{" "}
              {vaults.filter((v) => v.protocol === "aave-v3").length} Aave
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
