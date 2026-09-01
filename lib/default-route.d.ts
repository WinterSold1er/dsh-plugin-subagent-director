/**
 * Default route seam (design: 默认模型兜底).
 *
 * Makes the plugin's configured `defaultProvider`/`defaultModel` apply to ANY
 * subagent start that did not carry an explicit `agentOptions` — including
 * starts initiated by the built-in `subagent` / `subagent_fork` tools, not just
 * the plugin's own `subagent_role`. This closes the gap where the model picks
 * the built-in tool and the configured defaults never take effect.
 *
 * Layering: explicit `agentOptions` (even partial) always wins; the seam is a
 * best-effort default. An un-routable default provider falls back to
 * inheritance and never throws, so a bad default cannot break built-in
 * delegation; the strict `fallbackOnInvalid` error semantics remain the
 * property of `subagent_role`'s explicit path (route-resolver.ts).
 */
import type { AgentOptions } from '@deepseek-ai/dsh-agent';
import type { ContinuableStart, ContinuableStartSpec, SubagentRun, SubagentStartRequest } from '@deepseek-ai/dsh-subagent';
import type { SubagentDirectorSettings } from './route-resolver.js';
export interface SeamResolveInput {
    agentOptions?: AgentOptions;
    settings: SubagentDirectorSettings;
    isRoutable?: (provider: string) => boolean;
}
export declare function resolveSeamAgentOptions(input: SeamResolveInput): Pick<AgentOptions, 'provider' | 'model'> | undefined;
/** The subset of the subagent service the seam wraps. */
export interface SubagentsSeam {
    start(name: string, request: SubagentStartRequest): Promise<SubagentRun>;
    startContinuable(spec: ContinuableStartSpec): Promise<ContinuableStart>;
}
/** Structural context the seam needs; keeps the wrapper unit-testable. */
export interface DefaultRouteSeamContext {
    get(name: string): unknown;
    logger: {
        info(message: string): void;
        warn(message: string): void;
    };
    subagents: SubagentsSeam;
}
/**
 * Wrap `ctx.subagents.start` / `startContinuable` so a subagent start without
 * explicit `agentOptions` receives the configured defaults. Returns a disposer
 * that restores the original methods (registered via `ctx.effect` by the
 * caller, so it runs when the plugin fiber unloads).
 */
export declare function applyDefaultRouteSeam(ctx: DefaultRouteSeamContext, getSettings: () => SubagentDirectorSettings): () => void;
//# sourceMappingURL=default-route.d.ts.map