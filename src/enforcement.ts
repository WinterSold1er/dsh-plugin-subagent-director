/**
 * Pure enforcement level resolution and switch derivation (design section 5.2).
 *
 * This module has ZERO external runtime dependencies (no cordis, no schemastery),
 * allowing it to be safely imported into both host and browser-side client code
 * without leaking server-side dependencies into client bundles.
 */

import type { OrchestrateEnforcement } from './orchestrate-guard.js';

export type { OrchestrateEnforcement } from './orchestrate-guard.js';

/** Configuration input shape for resolving enforcement level. */
export interface EnforcementConfigInput {
  orchestrateInterceptTools?: boolean;
  orchestrateRoundIntercept?: boolean;
  orchestrateEnforcement?: OrchestrateEnforcement;
}

/**
 * Resolve the effective OrchestrateEnforcement level from configuration input.
 * Priority:
 *  1. If config is absent, baseline is 'strict'.
 *  2. If orchestrateInterceptTools is explicitly false, enforcement is 'none'.
 *  3. If orchestrateRoundIntercept is explicitly false, enforcement is 'lenient'.
 *  4. If orchestrateRoundIntercept is explicitly true, enforcement is 'strict'.
 *  5. Fall back to legacy orchestrateEnforcement if present ('strict' | 'lenient' | 'none').
 *  6. Baseline when unconfigured (including orchestrateInterceptTools: true alone) is 'strict'.
 */
export function resolveEnforcementLevel(config?: EnforcementConfigInput | null): OrchestrateEnforcement {
  if (!config) return 'strict';
  if (config.orchestrateInterceptTools === false) return 'none';
  if (config.orchestrateRoundIntercept === false) return 'lenient';
  if (config.orchestrateRoundIntercept === true) return 'strict';
  if (config.orchestrateEnforcement !== undefined) return config.orchestrateEnforcement;
  return 'strict';
}

/**
 * Layered enforcement resolution:
 *   1. User settings when any enforcement switch is explicitly configured;
 *   2. Else mount config;
 *   3. Fallback to 'strict'.
 */
export function resolveLayeredEnforcement(
  mountConfig?: EnforcementConfigInput | null,
  userSettings?: EnforcementConfigInput | null,
): OrchestrateEnforcement {
  if (
    userSettings &&
    (userSettings.orchestrateInterceptTools !== undefined ||
      userSettings.orchestrateRoundIntercept !== undefined ||
      userSettings.orchestrateEnforcement !== undefined)
  ) {
    return resolveEnforcementLevel(userSettings);
  }
  return resolveEnforcementLevel(mountConfig);
}

/**
 * Derive the master switch and per-round switch from an OrchestrateEnforcement level.
 *  - 'strict'  -> { orchestrateInterceptTools: true,  orchestrateRoundIntercept: true }
 *  - 'lenient' -> { orchestrateInterceptTools: true,  orchestrateRoundIntercept: false }
 *  - 'none'    -> { orchestrateInterceptTools: false, orchestrateRoundIntercept: false }
 */
export function deriveSwitchesFromEnforcement(enforcement: OrchestrateEnforcement): {
  orchestrateInterceptTools: boolean;
  orchestrateRoundIntercept: boolean;
} {
  switch (enforcement) {
    case 'strict':
      return { orchestrateInterceptTools: true, orchestrateRoundIntercept: true };
    case 'lenient':
      return { orchestrateInterceptTools: true, orchestrateRoundIntercept: false };
    case 'none':
    default:
      return { orchestrateInterceptTools: false, orchestrateRoundIntercept: false };
  }
}
