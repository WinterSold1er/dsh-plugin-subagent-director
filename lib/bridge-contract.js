/** Absolute RPC channel the bridge owns on the Host web server. */
export const SUBAGENT_DIRECTOR_RPC_CHANNEL = '/subagent-director';
/** Endpoint that returns the namespace's redacted wire view. */
export const SUBAGENT_DIRECTOR_RPC_VIEW = 'settingsView';
/** Endpoint that applies one path-op mutation. */
export const SUBAGENT_DIRECTOR_RPC_MUTATE = 'settingsMutate';
/** Endpoint that releases one resident continuable child of a live parent. */
export const SUBAGENT_DIRECTOR_RPC_CLOSE = 'subagentClose';
/** Endpoint that returns the actual provider/model of one child session. */
export const SUBAGENT_DIRECTOR_RPC_MODEL = 'subagentModel';
/** Endpoint that returns the model-visible tool catalog for role tool-set editing. */
export const SUBAGENT_DIRECTOR_RPC_TOOLS = 'toolCatalog';
/**
 * Endpoint that returns the Subagent model-selection allowlist the page must
 * constrain picks to (the official `subagent-model-selection` section: the
 * "Subagent" plugin-config model list). Additive endpoint for alpha.4: the
 * llm catalog RPC is gone from the client, and Subagent Director may select a
 * provider/model ONLY from this list.
 */
export const SUBAGENT_DIRECTOR_RPC_CATALOG = 'settingsCatalog';
//# sourceMappingURL=bridge-contract.js.map