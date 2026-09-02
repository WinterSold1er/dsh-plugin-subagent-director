import { CLOSE_SUBAGENT_TOOL_NAME } from './close-tool.js';
import { detectPerTurnOrchestrate, resolveOrchestrateMode } from './orchestrate.js';
/**
 * Default read-only tool surface of the DSH host (fs/shell/interaction
 * packages). `ls`/`find` are included for host builds or MCP servers that
 * expose them as first-class tools; unknown names in this list are harmless
 * (a guard only string-matches `exec.name`, it never validates the catalog).
 * Replacement path: override via DirectorConfig.orchestrateReadOnlyTools —
 * the list is a host-contract value, not deployment state, so the default
 * lives here as a constant.
 */
export const ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS = [
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
export const ORCHESTRATE_SUBAGENT_CONTROL_TOOLS = [
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
export function isVectrMcpTool(name) {
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
export function orchestrateAlwaysAllowedTools(toolName) {
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
/**
 * Build the orchestrate-mode ToolGuard. See the file header for the policy and
 * every decision encoded here. The allow-set is computed once (toolName and
 * readOnlyTools are mount-time constants); only the mode lookup is per-call.
 */
export function createOrchestrateToolGuard(deps) {
    const allowed = new Set([...orchestrateAlwaysAllowedTools(deps.toolName), ...deps.readOnlyTools]);
    const readOnlyList = deps.readOnlyTools.join(', ');
    let warnedNoAgent = false;
    let warnedNoProjections = false;
    const blocked = (exec) => 'BLOCKED: orchestrate mode is ON for this session — you are the pure orchestrator and may not call `' +
        exec.name +
        '` yourself. This is enforced at the tool level, not a transient error: retrying will keep failing. ' +
        'Use read-only tools (' +
        readOnlyList +
        ') or vectr MCP tools (mcp__vectr__*) only to gather context for dispatch decisions, and dispatch the actual work via `' +
        deps.toolName +
        '` (or the built-in subagent tools) instead. To inspect or steer subagents you already started, use `list_agents`, `send_message`, or `interrupt_agent` (and `job_output` to collect background results).';
    return (exec) => {
        // Fast path: the allow-listed tools and vectr MCP tools are never blocked, in any mode.
        if (allowed.has(exec.name) || isVectrMcpTool(exec.name))
            return undefined;
        // Resolution is per-call so a settings toggle is live (no restart). A
        // provided getEnforcement wins over the static `enforcement` value.
        const enforcement = deps.getEnforcement !== undefined ? deps.getEnforcement() : deps.enforcement ?? 'strict';
        const agent = exec.agent;
        if (agent === undefined) {
            // A tool call the agent loop did not attribute to an agent cannot be
            // tied to any orchestrate session; fail open (warn once).
            if (!warnedNoAgent) {
                warnedNoAgent = true;
                deps.warn('orchestrate guard: tool call "' + exec.name + '" has no calling agent — call not attributed to a session, left allowed (once).');
            }
            return undefined;
        }
        const header = agent.session?.header;
        // Subagent children (spawn OR fork, any depth) are the workers: the
        // orchestrate contract never applies to them. Header metadata is durable
        // (stamped by the subagent driver, survives resume), and it is the only
        // reliable discriminator — a fork child's log is seeded from the parent,
        // so an event-based check would falsely block the child.
        if (header?.origin === 'subagent' || (header?.delegationDepth ?? 0) > 0)
            return undefined;
        const projections = deps.getProjections();
        if (projections === undefined) {
            // /orchestrate cannot have taken effect without the projection service
            // (the command handler refuses honestly), so the mode is off by default.
            if (!warnedNoProjections) {
                warnedNoProjections = true;
                deps.warn('orchestrate guard: sessionProjections service is missing — orchestrate mode cannot be resolved, leaving all tools allowed (once).');
            }
            return undefined;
        }
        // strict: per-turn orchestration counts as orchestrate-in-effect, so the
        // per-turn detection must run before the sticky projection read (the
        // projection itself is only ever flipped by sticky /orchestrate on|off).
        // lenient: enforcement covers the sticky projection only — per-turn
        // stays prompt-level, so the per-turn check is skipped entirely.
        if (enforcement === 'strict' && detectPerTurnOrchestrate(agent.session) === 'on')
            return blocked(exec);
        const mode = resolveOrchestrateMode(projections, [agent.session], (message, err) => deps.warn('orchestrate guard: ' + message, err));
        if (mode !== 'on')
            return undefined;
        return blocked(exec);
    };
}
//# sourceMappingURL=orchestrate-guard.js.map