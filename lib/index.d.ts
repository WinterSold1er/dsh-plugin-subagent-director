/**
 * Subagent Director — host plugin composition entry (design section 3).
 *
 * Wires the settings section, the role-guidance section, and the subagent_role
 * delegation tool. Reads user settings live; a deployment without a settings
 * provider degrades to an empty resolved section (zero intrusion).
 *
 * Dependency posture: tools/subagents/llm/settings are required through inject
 * (both web and headless bundles mount the settings service); systemPrompt
 * remains optional and is acquired lazily so its absence does not block the
 * rest. The /orchestrate command's `commands` dependency likewise stays
 * optional — acquired reactively (ctx.inject child fiber) in orchestrate.ts,
 * so hosts without a command registry lose only that command. The
 * webServer-dependent HTTP bridge lives in the separate
 * \`subagent-director-bridge\` entry (src/bridge-entry.ts).
 *
 * Background modes: 'one-shot' defaults calls to foreground and runs background
 * calls as a plain Task; 'continuable' defaults them to background via
 * ctx.subagents.startContinuable() and requires the transport provider's
 * prepareContinuable capability, which is validated at mount time (mirrors
 * dsh-tool-subagent).
 */
import type { Context } from '@deepseek-ai/cordis';
export { Config } from './config.js';
export type { DirectorConfig } from './config.js';
export { assertDelegationCapabilities, buildSubagentRequest, createDelegationParameters, createDelegationOutputSchema, createDelegationTool, DELEGATION_TOOL_PREFIX, resolveDelegationMode, renderDelegationResult, type DelegationToolArgs, type DelegationResult, type DelegationRoute, type DelegationModeDecision, type SubagentRequestParts, } from './delegation-tool.js';
export { applyGuidance, renderRolesGuidance, GUIDANCE_SECTION_ORDER, GUIDANCE_SECTION_NAME } from './guidance.js';
export { applyOrchestrate, renderOrchestratorPrompt, renderOrchestratorRoles, renderOrchestratorUnavailableNotice, buildOrchestratorFrame, detectOrchestrateRequest, ORCHESTRATE_SECTION_NAME, ORCHESTRATE_SECTION_ORDER, ORCHESTRATE_PROJECTION_KEY, ORCHESTRATE_EVENT_TYPE, ORCHESTRATE_VALID_MODES, resolveOrchestrateMode, type OrchestrateMode, type OrchestrateRequest, } from './orchestrate.js';
export { createOrchestrateToolGuard, orchestrateAlwaysAllowedTools, ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS, type OrchestrateGuardDeps, } from './orchestrate-guard.js';
export { CLOSE_SUBAGENT_TOOL_NAME, createCloseSubagentTool } from './close-tool.js';
export { SUBAGENT_DIRECTOR_SETTINGS_NAMESPACE, SettingsSchema, validateDirectorSettings, installDirectorSettings, type RoleTemplate, type SubagentDirectorSettings, } from './settings.js';
export declare const name = "subagent-director";
export declare const inject: string[];
export declare function apply(ctx: Context, config: import('./config.js').DirectorConfig): void;
//# sourceMappingURL=index.d.ts.map