/**
 * Plugin Config for Subagent Director (the Cordis composition-entry layer).
 *
 * This mirrors the field semantics of `@deepseek-ai/dsh-tool-subagent` (see
 * its `lib/types/index.d.ts`) so the two delegation tools stay behaviourally
 * consistent in the ecosystem.
 *
 * Two provider namespaces live side by side here and MUST NOT be confused
 * (design section 14, risk R2):
 *   - `subagentProvider`: the subagent TRANSPORT provider name handed to
 *     `ctx.subagents.startActivation({ provider, ... })` (e.g. `spawn`, `fork`, `acp`).
 *   - `agentOptions.provider` / `defaultProvider` (settings): the LLM route
 *     provider that actually serves model requests (e.g. `deepseek-official`,
 *     a pi-ai route). They are unrelated name spaces.
 */
import z from '@deepseek-ai/schemastery';
import type { OrchestrateEnforcement } from './orchestrate-guard.js';
/**
 * Cordis-layer plugin configuration (composition fields).
 *
 * All fields are optional so an empty composition entry degrades to the DSH
 * default behaviour (inherit the parent agent's model; one-shot foreground).
 */
export interface DirectorConfig {
    /**
     * The subagent TRANSPORT provider to start runs on. This is the `provider`
     * field of the `ctx.subagents.startActivation(spec)` spec, NOT an LLM route.
     * Default 'spawn'.
     */
    subagentProvider?: string;
    /**
     * Model-facing tool name for THIS plugin's delegation tool, default
     * 'subagent_role'. Each loaded instance must use a distinct name.
     *
     * Not the same tool as DSH's built-in `subagent` / `subagent_fork`: those are
     * registered by the base bundle and coexist with this one in the same request
     * tool catalog. Only calls that go through this name apply role persona and
     * role `toolFilter`; a model that picks the built-in `subagent` instead gets
     * neither (the official dsh-tool-subagent owns model selection for the
     * built-in tools through its `modelSelectionSettings`).
     */
    toolName?: string;
    /** Expose `run_in_background` (default true). Disabled instances omit the argument. */
    enableRunInBackground?: boolean;
    /**
     * Background execution policy (default 'one-shot'). On the 0.2.x
     * startActivation seam both policies start a managed activation; the policy
     * only sets the default of the tool's `run_in_background` argument.
     * 'one-shot' defaults calls to foreground (delivery 'caller', the tool awaits
     * the result); a background call (delivery 'parent') returns the durable
     * child id and the runtime notifies the parent. 'continuable' defaults calls
     * to background and requires the transport provider's prepareContinuable
     * capability (validated at mount), so the child is a local session the parent
     * can later steer with send_message (FR-5.3).
     */
    backgroundMode?: 'one-shot' | 'continuable';
    /**
     * Maximum child delegation depth (default 3). A numeric cap requires the
     * provider's `depthLimit` capability. 'provider-managed' sends no cap.
     */
    maxDepth?: number | 'provider-managed';
    /** Read-only tool allow-list used by the orchestrate tool guard (fail-closed). */
    orchestrateReadOnlyTools?: readonly string[];
    /** Mount-level default for orchestrate enforcement (strict-at-the-bottom). */
    orchestrateEnforcement?: OrchestrateEnforcement;
}
/**
 * Schemastery schema for the plugin Config — the authoritative schema on DSH
 * 0.1.7. It carries both the composition fields (plain, restart-managed) and the
 * settings fields (volatile, live-editable); only the volatile settings fields
 * surface in the Host settings form (`volatileForm`), so the settings UI is
 * unchanged. The entry id `subagent-director` is the ns `describe()`/`mutate()`
 * address.
 */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    defaultProvider: z<string, string, "volatile">;
    defaultModel: z<string, string, "volatile">;
    defaultReasoningEffort: z<string, string, "volatile">;
    defaultRole: z<string, string, "volatile">;
    fallbackOnInvalid: z<boolean, boolean, "volatile-defined">;
    roles: z<NoInfer<import("@deepseek-ai/cosmokit").Dict<{
        displayName?: string | null | undefined;
        description?: string | null | undefined;
        agentPreset?: string | null | undefined;
        persona?: string | null | undefined;
        provider?: string | null | undefined;
        model?: string | null | undefined;
        reasoningEffort?: string | null | undefined;
        toolFilter?: ({
            allow?: string[] | null | undefined;
            deny?: string[] | null | undefined;
        } & import("@deepseek-ai/cosmokit").Dict) | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict, string>>, NoInfer<import("@deepseek-ai/cosmokit").Dict<Schemastery.ObjectT<NoInfer<{
        displayName: z<string, string, "defined">;
        description: z<string, string, "defined">;
        agentPreset: z<string, string, "plain">;
        persona: z<string, string, "plain">;
        provider: z<string, string, "plain">;
        model: z<string, string, "plain">;
        reasoningEffort: z<string, string, "plain">;
        toolFilter: z<Schemastery.ObjectS<NoInfer<{
            allow: z<string[], string[], "plain">;
            deny: z<string[], string[], "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            allow: z<string[], string[], "plain">;
            deny: z<string[], string[], "plain">;
        }>>, "defined">;
    }>>, string>>, "volatile">;
    orchestrateEnforcement: z<"lenient" | "none" | "strict", "lenient" | "none" | "strict", "volatile">;
    orchestrateInterceptTools: z<boolean, boolean, "volatile">;
    orchestrateRoundIntercept: z<boolean, boolean, "volatile">;
    subagentProvider: z<string, string, "defined">;
    toolName: z<string, string, "defined">;
    enableRunInBackground: z<boolean, boolean, "defined">;
    backgroundMode: z<"continuable" | "one-shot", "continuable" | "one-shot", "defined">;
    maxDepth: z<number | "provider-managed", number | "provider-managed", "plain">;
    orchestrateReadOnlyTools: z<string[], string[], "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    defaultProvider: z<string, string, "volatile">;
    defaultModel: z<string, string, "volatile">;
    defaultReasoningEffort: z<string, string, "volatile">;
    defaultRole: z<string, string, "volatile">;
    fallbackOnInvalid: z<boolean, boolean, "volatile-defined">;
    roles: z<NoInfer<import("@deepseek-ai/cosmokit").Dict<{
        displayName?: string | null | undefined;
        description?: string | null | undefined;
        agentPreset?: string | null | undefined;
        persona?: string | null | undefined;
        provider?: string | null | undefined;
        model?: string | null | undefined;
        reasoningEffort?: string | null | undefined;
        toolFilter?: ({
            allow?: string[] | null | undefined;
            deny?: string[] | null | undefined;
        } & import("@deepseek-ai/cosmokit").Dict) | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict, string>>, NoInfer<import("@deepseek-ai/cosmokit").Dict<Schemastery.ObjectT<NoInfer<{
        displayName: z<string, string, "defined">;
        description: z<string, string, "defined">;
        agentPreset: z<string, string, "plain">;
        persona: z<string, string, "plain">;
        provider: z<string, string, "plain">;
        model: z<string, string, "plain">;
        reasoningEffort: z<string, string, "plain">;
        toolFilter: z<Schemastery.ObjectS<NoInfer<{
            allow: z<string[], string[], "plain">;
            deny: z<string[], string[], "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            allow: z<string[], string[], "plain">;
            deny: z<string[], string[], "plain">;
        }>>, "defined">;
    }>>, string>>, "volatile">;
    orchestrateEnforcement: z<"lenient" | "none" | "strict", "lenient" | "none" | "strict", "volatile">;
    orchestrateInterceptTools: z<boolean, boolean, "volatile">;
    orchestrateRoundIntercept: z<boolean, boolean, "volatile">;
    subagentProvider: z<string, string, "defined">;
    toolName: z<string, string, "defined">;
    enableRunInBackground: z<boolean, boolean, "defined">;
    backgroundMode: z<"continuable" | "one-shot", "continuable" | "one-shot", "defined">;
    maxDepth: z<number | "provider-managed", number | "provider-managed", "plain">;
    orchestrateReadOnlyTools: z<string[], string[], "defined">;
}>>, "plain">;
//# sourceMappingURL=config.d.ts.map