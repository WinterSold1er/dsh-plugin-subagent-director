/**
 * Orchestrate-mode tool guard (tool-level enforcement of the PURE ORCHESTRATOR
 * contract).
 *
 * Root problem this fixes: `/orchestrate on` used to be a PROMPT-ONLY mode. The
 * injected "PURE ORCHESTRATOR" section told the model not to do work itself,
 * but nothing stopped it — a live session ran 77× bash / 3× edit / 2× read with
 * zero `subagent_role` calls, rationalizing itself out of the prompt via an
 * auto-memory note that "reading files for scheduling decisions" was allowed.
 * A prompt contract the model can violate is not a contract; the mode now has
 * an execution-level enforcement point.
 *
 * Mechanism: `ctx.tools.guard()` (dsh-tools ToolRuntime). The guard is a
 * synchronous check in the tool pipeline that runs after the extensible
 * `tools/pre-execute` waterfall and before the tool body; returning a string
 * DENIES the call and that string is delivered to the model as the tool result
 * (`Error: <reason>`), so the model sees an explicit BLOCKED instruction to
 * dispatch instead of a silent failure. Guards are monotonic: no listener or
 * later guard can turn a denial back into permission. The guard is registered
 * on the plugin's plain context, so it sees every agent in the process; the
 * per-session scoping below is what keeps it from over-reaching. Registration
 * is capability-checked in applyOrchestrate: a tools service without guard()
 * (older dsh lines, minimal stubs) degrades to prompt-only with a warning
 * instead of throwing during entry activation.
 *
 * ENFORCEMENT LEVELS (config `orchestrateEnforcement`, default 'strict'):
 *   - strict: while orchestrate mode is in effect for a session — EITHER the
 *     sticky projection (`/orchestrate on`) OR per-turn detection (the current
 *     turn's user message said 使用orchestrate模式, or a `/orchestrate <task>`
 *     command/run sits in this turn's boundary) — the main agent is held to
 *     the allow-list below (fail-closed). This closes the prompt/guard gap:
 *     per-turn orchestration used to inject an "ENFORCED at the tool level"
 *     prompt while the guard only read the sticky projection and let the
 *     per-turn orchestrator call bash/edit freely.
 *   - lenient: the guard only enforces the STICKY projection (`/orchestrate on`
 *     until off). Per-turn orchestration stays prompt-only — the injected
 *     prompt says so honestly (see buildOrchestratorFrame) instead of claiming
 *     tool-level enforcement it does not provide.
 *
 * POLICY (deliberate, documented per team decision):
 *   - ALLOWLIST, fail-closed. While orchestrate mode is ON for a session, the
 *     MAIN agent may only call: dispatch tools (this plugin's delegation tool,
 *     the built-in `subagent`/`subagent_fork`, `close_subagent`), the base
 *     bundle's subagent CONTROL tools (`list_agents`, `send_message`,
 *     `interrupt_agent` — the orchestrator must be able to discover, steer, and
 *     stop the subagents it dispatches or it cannot orchestrate at all),
 *     interaction tools (`ask_user_question`, `todo_write`), and the
 *     configured READ-ONLY tools (default: read, read_image, grep, glob, ls,
 *     find). Everything else
 *     (bash, edit, write, rm-style, MCP write tools, future unknown tools) is
 *     blocked. Fail-closed on purpose: a brand-new or renamed host tool that
 *     writes or executes must NOT silently become available to an orchestrator;
 *     the cost of a wrong allow entry is a BLOCKED result telling the model to
 *     dispatch, which is self-healing, while a wrong deny entry only breaks the
 *     orchestrator's own work.
 *   - READ-ONLY TOOLS STAY ALLOWED (not full-block). Full-block ("never read,
 *     grep, or find anything") matches the strictest reading of PURE
 *     ORCHESTRATOR, but the orchestrator genuinely needs context (task files,
 *     logs, recent diffs) to write self-contained dispatch briefs — forcing it
 *     to dispatch a subagent just to read a file wastes a whole subagent per
 *     read and slows every orchestration loop. Read-only tools cannot mutate
 *     the workspace or run code, so they do not reopen the "main agent does
 *     the work" failure mode. This is why the injected prompt was updated in
 *     lockstep (orchestrate.ts buildOrchestratorFrame): prompt and enforcement
 *     must agree, or the model gets contradictory contracts.
 *   - MAIN AGENT ONLY. Subagent children are the workers and must keep full
 *     tool access. They are identified by DURABLE session-header metadata
 *     stamped by the subagent driver (`origin: 'subagent'`,
 *     `delegationDepth >= 1`) — not by absence of the orchestrate event,
 *     because a FORK child's session log is seeded with the parent's events
 *     and would otherwise resolve orchestrate=on from the inherited log and
 *     get its own bash/edit calls blocked.
 *   - FAIL-OPEN when the mode cannot be resolved (no calling agent, missing
 *     sessionProjections service, projection error): the /orchestrate command
 *     refuses to turn the mode on without the projection service, so an
 *     unresolvable mode means "not on"; blocking there would break hosts where
 *     orchestrate was never enabled. Each unresolvable path warns once.
 */
