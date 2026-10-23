/**
 * Delegation tool subagent_role (design section 7).
 *
 * A model-facing tool that lets the calling agent delegate to a subagent while
 * selecting an LLM route and/or a named role template. It resolves the four-layer
 * fallback chain via the pure resolveRoute (design section 6), validates the
 * resolution against live runtime facts, and assembles a SubagentStartRequest
 * on ctx.subagents.startActivation(...) exactly like dsh-workflow-worker-thread's
 * startChild and dsh-tool-subagent's activation path.
 *
 * Two provider namespaces coexist and MUST NOT be confused (design section 14, R2):
 *   - config.subagentProvider is the subagent TRANSPORT provider name handed
 *     as the spec's `provider` field to ctx.subagents.startActivation(spec) (e.g. spawn).
 *   - the resolved agentOptions.provider is an LLM route served by an adapter
 *     (e.g. deepseek-official).
 *
 * Execution contract (schema/execute mirror dsh-tool-subagent on the 0.2.x
 * startActivation seam):
 *   - foreground is the core path: startActivation with delivery 'caller',
 *     await activation.result, throw a stop-reason error for a non-completed
 *     child, dispose idempotently, return { kind: foreground, runId, output }.
 *   - background runs the child through startActivation with delivery 'parent'
 *     (the runtime owns result delivery and notifies the parent model) and
 *     returns the durable child id immediately: { kind: continuable, subagentId }
 *     when the provider is continuable (the parent later follows up with
 *     send_message), else { kind: background, jobId } for a one-shot child.
 *
 * reasoningEffort: alpha.4 `AgentOptions` carries `reasoningEffort?:
 * ReasoningEffortId` (dsh-agent runtime-types), so the resolver injects it
 * into agentOptions alongside a resolved route (and allows an explicit
 * effort alone). Provider/model selection is CONSTRAINED to the official
 * `subagent-model-selection` allowedModels list: the resolver throws for an
 * unlisted explicit pair and drops unlisted role/default routes, so this
 * plugin never double-writes a model route the official tool also owns.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent, AgentOptions } from '@deepseek-ai/dsh-agent';
import { type ParameterSchemaSpec, type ValueSchemaSpec } from '@deepseek-ai/dsh-tools';
import type { JsonValue } from '@deepseek-ai/dsh-util-values';
import type { ContentBlock } from '@deepseek-ai/dsh-llm';
import type { SubagentCapabilities, SubagentProvider } from '@deepseek-ai/dsh-subagent';
import type { DirectorConfig } from './config.js';
import { type SubagentDirectorSettings } from './route-resolver.js';
/** Stable log namespace prefix for delegation/tool diagnostics (design section 10). */
export declare const DELEGATION_TOOL_PREFIX = "subagent-director";
/**
 * Delegate a task to a role-bound subagent with an optional LLM route override.
 * Resolves role/model/provider through the configure -> role -> default ->
 * inherit chain; role persona and tool filtering are applied when the chosen
 * subagent transport supports them.
 */
export interface DelegationToolArgs {
    /** A short (3-5 word) description of the delegated task, for display. */
    description: string;
    /** The complete, self-contained task for the subagent. */
    prompt: string;
    /** Role template id (optional). Falls back to the configured default role. */
    role?: string;
    /** LLM provider route override (optional). Wins over any role binding. */
    provider?: string;
    /** Model id override (optional). Wins over any role binding. */
    model?: string;
    /**
     * Reasoning-effort override (optional). With alpha.4 AgentOptions this is
     * injected onto the resolved route; may also be supplied alone (provider and
     * model stay inherited or role-bound).
     */
    reasoningEffort?: string;
    /**
     * Whether to run in the background. Defaults to false in one-shot mode; in
     * continuable mode it defaults to true and returns the durable child id for
     * later send_message follow-up.
     */
    run_in_background?: boolean;
}
/**
 * Build the model-facing tool parameter schema given a config. Exposed as a
 * pure function so unit tests can assert the model-visible shape without a live
 * context: description/prompt are required; role/provider/model/reasoningEffort
 * are optional; run_in_background appears only when enableRunInBackground is not
 * false. In continuable mode its description notes the default of true and the
 * durable-child-id return shape (mirrors dsh-tool-subagent's wording).
 */
