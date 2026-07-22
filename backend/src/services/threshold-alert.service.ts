export interface ThresholdAlertDecision {
  shouldSend: boolean;
  shouldResolve: boolean;
}

/**
 * Pure send/resolve decision for a "value crossed a threshold" alert — shared by
 * every threshold-based alert in this codebase (provider balance, API key expiry,
 * API key credit limit) so the dedup rule lives in one place instead of being
 * reimplemented per alert.
 *
 * - shouldSend: the threshold is currently crossed and no alert is active yet.
 * - shouldResolve: the threshold is no longer crossed but an alert is still active
 *   (only meaningful for bidirectional alerts like provider balance; one-shot
 *   alerts like API key expiry/limit pass supportsResolution: false and ignore it).
 */
export const decideThresholdAlert = (input: {
  isTriggered: boolean;
  alertActive: boolean;
  supportsResolution?: boolean;
}): ThresholdAlertDecision => {
  const supportsResolution = input.supportsResolution ?? true;

  if (input.isTriggered && !input.alertActive) {
    return { shouldSend: true, shouldResolve: false };
  }

  if (!input.isTriggered && input.alertActive && supportsResolution) {
    return { shouldSend: false, shouldResolve: true };
  }

  return { shouldSend: false, shouldResolve: false };
};