import type { ToolExecution, ToolGuard } from '@deepseek-ai/dsh-tools';

import { CLOSE_SUBAGENT_TOOL_NAME } from './close-tool.js';
import { detectPerTurnOrchestrate, resolveOrchestrateMode } from './orchestrate.js';

/**
 * Orchestrate guard enforcement level, mirroring DirectorConfig.
 * 'strict' = fail-closed allow-list for sticky AND per-turn orchestration;
 * 'lenient' = tool-level enforcement for the sticky projection only, per-turn
 * stays prompt-level (prompt wording reflects this honestly).
 */
export type OrchestrateEnforcement = 'strict' | 'lenient';

/**
 * Default read-only tool surface of the DSH host (fs/shell/interaction
 * packages). `ls`/`find` are included for host builds or MCP servers that
 * expose them as first-class tools; unknown names in this list are harmless
 * (a guard only string-matches `exec.name`, it never validates the catalog).
 * Replacement path: override via DirectorConfig.orchestrateReadOnlyTools —
 * the list is a host-contract value, not deployment state, so the default
 * lives here as a constant.
 */
export const ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS: readonly string[] = [
  'read',
  'read_image',
  'grep',
  'glob',
  'ls',
  'find',
];

/**
 * Model-facing names of the DSH base bundle's subagent CONTROL tools
 * (`@deepseek-ai/dsh-tool-subagent-control`; all three are registered in
 * `packages/bundle/base/cordis.patch.yml`): `list_agents` (discover the
 * orchestrator's background subagents and their status), `send_message`
 * (start a follow-up turn on one — steering), and `interrupt_agent` (stop one
 * turn). Fixed host-contract names, the same category as the built-in
 * `subagent`/`subagent_fork` dispatch names below — stable names defined by
 * the base bundle, not deployment state, so constants rather than config.
 * Deliberately NOT included: `report` (`@deepseek-ai/dsh-tool-subagent-report`)
 * — it is registered only in continuable CHILD contexts, never in the main
 * agent's catalog, so a whitelist entry for it would be dead weight.
 */
export const ORCHESTRATE_SUBAGENT_CONTROL_TOOLS: readonly string[] = [
  'list_agents',
  'send_message',
  'interrupt_agent',
];

/**
 * Prefix check for vectr MCP tool family (`mcp__vectr__*` for default workspace
 * daemon and `mcp__vectr_<slug>__*` for multi-codebase daemons). Vectr provides
 * semantic search, code navigation, and working memory retrieval without mutating
 * the workspace, so the orchestrator is allowed to use it for context gathering.
 * Other MCP write/exec tools (e.g. `mcp__github__*`) remain blocked (fail-closed).
 */
export function isVectrMcpTool(name: string): boolean {
  return name.startsWith('mcp__vectr__') || name.startsWith('mcp__vectr_');
}

/**
 * Tools the orchestrator may always call (any mode): the dispatch surface
 * (this plugin's delegation tool under its configured name, the base bundle's
 * built-in subagent tools, the plugin's close tool), the base bundle's
 * subagent control tools, subagent result collection (`job_output`), plus the
 * interaction tools the orchestration rules require (asking the user,
 * tracking todos).
 */
export function orchestrateAlwaysAllowedTools(toolName: string): readonly string[] {
  return [
    toolName,
    'subagent',
    'subagent_fork',
    CLOSE_SUBAGENT_TOOL_NAME,
    ...ORCHESTRATE_SUBAGENT_CONTROL_TOOLS,
    'job_output',
    'ask_user_question',
    'todo_write',
  ];
}

