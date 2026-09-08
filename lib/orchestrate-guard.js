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
export const ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS = [];
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
        'You must NOT read files, search code, or execute commands directly. You MUST dispatch all exploration, research, and execution work via `' +
        deps.toolName +
        '` instead. To inspect or steer subagents you already started, use `list_agents`, `send_message`, or `interrupt_agent` (and `job_output` to collect background results).';
    return (exec) => {
        // Fast path: allow-listed tools and vectr MCP tools are permitted for the orchestrator.
        if (allowed.has(exec.name) || isVectrMcpTool(exec.name))
            return undefined;
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
        // Physical circuit breaker: per-turn orchestration is strictly enforced
        // at the tool level without any lenient mode exemption.
        if (detectPerTurnOrchestrate(agent.session) === 'on')
            return blocked(exec);
        // Sticky orchestrate mode resolution (with 3-tier fallback to session.events)
        const projections = deps.getProjections();
        const mode = resolveOrchestrateMode(projections, [agent.session], (message, err) => deps.warn('orchestrate guard: ' + message, err));
        if (mode === 'on')
            return blocked(exec);
        if (projections === undefined && !warnedNoProjections) {
            warnedNoProjections = true;
            deps.warn('orchestrate guard: sessionProjections service is missing — resolved mode via event fallback.');
        }
        return undefined;
    };
}
//# sourceMappingURL=orchestrate-guard.js.map