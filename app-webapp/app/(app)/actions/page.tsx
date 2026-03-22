"use client";

import {
  ActionsHistorySection,
  ActionsPageHeader,
  ActionsPageTabs,
  ActionsTreatmentSection,
} from "./page-sections";
import { useActionsPageModel } from "./use-actions-page-model";

export default function ActionsPage() {
  const {
    activeTab,
    setActiveTab,
    severityFilter,
    setSeverityFilter,
    selectedAlert,
    selectedOptionId,
    setSelectedOptionId,
    decisionNotes,
    setDecisionNotes,
    historyPage,
    setHistoryPage,
    alerts,
    alertsLoading,
    alertsError,
    workspace,
    workspaceLoading,
    workspaceError,
    historyRows,
    historyTotal,
    historyLoading,
    historyError,
    submitLoading,
    submitError,
    requiresOverrideNotes,
    options,
    formatHorizonLabel,
    handleValidateDecision,
    resetAlertSelection,
    selectAlert,
  } = useActionsPageModel();

  return (
    <div className="min-h-full space-y-8">
      <ActionsPageHeader />
      <ActionsPageTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "treatment" ? (
        <ActionsTreatmentSection
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          alerts={alerts}
          alertsLoading={alertsLoading}
          alertsError={alertsError}
          selectedAlert={selectedAlert ?? null}
          workspaceLoading={workspaceLoading}
          workspaceError={workspaceError}
          recommendedOptionId={workspace?.recommendedOptionId}
          options={options}
          selectedOptionId={selectedOptionId}
          setSelectedOptionId={setSelectedOptionId}
          decisionNotes={decisionNotes}
          setDecisionNotes={setDecisionNotes}
          requiresOverrideNotes={requiresOverrideNotes}
          submitLoading={submitLoading}
          submitError={submitError}
          formatHorizonLabel={formatHorizonLabel}
          handleValidateDecision={handleValidateDecision}
          resetAlertSelection={resetAlertSelection}
          selectAlert={selectAlert}
        />
      ) : (
        <ActionsHistorySection
          historyRows={historyRows}
          historyTotal={historyTotal}
          historyLoading={historyLoading}
          historyError={historyError}
          historyPage={historyPage}
          setHistoryPage={setHistoryPage}
        />
      )}
    </div>
  );
}
