import type { ComplexityTier } from "@prisma/client";

/**
 * Short tags for the common paths, but the field itself is a plain string — the
 * complexity-router auto-route path stores a longer, human-readable joined-signals
 * string here instead (see complexity-router.ts's ComplexityClassification.signals).
 */
export type RoutingReason =
  | "EXPLICIT_MODEL"
  | "EXPLICIT_MODEL_FREE_TIER"
  | "AUTO_COMPLEXITY_ROUTE"
  | "FREE_TIER_FALLBACK";

export interface RoutingMeta {
  requestedModelSlug: string;
  routingReason: string;
  /** Set only on the "auto" path — the complexity tier the classifier resolved to (post FREE_TIER_CAP). */
  complexityTier?: ComplexityTier;
  /** Set only on the "auto" path — the classifier's raw weighted score (not clamped, can be negative). */
  complexityScore?: number;
}