export declare function createDelegationParameters(config: Pick<DirectorConfig, 'enableRunInBackground' | 'backgroundMode'>): ParameterSchemaSpec;
/** The model-facing output schema: exactly one of background, continuable, or foreground. */
export declare function createDelegationOutputSchema(): ValueSchemaSpec;
/** The outcome of one execute-time read of the official model selection. */
export interface ModelSelectionRead {
    /** Whether a readable `subagent-model-selection` section exists on the seam. */
    sectionPresent: boolean;
    /**
     * The authorized exact routes when the official selection is enabled with a
     * non-empty allowlist; undefined otherwise (no constraint).
     */
    allowedRoutes: Array<{
        provider: string;
        model: string;
    }> | undefined;
}
/**
 * Read the official model-selection settings section through the settings seam
 * at execute time (the official dsh-tool-subagent owns this namespace). On
 * 0.1.7 there is no `settings.get(ns)`; the live value is read from
 * `describe()`'s descriptor for the entry id `subagent-model-selection-settings`
 * (see readNamespaceValue). An inactive/unreadable section simply means no
 * authorized list.
 */
export declare function readModelSelection(ctx: Context): ModelSelectionRead;
/** The resolved execution route for one delegation call. */
export type DelegationRoute = 'foreground' | 'one-shot' | 'continuable';
/** The mode decision for one delegation: whether to run in the background, and which route to use. */
export interface DelegationModeDecision {
    runInBackground: boolean;
    route: DelegationRoute;
}
/**
 * Pure mode decision (extracted for unit testing) mirroring dsh-tool-subagent's
 * resolveDelegationRun: a forced background while the flag is disabled is
 * rejected; otherwise background defaults to the configured mode's policy —
 * false for one-shot, true for continuable.
 */
export declare function resolveDelegationMode(request: Pick<DelegationToolArgs, 'run_in_background'>, options: {
    backgroundEnabled: boolean;
    continuable: boolean;
}): DelegationModeDecision;
/** The union of delegation result shapes produced by execute. */
export type DelegationResult = {
    kind: 'background';
    jobId: string;
} | {
    kind: 'continuable';
    subagentId: string;
} | {
    kind: 'foreground';
    runId: string;
    output: JsonValue[];
};
/**
 * Pure renderer for a delegation result (extracted for unit testing). Mirrors
 * dsh-tool-subagent's output.render: a continuable child renders as
 * "started subagent <id>"; a one-shot task keeps its tool-name-qualified text;
 * a foreground result emits its joined text blocks.
 */
export declare function renderDelegationResult(value: DelegationResult | {
    kind: 'foreground';
    output: object[];
}, toolName: string): string;
/**
 * Pure capability gate (extracted from execute for unit testing, behavioral
 * no-op): a resolved delegation feature demands a transport-provider capability,
 * and its absence is a hard error (FR-8.1 / design 7.3). An independent Agent
 * Preset requires `agentPreset` support and a provider that does not inherit
 * the parent conversation; a numeric maxDepth requires `depthLimit`.
 */
export declare function assertDelegationCapabilities(options: {
    providerName: string;
    agentPreset?: string;
    capabilities: SubagentCapabilities;
    inheritsParentContext?: boolean;
    maxDepth?: number | 'provider-managed';
}): void;
/** The route-derived fields that flow into a SubagentStartRequest body. */
export interface SubagentRequestParts {
    description: string;
    prompt: ContentBlock[];
    parent: Agent;
    agentOptions?: Pick<AgentOptions, 'provider' | 'model' | 'reasoningEffort'>;
    agentPreset?: string;
    maxDepth?: number;
}
/**
 * Pure request-body assembly (extracted from execute for unit testing,
 * behavioral no-op): an Agent Preset propagates into the request only when the
 * role resolved one, so a bare delegation stays zero-intrusion. DSH 0.2.1
 * removed per-request persona/toolFilter; role persona/tool composition now
 * lives inside the selected Agent Preset.
 *
 * On the 0.2.x startActivation seam the `label` and `signal` are hoisted to
 * the activation spec, so the inner request omits them (the spec carries
 * `label: parts.description` and `signal: exec.signal`).
 */
export declare function buildSubagentRequest<Parts extends SubagentRequestParts>(parts: Parts): {
    prompt: ContentBlock[];
    parent: Agent;
    agentOptions?: Pick<AgentOptions, "model" | "provider" | "reasoningEffort"> | undefined;
    agentPreset?: string | undefined;
    maxDepth?: number | undefined;
};
/**
 * Create the subagent_role ToolDefinition for one mounted subagent transport
 * provider. getSettings returns the current settings snapshot so execute reads
 * live role/default layers.
 */
export declare function createDelegationTool(options: {
    ctx: Context;
    config: DirectorConfig;
    provider: SubagentProvider;
    getSettings: () => SubagentDirectorSettings;
}): import("@deepseek-ai/dsh-tools").ToolDefinition;
//# sourceMappingURL=delegation-tool.d.ts.map