export interface OrchestrateGuardDeps {
  /** Live `sessionProjections` service, or `undefined` when the host never mounted it. */
  getProjections: () => unknown;
  /** Model-facing name of this plugin's delegation tool (the dispatch the BLOCKED message points to). */
  toolName: string;
  /** Read-only tool names allowed for the orchestrator (config-injected, see DirectorConfig). */
  readOnlyTools: readonly string[];
  /** Enforcement level; 'strict' (default) blocks sticky + per-turn, 'lenient' blocks sticky only. */
  enforcement?: OrchestrateEnforcement;
  /**
   * Live enforcement resolver. When supplied it OVERRIDES `enforcement` on every
   * tool call so a settings-page toggle (user setting) takes effect immediately
   * without a restart. The plugin passes a getter that reads
   * `getSettings().orchestrateEnforcement ?? mountConfig ?? 'strict'`.
   */
  getEnforcement?: () => OrchestrateEnforcement;
  /** Warn sink (rate-limited by the guard itself). */
  warn: (message: string, err?: unknown) => void;
}

/**
 * Build the orchestrate-mode ToolGuard. See the file header for the policy and
 * every decision encoded here. The allow-set is computed once (toolName and
 * readOnlyTools are mount-time constants); only the mode lookup is per-call.
 */
export function createOrchestrateToolGuard(deps: OrchestrateGuardDeps): ToolGuard {
  const allowed = new Set<string>([...orchestrateAlwaysAllowedTools(deps.toolName), ...deps.readOnlyTools]);
  const readOnlyList = deps.readOnlyTools.join(', ');
  let warnedNoAgent = false;
  let warnedNoProjections = false;

  const blocked = (exec: Readonly<ToolExecution>): string =>
    'BLOCKED: orchestrate mode is ON for this session — you are the pure orchestrator and may not call `' +
    exec.name +
    '` yourself. This is enforced at the tool level, not a transient error: retrying will keep failing. ' +
    'Use read-only tools (' +
    readOnlyList +
    ') or vectr MCP tools (mcp__vectr__*) only to gather context for dispatch decisions, and dispatch the actual work via `' +
    deps.toolName +
    '` (or the built-in subagent tools) instead. To inspect or steer subagents you already started, use `list_agents`, `send_message`, or `interrupt_agent` (and `job_output` to collect background results).';

  return (exec: Readonly<ToolExecution>): string | undefined => {
    // Fast path: the allow-listed tools and vectr MCP tools are never blocked, in any mode.
    if (allowed.has(exec.name) || isVectrMcpTool(exec.name)) return undefined;
    // Resolution is per-call so a settings toggle is live (no restart). A
    // provided getEnforcement wins over the static `enforcement` value.
    const enforcement: OrchestrateEnforcement =
      deps.getEnforcement !== undefined ? deps.getEnforcement() : deps.enforcement ?? 'strict';

    const agent = exec.agent;
    if (agent === undefined) {
      // A tool call the agent loop did not attribute to an agent cannot be
      // tied to any orchestrate session; fail open (warn once).
      if (!warnedNoAgent) {
        warnedNoAgent = true;
        deps.warn(
          'orchestrate guard: tool call "' + exec.name + '" has no calling agent — call not attributed to a session, left allowed (once).',
        );
      }
      return undefined;
    }

    const header = agent.session?.header;
    // Subagent children (spawn OR fork, any depth) are the workers: the
    // orchestrate contract never applies to them. Header metadata is durable
    // (stamped by the subagent driver, survives resume), and it is the only
    // reliable discriminator — a fork child's log is seeded from the parent,
    // so an event-based check would falsely block the child.
    if (header?.origin === 'subagent' || (header?.delegationDepth ?? 0) > 0) return undefined;

    const projections = deps.getProjections();
    if (projections === undefined) {
      // /orchestrate cannot have taken effect without the projection service
      // (the command handler refuses honestly), so the mode is off by default.
      if (!warnedNoProjections) {
        warnedNoProjections = true;
        deps.warn(
          'orchestrate guard: sessionProjections service is missing — orchestrate mode cannot be resolved, leaving all tools allowed (once).',
        );
      }
      return undefined;
    }

    // strict: per-turn orchestration counts as orchestrate-in-effect, so the
    // per-turn detection must run before the sticky projection read (the
    // projection itself is only ever flipped by sticky /orchestrate on|off).
    // lenient: enforcement covers the sticky projection only — per-turn
    // stays prompt-level, so the per-turn check is skipped entirely.
    if (enforcement === 'strict' && detectPerTurnOrchestrate(agent.session) === 'on') return blocked(exec);

    const mode = resolveOrchestrateMode(projections, [agent.session], (message, err) =>
      deps.warn('orchestrate guard: ' + message, err),
    );
    if (mode !== 'on') return undefined;

    return blocked(exec);
  };
} 
