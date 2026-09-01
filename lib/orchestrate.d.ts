/**
 * Orchestrate command for Subagent Director (merged from the standalone
 * `orchestrate` plugin).
 *
 * Adds a `/orchestrate on|off` slash command that flips a per-session
 * projection and, when on, injects a pure-orchestrator system-prompt section.
 * The orchestrator delegates exclusively through the subagent-director
 * delegation tool, whose model-facing name is `config.toolName` (default
 * `subagent_role`) and is threaded in here as `toolName`.
 *
 * Naming caveat (observed on a live 0.1.1-rc.x web host): the assembled tool catalog
 * contains BOTH this plugin's `subagent_role` and the base bundle's built-in
 * `subagent` / `subagent_fork`, plus the base bundle's subagent control tools
 * `list_agents` / `send_message` / `interrupt_agent`. They are distinct tools,
 * not two names for one wire entry. The prompt below names `toolName`
 * explicitly precisely because a model that reaches for the built-in
 * `subagent` bypasses role persona and role toolFilter.
 *
 * The role list rendered into the prompt is derived dynamically from the live
 * plugin settings (`subagent-director.roles`) — the same source `guidance.ts`
 * reads — so it never hard-codes role ids and stays correct when the operator
 * reconfigures roles. When no roles are configured the prompt tells the user
 * to configure them rather than silently emitting an empty section.
 *
 * Service posture mirrors `guidance.ts`: `commands` and `sessionProjections` are
 * acquired reactively through `ctx.inject` (so the `/orchestrate` command and the
 * projection register as soon as the host service is ready, even if it mounts
 * slightly after `apply`), while `systemPrompt` is still read lazily via
 * `ctx.get`. A host that never provides `sessionProjections` degrades to an
 * honest error from the command handler rather than a silent no-op.
 */
import type { Context } from '@deepseek-ai/cordis';
import { type OrchestrateEnforcement } from './orchestrate-guard.js';
import type { SubagentDirectorSettings } from './settings.js';
/** Stable system-prompt section name. */
export declare const ORCHESTRATE_SECTION_NAME = "orchestrate-mode";
/** Prompt order: sits low (55) so the orchestrator contract is near the top. */
export declare const ORCHESTRATE_SECTION_ORDER = 55;
/** Per-session projection key holding the orchestrator on/off state. */
export declare const ORCHESTRATE_PROJECTION_KEY = "orchestrate";
/** Session event type emitted when the mode changes. */
export declare const ORCHESTRATE_EVENT_TYPE = "orchestrate/change";
/** Accepted mode values. */
export declare const ORCHESTRATE_VALID_MODES: readonly ['on', 'off'];
export type OrchestrateMode = (typeof ORCHESTRATE_VALID_MODES)[number];
/** Per-turn orchestrate request parsed from one user message. */
export type OrchestrateRequest = 'on' | 'off' | undefined;
/**
 * Detect whether a user message requests pure-orchestrator mode for this turn.
 * Slash form: `/orchestrate` — `off` → off; no args, `on`, or any task text
 * (e.g. `/orchestrate 分析上周A股走势`) → on.
 * Natural-language form (case-insensitive, anchored at the start with an
 * optional politeness prefix so questions like 什么是orchestrate模式 do not
 * false-positive): 使用orchestrate模式 / 使用 orchestrate mode / use orchestrate mode.
 */
export declare function detectOrchestrateRequest(text: string): OrchestrateRequest;
/**
 * Short notice injected instead of the pure-orchestrator frame when the mode
 * is on but no roles are configured: the model must inform the user and
 * continue in normal mode — never sit paralyzed (the "returns nothing" bug).
 */
