"use client";
import { useAppActions } from "@/lib/hooks/useAppActions";
import { OnboardingView } from "./OnboardingView";
import { Dashboard } from "./Dashboard";
import { VaultsModal } from "./VaultsModal";
import { WithdrawModal } from "./WithdrawModal";

export function MainApp() {
  const { state, actions } = useAppActions();

  // Show loading while checking delegation status
  if (state.isCheckingDelegation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (state.showOnboarding) {
    return (
      <OnboardingView
        logout={actions.logout}
        onFundWallet={actions.handleFundWallet}
        onEnableAutoBalancer={actions.handleEnableAutoBalancer}
        enablingAutoBalancer={state.enablingAutoBalancer}
        autoBalancerJustEnabled={state.autoBalancerJustEnabled}
      />
    );
  }

  return (
    <>
      {state.showVaultsModal && (
        <VaultsModal
          vaults={state.vaults}
          loading={state.vaultsLoading}
          onClose={() => actions.setShowVaultsModal(false)}
        />
      )}

      {state.showWithdrawModal && (
        <WithdrawModal
          onClose={() => actions.setShowWithdrawModal(false)}
          onSubmit={actions.handleWithdrawSubmit}
          walletBalance={state.walletBalance}
        />
      )}

      <Dashboard
        logout={actions.logout}
        walletBalance={state.walletBalance}
        balanceLoading={state.balanceLoading}
        bestAvailableApy={state.bestAvailableApy}
        onWithdraw={() => actions.setShowWithdrawModal(true)}
        onAddFunds={actions.handleFundWallet}
        onShowVaults={() => actions.setShowVaultsModal(true)}
        onRefreshBalance={actions.fetchBalance}
        onClosePosition={actions.handleClosePosition}
        onDepositToVault={actions.handleDepositToVault}
        depositingToVault={state.depositingToVault}
        userPosition={state.userPosition}
        positionLoading={state.positionLoading}
        closingPosition={state.closingPosition}
        transactions={state.transactions}
        transactionsLoading={state.transactionsLoading}
        waitingForDeposit={state.waitingForDeposit}
      />
    </>
  );
}
