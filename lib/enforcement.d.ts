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
export declare function resolveEnforcementLevel(config?: EnforcementConfigInput | null): OrchestrateEnforcement;
/**
 * Layered enforcement resolution:
 *   1. User settings when any enforcement switch is explicitly configured;
 *   2. Else mount config;
 *   3. Fallback to 'strict'.
 */
export declare function resolveLayeredEnforcement(mountConfig?: EnforcementConfigInput | null, userSettings?: EnforcementConfigInput | null): OrchestrateEnforcement;
/**
 * Derive the master switch and per-round switch from an OrchestrateEnforcement level.
 *  - 'strict'  -> { orchestrateInterceptTools: true,  orchestrateRoundIntercept: true }
 *  - 'lenient' -> { orchestrateInterceptTools: true,  orchestrateRoundIntercept: false }
 *  - 'none'    -> { orchestrateInterceptTools: false, orchestrateRoundIntercept: false }
 */
export declare function deriveSwitchesFromEnforcement(enforcement: OrchestrateEnforcement): {
    orchestrateInterceptTools: boolean;
    orchestrateRoundIntercept: boolean;
};
//# sourceMappingURL=enforcement.d.ts.map