export declare function renderOrchestratorUnavailableNotice(toolName: string): string;
interface OrchestrateState {
    mode: OrchestrateMode;
}
declare module '@deepseek-ai/dsh-session/types' {
    interface SessionEventMap {
        'orchestrate/change': {
            mode: OrchestrateMode;
        };
    }
}
declare module '@deepseek-ai/dsh-session-projection/types' {
    interface SessionProjectionStateMap {
        /** /orchestrate mode state, folded from `orchestrate/change` events. */
        orchestrate: OrchestrateState;
    }
    interface SessionProjectionMap {
        /** Client-visible wire payload of the orchestrate projection unit. */
        orchestrate: {
            mode: OrchestrateMode;
        };
    }
}
/**
 * Detect whether the CURRENT turn of a session is per-turn orchestrated
 * (natural-language 使用orchestrate模式 in the turn's first user message, or a
 * `/orchestrate <task>` command/run inside this turn's boundary). Shared by
 * the system-prompt section and the strict tool guard so prompt injection and
 * enforcement always agree on the same event stream. Returns 'on' | 'off' |
 * undefined — 'off' means this turn explicitly opted OUT of per-turn
 * orchestration (sticky mode is resolved separately).
 * @param session - a live Session (or a faithful fake with `.events`).
 */
export declare function detectPerTurnOrchestrate(session: unknown): OrchestrateRequest;
/**
 * Build the data-independent framing of the orchestrator prompt for a given
 * delegation tool name. The role list is appended separately by
 * {@link renderOrchestratorRoles}.
 * @param toolName - the configured model-facing delegation tool name.
 * @param enforcement - 'strict' (default) or 'lenient'; the frame states the
 * REAL enforcement scope so the prompt never claims tool-level blocking that
 * the configured guard does not perform (per-turn orchestration is
 * prompt-only under 'lenient').
 */
export declare function buildOrchestratorFrame(toolName: string, enforcement?: OrchestrateEnforcement): string;
/**
 * Render the role list portion of the orchestrator prompt from the live
 * settings. Returns a "configure roles first" notice when no roles exist so
 * the operator is told what to do instead of receiving a blank contract.
 * @param settings - current resolved settings snapshot.
 * @param toolName - the configured model-facing delegation tool name.
 */
export declare function renderOrchestratorRoles(settings: SubagentDirectorSettings, toolName: string): string;
/**
 * Assemble the full orchestrator prompt (framing + dynamic role list).
 * @param settings - current resolved settings snapshot.
 * @param toolName - the configured model-facing delegation tool name.
 */
export declare function renderOrchestratorPrompt(settings: SubagentDirectorSettings, toolName: string, enforcement?: OrchestrateEnforcement): string;
/**
 * Resolve the effective orchestrate mode for one of the candidate session
 * objects that may carry the `orchestrate/change` event(s). Shared by the
 * system-prompt section (prompt injection) and the tool guard (enforcement),
 * so the two can never diverge on which session is in orchestrate mode.
 * Returns 'on' as soon as any candidate says so; otherwise the first known
 * value; `undefined` when no candidate yields a value (callers must treat
 * that as "not on" and warn — never silently pretend).
 * @param projections - the live sessionProjections service (or undefined).
 * @param sessionCandidates - session objects to probe, most-canonical first.
 * @param warn - optional sink for per-candidate projection errors.
 */
export declare function resolveOrchestrateMode(projections: unknown, sessionCandidates: readonly unknown[], warn?: (message: string, err?: unknown) => void): OrchestrateMode | undefined;
/**
 * Wire the `/orchestrate` command, its session projection, the orchestrator
 * prompt section, and the tool-level enforcement guard into the host. Each
 * host-plane service is acquired lazily and guarded, so a missing service
 * degrades to a no-op.
 * @param ctx - plugin context.
 * @param getSettings - returns the current settings snapshot.
 * @param toolName - the configured model-facing delegation tool name.
 * @param options - optional policy overrides; `readOnlyTools` replaces the
 * default read-only allow-list for the orchestrate guard (fail-closed design:
 * any tool not in the allow-list is blocked for the main agent while mode is on),
 * `enforcement` picks the guard/prompt strictness ('strict' default: sticky +
 * per-turn tool-enforced; 'lenient': sticky tool-enforced, per-turn prompt-only).
 * `getEnforcement` is an optional live resolver: when present it overrides
 * `enforcement` on every guard/prompt evaluation so a settings-page toggle
 * applies without a restart.
 */
export declare function applyOrchestrate(ctx: Context, getSettings: () => SubagentDirectorSettings, toolName: string, options?: {
    readOnlyTools?: readonly string[];
    enforcement?: OrchestrateEnforcement;
    getEnforcement?: () => OrchestrateEnforcement;
}): void;
export {};
//# sourceMappingURL=orchestrate.d.ts.map