import { z } from 'zod';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session';
import { createOrchestrateToolGuard, ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS, } from './orchestrate-guard.js';
/** Stable system-prompt section name. */
export const ORCHESTRATE_SECTION_NAME = 'orchestrate-mode';
/** Prompt order: sits low (55) so the orchestrator contract is near the top. */
export const ORCHESTRATE_SECTION_ORDER = 55;
/** Per-session projection key holding the orchestrator on/off state. */
export const ORCHESTRATE_PROJECTION_KEY = 'orchestrate';
/** Session event type emitted when the mode changes. */
export const ORCHESTRATE_EVENT_TYPE = 'orchestrate/change';
/** Accepted mode values. */
export const ORCHESTRATE_VALID_MODES = ['on', 'off'];
/**
 * Detect whether a user message requests pure-orchestrator mode for this turn.
 * Slash form: `/orchestrate` — `off` → off; no args, `on`, or any task text
 * (e.g. `/orchestrate 分析上周A股走势`) → on.
 * Natural-language form (case-insensitive, anchored at the start with an
 * optional politeness prefix so questions like 什么是orchestrate模式 do not
 * false-positive): 使用orchestrate模式 / 使用 orchestrate mode / use orchestrate mode.
 */
export function detectOrchestrateRequest(text) {
    const trimmed = text.trimStart();
    const slash = trimmed.match(/^\/orchestrate(?:\s+(\S+))?/i);
    if (slash) {
        const arg = (slash[1] ?? '').trim().toLowerCase();
        if (arg === 'off')
            return 'off';
        return 'on';
    }
    if (/^(请|麻烦|麻烦你|帮我|请帮我|我想|我要)?\s*使用\s*orchestrate\s*(模式|mode)/i.test(trimmed))
        return 'on';
    if (/^use\s+orchestrate\s+mode/i.test(trimmed))
        return 'on';
    return undefined;
}
/**
 * Short notice injected instead of the pure-orchestrator frame when the mode
 * is on but no roles are configured: the model must inform the user and
 * continue in normal mode — never sit paralyzed (the "returns nothing" bug).
 */
