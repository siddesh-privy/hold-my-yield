"use client";
import { useAppActions } from "@/lib/hooks/useAppActions";
import { OnboardingView } from "./OnboardingView";
import { Dashboard } from "./Dashboard";
import { VaultsModal } from "./VaultsModal";
import { WithdrawModal } from "./WithdrawModal";

export function MainApp() {
  const { state, actions } = useAppActions();

  if (state.showOnboarding) {
    return (
      <OnboardingView
        logout={actions.logout}
        onFundWallet={actions.handleFundWallet}
        onEnableAutoBalancer={actions.handleEnableAutoBalancer}
        onDepositToVault={actions.handleDepositToVault}
        bestAvailableApy={state.bestAvailableApy}
        walletBalance={state.walletBalance}
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
        userPosition={state.userPosition}
        positionLoading={state.positionLoading}
        closingPosition={state.closingPosition}
        transactions={state.transactions}
        transactionsLoading={state.transactionsLoading}
      />
    </>
  );
}
