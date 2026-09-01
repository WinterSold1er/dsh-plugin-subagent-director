/**
 * Delegation tool subagent_role (design section 7).
 *
 * A model-facing tool that lets the calling agent delegate to a subagent while
 * selecting an LLM route and/or a named role template. It resolves the four-layer
 * fallback chain via the pure resolveRoute (design section 6), validates the
 * resolution against live runtime facts, and assembles a SubagentStartRequest
 * on ctx.subagents.start(...) exactly like dsh-workflow-worker-thread's
 * startChild and dsh-tool-subagent's one-shot path.
 *
 * Two provider namespaces coexist and MUST NOT be confused (design section 14, R2):
 *   - config.subagentProvider is the subagent TRANSPORT provider name handed
 *     to ctx.subagents.start(name, ...) (e.g. spawn).
 *   - the resolved agentOptions.provider is an LLM route served by an adapter
 *     (e.g. deepseek-official).
 *
 * Execution contract (schema/execute mirror dsh-tool-subagent):
 *   - foreground is the core path: await run.result, throw a stop-reason
 *     error for a non-completed child, dispose idempotently, return
 *     { kind: foreground, runId, output }.
 *   - one-shot background mirrors the official Task registration on
 *     ctx.jobs.start({ kind: subagent, ... }) returning { kind: background, jobId }.
 *   - continuable runs the child through ctx.subagents.startContinuable() and
 *     returns { kind: continuable, subagentId } (the durable child id), which the
 *     parent later follows up on with send_message (M3a / FR-5.3).
 *
 * reasoningEffort: the DSH AgentOptions and SubagentStartRequest shapes do
 * not carry reasoning effort (dsh-agent runtime-types.d.ts, dsh-subagent
 * types.d.ts), so it is surfaced and logged only, never injected (route-resolver
 * already returns it separately for auditability).
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent, AgentOptions } from '@deepseek-ai/dsh-agent';
import { type JsonValue, type ParameterSchemaSpec, type ValueSchemaSpec } from '@deepseek-ai/dsh-tools';
import type { ContentBlock } from '@deepseek-ai/dsh-llm';
import type { SubagentProvider } from '@deepseek-ai/dsh-subagent';
import type { DirectorConfig } from './config.js';
import { type RouteToolFilter, type SubagentDirectorSettings } from './route-resolver.js';
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
    /** Reasoning-effort override (optional; advisory — logged, not injected). */
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
 * and its absence is a hard error (FR-8.1 / design 7.3). persona, toolFilter,
 * and a numeric maxDepth each require the matching capability flag.
 */
export declare function assertDelegationCapabilities(options: {
    providerName: string;
    persona?: string;
    toolFilter?: RouteToolFilter;
    capabilities: {
        persona: boolean;
        toolFilter: boolean;
        depthLimit: boolean;
    };
    maxDepth?: number | 'provider-managed';
}): void;
/** The route-derived fields that flow into a SubagentStartRequest body. */
export interface SubagentRequestParts {
    description: string;
    prompt: ContentBlock[];
    parent: Agent;
    agentOptions?: Pick<AgentOptions, 'provider' | 'model'>;
    persona?: string;
    toolFilter?: RouteToolFilter;
    maxDepth?: number;
}
/**
 * Pure request-body assembly (extracted from execute for unit testing,
 * behavioral no-op): persona and toolFilter propagate into the request only
 * when the role resolved them, so a bare delegation stays zero-intrusion.
 */
export declare function buildSubagentRequest<Parts extends SubagentRequestParts>(parts: Parts): {
    label: string;
    prompt: ContentBlock[];
    parent: Agent;
    agentOptions?: Pick<AgentOptions, "model" | "provider"> | undefined;
    persona?: string | undefined;
    toolFilter?: RouteToolFilter | undefined;
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