export function renderOrchestratorUnavailableNotice(toolName) {
    return (`Orchestrator mode is active, but no subagent-director roles are configured (subagent-director.roles is empty), so you cannot delegate work via \`${toolName}\`. ` +
        `Inform the user that orchestrator mode requires roles to be configured first, then handle their request in normal mode.`);
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
export function detectPerTurnOrchestrate(session) {
    const msgText = currentTurnUserMessageText(session);
    if (msgText !== undefined) {
        const req = detectOrchestrateRequest(msgText);
        if (req !== undefined)
            return req;
    }
    const cmdReq = recentOrchestrateCommandRun(session);
    if (cmdReq !== undefined)
        return cmdReq;
    return undefined;
}
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
export function buildOrchestratorFrame(toolName, enforcement = 'strict') {
    const enforcementSentence = enforcement === 'lenient'
        ? 'This contract is ENFORCED at the tool level only while orchestrator mode is sticky (/orchestrate on): in that state any write/execution tool you call is blocked by the harness (you will see a BLOCKED result), and retrying it will keep failing. This turn was orchestrated per-turn (/orchestrate <task> or 使用orchestrate模式), which is NOT tool-enforced — honor this contract on your own discipline for this turn.'
        : 'This contract is ENFORCED at the tool level: any write/execution tool you call is blocked by the harness (you will see a BLOCKED result), and retrying it will keep failing.';
    return `You are a PURE ORCHESTRATOR. Your only productive action is to call the \`${toolName}\` tool (provided by the subagent-director plugin) to delegate work. You must NEVER write, edit, execute, or run anything yourself — ${enforcementSentence} You MAY use read-only tools (read / ls / grep / find) and vectr MCP tools (mcp__vectr__*) to gather the context you need to write precise dispatch briefs; anything that must be run, probed, or changed in the environment has to be done by a dispatched subagent. You manage the subagents you have already dispatched: \`list_agents\` lists your background subagents and their status, \`send_message\` starts a follow-up turn on one (use it to steer), \`interrupt_agent\` stops its current turn, and \`job_output\` collects background subagent results.

The subagent-director plugin supplies its role templates from settings (subagent-director.roles) and the guidance section 'subagent-director:roles'. Delegate exactly one task per call:

    ${toolName}({ role: '<role-id>', prompt: '<self-contained task>', description: '<what this delegation produces>' })`;
}
/**
 * Render the role list portion of the orchestrator prompt from the live
 * settings. Returns a "configure roles first" notice when no roles exist so
 * the operator is told what to do instead of receiving a blank contract.
 * @param settings - current resolved settings snapshot.
 * @param toolName - the configured model-facing delegation tool name.
 */
export function renderOrchestratorRoles(settings, toolName) {
    const roles = settings.roles ?? {};
    const entries = Object.entries(roles).filter(([, role]) => role !== undefined);
    if (entries.length === 0) {
        return 'No Subagent Director roles are configured yet. Configure `subagent-director.roles` (settings.yaml or the settings panel) before entering orchestrator mode — the orchestrator can only delegate to defined roles.';
    }
    const lines = [
        `Delegate work by calling the \`${toolName}\` tool with a role id from the list below. Reference roles by their id (shown), never by display name, and never invent a role id that is not listed:`,
    ];
    for (const [id, role] of entries) {
        lines.push(`- ${role.displayName || id}: ${role.description}`);
        lines.push(`    ${toolName}({ role: "${id}", prompt: "..." })`);
    }
    return lines.join('\n');
}
/**
 * Assemble the full orchestrator prompt (framing + dynamic role list).
 * @param settings - current resolved settings snapshot.
 * @param toolName - the configured model-facing delegation tool name.
 */
export function renderOrchestratorPrompt(settings, toolName, enforcement = 'strict') {
    return `${buildOrchestratorFrame(toolName, enforcement)}\n\n${renderOrchestratorRoles(settings, toolName)}\n\nOrchestration rules:
1. Only dispatch. Forbid doing the work yourself.
2. Independent tasks -> dispatch them in parallel (multiple ${toolName} calls in one turn).
3. Dependent / relay tasks -> wait for the prior subagent to finish, then dispatch the next stage.
4. Every subagent prompt must be self-contained: goal, constraints, output format, acceptance criteria. Subagents receive NO parent context.
5. If the user's request names a specific role, dispatch to that role id. If a display name is given, map it to its id. If no role is named, dispatch to the role whose display name indicates coordination (e.g. contains 协调 / Orchestrator / Coordinator); when no such role exists, dispatch to the first configured role and let it decompose and coordinate.
6. Unclear dependencies or missing information -> ask the USER, never guess.
7. For independent fan-out you may set run_in_background: true and collect results later (via \`job_output\`); for relay steps set run_in_background: false so you wait for the result before dispatching the next stage.
8. Finish only when every subagent has completed. Then output a summary report: who produced what, and remaining todos.
9. A \`BLOCKED: orchestrate mode\` tool result is the harness enforcing this contract, not a transient error — do not retry the blocked tool; dispatch the work via \`${toolName}\` (or gather context with read-only / vectr tools) instead.`;
}
/**
 * Full orchestrator prompt when roles are configured, else the short
 * unavailable notice. The notice (not the paralyzing pure-orchestrator frame)
 * is what prevents the "conversation returns nothing" failure: a model that
 * cannot delegate must be told to inform the user and continue normally.
 * @param settings - current resolved settings snapshot.
 * @param toolName - the configured model-facing delegation tool name.
 */
function renderOrchestratorSection(settings, toolName, enforcement) {
    const roles = settings.roles ?? {};
    const hasRoles = Object.values(roles).some((role) => role !== undefined);
    if (!hasRoles)
        return renderOrchestratorUnavailableNotice(toolName);
    return renderOrchestratorPrompt(settings, toolName, enforcement);
}
/**
 * Text of the user message that started the CURRENT turn, or undefined when
 * the log has no user message in the current turn.
 *
 * The harness appends runtime-context injections (runtime snapshot,
 * system-reminder, memos_context) as SEPARATE `user/message` events AFTER the
 * real user message, so the FIRST user/message at or after the latest
 * `turn/start` — not the latest event — carries the user's actual prompt.
 * Without a `turn/start` (degenerate seed), falls back to the latest
 * user/message. Text blocks are concatenated in order; non-text blocks skipped.
 * @param session - a live Session (or a faithful fake with `.events`).
 */
function currentTurnUserMessageText(session) {
    const events = session?.events;
    if (!Array.isArray(events))
        return undefined;
    let turnStart = -1;
    for (const ev of events) {
        if (ev && ev.type === 'turn/start' && typeof ev.seq === 'number')
            turnStart = ev.seq;
    }
    for (const ev of events) {
        if (!ev || ev.type !== 'user/message')
            continue;
        if (turnStart >= 0 && typeof ev.seq === 'number' && ev.seq < turnStart)
            continue;
        const blocks = ev.data?.content;
        if (!Array.isArray(blocks))
            return '';
        let text = '';
        for (const b of blocks) {
            if (b && b.type === 'text' && typeof b.text === 'string')
                text += b.text;
        }
        return text;
    }
    return undefined;
}
/**
 * Per-turn slash path: an `orchestrate` command/run that happened since the
 * previous turn marks the current turn (the command itself is consumed by the
 * commands service and never appears in a user/message event). The command is
 * "recent" when it sits strictly AFTER the last user message of the previous
 * turn and BEFORE the current turn's `turn/start` — context-injection
 * user/message events inside the current turn do not count as "previous".
 * Without any `turn/start` (degenerate seed) falls back to the strictly
 * between previous/current user-message check. Returns 'on' | 'off' | undefined.
 * @param session - a live Session (or a faithful fake with `.events`).
 */
function recentOrchestrateCommandRun(session) {
    const events = session?.events;
    if (!Array.isArray(events))
        return undefined;
    let turnStart = -1;
    let cmdSeq = -1;
    let cmdArgs;
    for (const ev of events) {
        if (!ev || typeof ev.seq !== 'number')
            continue;
        if (ev.type === 'turn/start')
            turnStart = ev.seq;
        if (ev.type === 'command/run' && ev.data?.name === 'orchestrate') {
            cmdSeq = ev.seq;
            cmdArgs = ev.data.args;
        }
    }
    if (cmdSeq < 0)
        return undefined;
    if (turnStart >= 0) {
        // The command must have happened after the last user message of the
        // previous turn(s) AND before the current turn started.
        let lastUserBeforeTurn = -1;
        for (const ev of events) {
            if (!ev || ev.type !== 'user/message')
                continue;
            const s = typeof ev.seq === 'number' ? ev.seq : -1;
            if (s >= 0 && s < turnStart && s > lastUserBeforeTurn)
                lastUserBeforeTurn = s;
        }
        if (cmdSeq <= lastUserBeforeTurn || cmdSeq >= turnStart)
            return undefined;
    }
    else {
        // Fallback: strictly between the previous and the current user message.
        let prevUserSeq = -1;
        let currentUserSeq = -1;
        for (const ev of events) {
            if (!ev || ev.type !== 'user/message')
                continue;
            const s = typeof ev.seq === 'number' ? ev.seq : -1;
            if (s < 0)
                continue;
            prevUserSeq = currentUserSeq;
            currentUserSeq = s;
        }
        if (cmdSeq <= prevUserSeq || cmdSeq >= currentUserSeq)
            return undefined;
    }
    const arg = (cmdArgs ?? '').trim().toLowerCase();
    if (arg === 'off')
        return 'off';
    // '' (bare), 'on', or task text (e.g. 分析上周A股走势 — the handler queued
    // it as a follow-up turn) all mark this turn orchestrated.
    return 'on';
}
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
export function resolveOrchestrateMode(projections, sessionCandidates, warn) {
    if (projections === undefined)
        return undefined;
    let resolved;
    for (const candidate of sessionCandidates) {
        try {
            const snap = projections.snapshot(candidate);
            const value = snap?.values?.[ORCHESTRATE_PROJECTION_KEY];
            if (value && typeof value.mode === 'string') {
                const m = value.mode;
                if (m === 'on')
                    return 'on';
                if (resolved === undefined)
                    resolved = m;
            }
        }
        catch (err) {
            warn?.('could not read orchestrator mode from projection for a candidate session (session identity may not match the session /orchestrate on wrote to):', err);
        }
    }
    return resolved;
}
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
export function applyOrchestrate(ctx, getSettings, toolName, options) {
    // Register our event type on the shared KNOWN set so session logs carrying
    // `orchestrate/change` load in any boot that mounts this plugin.
    // The shared set is a mutable Set at runtime; its exported type is
    // ReadonlySet, so we widen to Set<string> for the add call.
    try {
        KNOWN_SESSION_EVENT_TYPES.add(ORCHESTRATE_EVENT_TYPE);
    }
    catch (err) {
        ctx.logger.warn('[orchestrate] could not register event type:', err?.message);
    }
    // Resolve sessionProjections *reactively*. At plugin apply time the host
    // may not have mounted the sessionProjections service yet — that is the P0
    // timing root cause: a one-shot `ctx.get` here returned undefined and
    // silently no-op'd the projection registration, so /orchestrate never
    // injected. Instead we register the projection the moment the service becomes
    // available via ctx.inject, and keep `projections` in a closure so the
    // command handler and prompt section observe it once it resolves. If the
    // service is genuinely absent the handler (and the apply-time fallback)
    // surface an honest error instead of a silent no-op.
    let projections = undefined;
    const missing = () => ctx.logger.warn('[orchestrate] sessionProjections service is missing on this host — the /orchestrate command will NOT take effect (no projection registered, orchestrator prompt will not inject). Provide the dsh-session-projection sessionProjections service to enable orchestrator mode.');
    const registerProjection = (sp) => {
        if (projections !== undefined)
            return; // idempotent: inject may re-fire
        projections = sp;
        sp.register({
            key: ORCHESTRATE_PROJECTION_KEY,
            stateVersion: 1,
            // Real @deepseek-ai/dsh-session-projection contract (SessionProjectionRegistry):
            // `stateSchema` validates host state (persisted-cache restore path); a
            // client-visible unit MUST declare `wire: { viewSchema, view }` or
            // `snapshot()` SKIPS it entirely (`if (def.wire === undefined) continue`),
            // so `snapshot().values['orchestrate']` is never populated and the prompt
            // section always reads undefined → no injection. The prior `schema` + bare
            // `view` made this a host-only unit — the actual root cause of the
            // on==off byte-identical system prompts. Fix: declare both correctly.
            stateSchema: z.object({ mode: z.enum(ORCHESTRATE_VALID_MODES) }),
            init: () => ({ mode: 'off' }),
            apply: (state, event) => {
                if (!event || event.type !== ORCHESTRATE_EVENT_TYPE)
                    return state;
                const mode = event.data.mode;
                if (!ORCHESTRATE_VALID_MODES.includes(mode) || state.mode === mode)
                    return state;
                return { mode };
            },
            wire: {
                viewSchema: z.object({ mode: z.enum(ORCHESTRATE_VALID_MODES) }),
                view: (state) => ({ mode: state.mode }),
            },
        });
        ctx.logger.info('[orchestrate] host active (command + projection + prompt section)');
    };
    const spNow = ctx.get('sessionProjections');
    if (spNow !== undefined) {
        registerProjection(spNow);
    }
    else {
        // Reactive path: register once the host mounts sessionProjections. The
        // child fiber's callback only runs when the dependency is present, so
        // this also covers the "ready slightly later" case that the one-shot get
        // missed. If the service never appears, the handler below returns an
        // honest error — no silent no-op.
        //
        // The child fiber is owned by this plugin's fiber lifecycle (its
        // registration effect lives on the parent fiber), so it unloads
        // automatically with the plugin. Do NOT wrap it in ctx.effect: cordis
        // effects run their callback immediately and treat the return value as
        // the disposer, so `ctx.effect(() => fiber.dispose())` would unload the
        // child at birth — pinned by the real-cordis probe in
        // test/orchestrate-cordis.test.ts.
        ctx.inject(['sessionProjections'], (injectedCtx) => {
            registerProjection(injectedCtx.get('sessionProjections'));
        });
    }
    // Register the `/orchestrate` slash command *reactively* through a
    // `ctx.inject` child fiber (the dsh-plan-mode precedent). `commands` is NOT a
    // required entry-inject: standard profiles mount it via dsh-base (so the
    // child fiber activates immediately there), but non-dsh-base assemblies (ACP
    // hosts, UI-less demo spines, custom harnesses) may never provide it, and a
    // required inject would leave the whole main entry PENDING on those hosts —
    // the core delegation features would never load. The child-fiber shape also
    // recovers from a host that mounts `commands` slightly after `apply`. The
    // handler reads `projections` from the closure, so command availability and
    // projection availability are decoupled: the handler still refuses honestly
    // (with a warning) if the projection service never came up.
    // The child fiber is owned by this plugin's fiber lifecycle and unloads
    // with the plugin — never wrap it in ctx.effect (cordis effects run their
    // callback immediately and treat the return value as the disposer, so
    // `ctx.effect(() => fiber.dispose())` would unload the child at birth;
    // pinned by the real-cordis probe in test/orchestrate-cordis.test.ts).
    ctx.inject(['commands'], (injectedCtx) => {
        const commands = injectedCtx.get('commands');
        commands.register({
            name: 'orchestrate',
            description: 'Enter pure-orchestrator mode for this turn — /orchestrate <task> (e.g. /orchestrate 分析上周A股走势) or say 使用orchestrate模式. No args = this turn; on = persistent until off.',
            input: { hint: '<task> | on | off (no args = this turn)' },
            handler: (invocation) => {
                const raw = (invocation.rawInput || '').trim();
                const lower = raw.toLowerCase();
                const mode = lower || 'on';
                // Without sessionProjections the projection is never registered, so
                // /orchestrate cannot take effect. Refuse with an honest message
                // instead of falsely reporting success (P0 silent-degradation fix).
                if (projections === undefined) {
                    // Service never became available (truly absent host): refuse with an
                    // honest message and warn, instead of falsely reporting success (P0
                    // silent-degradation fix).
                    missing();
                    return {
                        kind: 'error',
                        text: `Orchestrator mode "${mode}" was NOT applied: the sessionProjections service is missing on this host, so /orchestrate has no effect and the orchestrator prompt will not inject. ` +
                            `Provide the dsh-session-projection sessionProjections service to enable orchestrator mode.`,
                    };
                }
                const agent = invocation?.agent;
                const session = agent?.session;
                if (session === undefined || typeof session.append !== 'function') {
                    return {
                        kind: 'error',
                        text: `Orchestrator mode "${mode}" was NOT applied: this command invocation carries no agent session to append the mode change to.`,
                    };
                }
                if (!ORCHESTRATE_VALID_MODES.includes(mode)) {
                    // Task text: orchestrate THIS task. The commands service consumes the
                    // whole line, so queue the task as a follow-up turn (wakes the agent);
                    // the per-turn command/run scan marks that turn orchestrated.
                    if (typeof agent?.followup !== 'function') {
                        return {
                            kind: 'error',
                            text: `Orchestrator mode was NOT applied: this agent cannot queue a follow-up turn (no followup method).`,
                        };
                    }
                    agent.followup(createUserMessage({
                        content: [{ type: 'text', text: raw }],
                        source: { kind: 'user' },
                    }));
                    const preview = raw.length > 60 ? `${raw.slice(0, 60)}…` : raw;
                    return {
                        kind: 'success',
                        text: `Orchestrator mode: on for this turn — task queued: "${preview}"`,
                    };
                }
                if (mode === 'on' && raw === '') {
                    // Per-turn: no sticky event. The section detects this command/run
                    // and orchestrates the NEXT user-message turn only.
                    return {
                        kind: 'success',
                        text: 'Orchestrator mode: on for this turn. Declare /orchestrate at the start of your message (or say 使用orchestrate模式) to enable it per turn; use /orchestrate on to keep it on until /orchestrate off.',
                    };
                }
                session.append(ORCHESTRATE_EVENT_TYPE, { mode });
                return {
                    kind: 'success',
                    text: mode === 'off' ? 'Orchestrator mode: off' : 'Orchestrator mode: on (persistent until /orchestrate off)',
                };
            },
        });
    });
    // ---- tool-level enforcement (orchestrate guard) ------------------------
    // The PURE ORCHESTRATOR contract used to be prompt-only and the model
    // violated it (a live session: 77× bash, 3× edit, zero dispatches). Register
    // a dsh-tools guard so the main agent of an orchestrate-on session is DENIED
    // every non-allowlisted tool call, with a BLOCKED message that tells it to
    // dispatch instead. `projections` is read live from the closure, so the
    // guard becomes effective the moment the projection service resolves (same
    // reactive path as the command handler). Policy + every scoping decision:
    // see src/orchestrate-guard.ts (allow-list fail-closed; read-only tools
    // allowed; subagent children exempt via durable session-header metadata;
    // fail-open when the mode is unresolvable).
    const readOnlyTools = options?.readOnlyTools ?? ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS;
    // Resolved enforcement (layered: getEnforcement live getter wins, else the
    // static option, else 'strict'). Both the guard and the prompt read this so
    // a settings-page toggle is live (no restart) and prompt <> guard agree.
    const getEnforcement = options?.getEnforcement ?? (() => options?.enforcement ?? 'strict');
    const enforcement = getEnforcement();
    // Capability check before registering: `guard()` is part of the 0.1.1-line
    // dsh-tools ToolRuntime contract, but hosts on older dsh lines (and minimal
    // tools stubs) expose a register-only service. Degrade to prompt-only with
    // an honest warning instead of throwing during entry activation (the
    // register-only stub in test/orchestrate-cordis.test.ts pins this).
    const tools = ctx.tools;
    if (tools) {
        if (typeof tools.guard === 'function') {
            ctx.effect(() => tools.guard(createOrchestrateToolGuard({
                getProjections: () => projections,
                toolName,
                readOnlyTools,
                getEnforcement,
                warn: (message, err) => ctx.logger.warn('[orchestrate] ' + message, err),
            })), 'subagent-director:orchestrate-tool-guard');
        }
        else {
            ctx.logger.warn('[orchestrate] tools service has no guard() (dsh-tools 0.1.1+ ToolRuntime) — tool-level enforcement of the PURE ORCHESTRATOR contract is UNAVAILABLE on this host; the mode degrades to prompt-only.');
        }
    }
    const systemPrompt = ctx.get('systemPrompt');
    if (systemPrompt !== undefined) {
        systemPrompt.section({
            name: ORCHESTRATE_SECTION_NAME,
            order: ORCHESTRATE_SECTION_ORDER,
            text: (context) => {
                // Root-cause note (P0 render-time silent no-op, sibling of C1):
                // @deepseek-ai/dsh-session-projection's read face keys its per-session
                // watermark cache by the SESSION OBJECT via a WeakMap and folds
                // `session.events` (see cellFor/buildCell in the package's lib/index.js).
                // A snapshot therefore reads the mode ONLY from the live Session object
                // whose `.events` log carries the `orchestrate/change` event that the
                // /orchestrate command appended. If the assembly context hands a
                // DIFFERENT session reference (e.g. a request wrapper instead of the
                // agent's own session), the cell is rebuilt from an empty log and
                // silently returns 'off', dropping the section. We must hand the
                // canonical session object — and try every session reference the
                // context exposes so a stray wrapper reference cannot downgrade us.
                const sessionCandidates = [];
                if (context?.agent?.session)
                    sessionCandidates.push(context.agent.session);
                if (context?.session && context.session !== context?.agent?.session) {
                    sessionCandidates.push(context.session);
                }
                if (sessionCandidates.length === 0) {
                    // No resolvable session — cannot read the projection. Warn instead of
                    // silently dropping (P0 honest-degradation; do not return '' silently).
                    ctx.logger.warn('[orchestrate] system-prompt section invoked without a resolvable session (both context.agent.session and context.session are absent) — orchestrator-mode section skipped. Possible cause: the assembly context shape differs from the dsh-agent AssembleContext contract.');
                    return '';
                }
                // P0 missing-service path: the service never mounted. The apply-time
                // missing() already emitted the loud warning, so only the section is
                // skipped here (no per-assembly re-warning).
                if (projections === undefined)
                    return '';
                // Per-turn detection (the /using-aegis-like usage): the user message
                // that started THIS turn, or a just-run /orchestrate command, decides
                // this turn. The sticky projection below is only the backward-compat
                // fallback. (Context-injection user/message events after the real
                // message are ignored: currentTurnUserMessageText reads the FIRST
                // message of the turn, and recentOrchestrateCommandRun bounds the
                // command by turn/start, not by those injection events.)
                for (const candidate of sessionCandidates) {
                    const perTurn = detectPerTurnOrchestrate(candidate);
                    if (perTurn === 'on')
                        return renderOrchestratorSection(getSettings(), toolName, getEnforcement());
                    if (perTurn === 'off')
                        return '';
                }
                // Shared resolver with the tool guard (single source of truth for
                // "which session is orchestrate-on"); per-candidate errors surface
                // through the warn sink instead of being swallowed (D1).
                let sawError = false;
                const resolvedMode = resolveOrchestrateMode(projections, sessionCandidates, (message, err) => {
                    sawError = true;
                    ctx.logger.warn('[orchestrate] ' + message, err?.message);
                });
                if (resolvedMode === undefined) {
                    // Could not resolve any mode from any candidate session. Warn with the
                    // likely cause; do NOT silently pretend 'off'.
                    if (!sawError) {
                        ctx.logger.warn('[orchestrate] orchestrator mode could not be resolved from any candidate session — orchestrator-mode section skipped. Possible cause: the assembly context session identity does not match the session the /orchestrate command wrote the orchestrate/change event to (the projection cache is keyed by the live Session object, per @deepseek-ai/dsh-session-projection).');
                    }
                    return '';
                }
                // Legitimate off: no section, no warning (intended behavior).
                if (resolvedMode === 'off')
                    return '';
                return renderOrchestratorSection(getSettings(), toolName, getEnforcement());
            },
        });
    }
}
//# sourceMappingURL=orchestrate.js.map