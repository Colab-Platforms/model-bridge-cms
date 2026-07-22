import { describe, expect, it } from "vitest";

import { decideThresholdAlert } from "./threshold-alert.service.js";

describe("decideThresholdAlert", () => {
  it("sends when triggered and no alert is active yet", () => {
    expect(decideThresholdAlert({ isTriggered: true, alertActive: false })).toEqual({
      shouldSend: true,
      shouldResolve: false,
    });
  });

  it("does not resend while still triggered and already active (avoid duplicate spam)", () => {
    expect(decideThresholdAlert({ isTriggered: true, alertActive: true })).toEqual({
      shouldSend: false,
      shouldResolve: false,
    });
  });

  it("resolves when no longer triggered but an alert is still active", () => {
    expect(decideThresholdAlert({ isTriggered: false, alertActive: true })).toEqual({
      shouldSend: false,
      shouldResolve: true,
    });
  });

  it("does nothing when not triggered and no alert is active", () => {
    expect(decideThresholdAlert({ isTriggered: false, alertActive: false })).toEqual({
      shouldSend: false,
      shouldResolve: false,
    });
  });

  it("suppresses resolution for one-shot alerts (supportsResolution: false)", () => {
    expect(
      decideThresholdAlert({ isTriggered: false, alertActive: true, supportsResolution: false })
    ).toEqual({
      shouldSend: false,
      shouldResolve: false,
    });
  });

  it("still sends for one-shot alerts when newly triggered", () => {
    expect(
      decideThresholdAlert({ isTriggered: true, alertActive: false, supportsResolution: false })
    ).toEqual({
      shouldSend: true,
      shouldResolve: false,
    });
  });
});
