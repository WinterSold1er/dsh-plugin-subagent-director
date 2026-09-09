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
 * Strict single-line mirror run_code regex.
 * Must and only match a strict single-line mirror replay statement (optional single-line leading comment allowed).
 */
export const STRICT_MIRROR_RUN_CODE = /^\s*(?:\/\/[^\n]*\n\s*)?return\s+await\s+tools\s*(?:\[\s*['"]agy_tool['"]\s*\]|\.\s*agy_tool)\s*\(\s*(\{[\s\S]*?\})\s*\)\s*;?\s*$/;
/**
 * Mapping dictionary from Antigravity/Gemini CLI tool names to native DSH tool semantics.
 */
export const AGY_TO_DSH_MAP = Object.freeze({
    // Subagent delegation
    invoke_subagent: 'subagent_role',
    invokeSubagent: 'subagent_role',
    InvokeSubagent: 'subagent_role',
    run_subagent: 'subagent_role',
    runSubagent: 'subagent_role',
    RunSubagent: 'subagent_role',
    subagent: 'subagent_role',
    Subagent: 'subagent_role',
    // Subagent definition
    define_subagent: 'subagent_define',
    defineSubagent: 'subagent_define',
    DefineSubagent: 'subagent_define',
    // Shell execution
    run_command: 'bash',
    runCommand: 'bash',
    RunCommand: 'bash',
    execute_command: 'bash',
    executeCommand: 'bash',
    ExecuteCommand: 'bash',
    bash: 'bash',
    Bash: 'bash',
    // File edit / write
    write_to_file: 'edit',
    writeToFile: 'edit',
    WriteToFile: 'edit',
    replace_file_content: 'edit',
    replaceFileContent: 'edit',
    ReplaceFileContent: 'edit',
    edit_file: 'edit',
    editFile: 'edit',
    EditFile: 'edit',
    create_file: 'edit',
    createFile: 'edit',
    CreateFile: 'edit',
    edit: 'edit',
    Edit: 'edit',
    // File read
    read_file: 'read',
    readFile: 'read',
    ReadFile: 'read',
    view_file: 'read',
    viewFile: 'read',
    ViewFile: 'read',
    read: 'read',
    Read: 'read',
    // Directory / file search
    list_directory: 'ls',
    listDirectory: 'ls',
    ListDirectory: 'ls',
    find_files: 'find',
    findFiles: 'find',
    FindFiles: 'find',
    ls: 'ls',
    Ls: 'ls',
    find: 'find',
    Find: 'find',
    glob: 'find',
    Glob: 'find',
    // Grep search
    grep_search: 'grep',
    grepSearch: 'grep',
    GrepSearch: 'grep',
    search_files: 'grep',
    searchFiles: 'grep',
    SearchFiles: 'grep',
    grep: 'grep',
    Grep: 'grep',
    // Interaction
    ask_user_question: 'ask_user_question',
    askUserQuestion: 'ask_user_question',
    AskUserQuestion: 'ask_user_question',
    ask_user: 'ask_user_question',
    askUser: 'ask_user_question',
    AskUser: 'ask_user_question',
    ask: 'ask_user_question',
    Ask: 'ask_user_question',
    todo_write: 'todo_write',
    todoWrite: 'todo_write',
    TodoWrite: 'todo_write',
    todo: 'todo_write',
    Todo: 'todo_write',
});
/**
 * Safe JSON argument parser supporting objects, strings, and fallbacks.
 */
function parseArguments(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (typeof raw === 'object')
        return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'object' && parsed !== null) {
                return parsed;
            }
        }
        catch {
            return null;
        }
    }
    return null;
}
/**
 * Map an agy inner tool name to effective DSH tool semantics, routing subagent
 * delegation to the caller-specified delegationToolName.
 */
function mapAgyInnerNameToDsh(rawInnerName, delegationToolName) {
    const normalized = rawInnerName.toLowerCase().replace(/[_-]/g, '');
    if (normalized === 'invokesubagent' ||
        normalized === 'runsubagent' ||
        normalized === 'subagent') {
        return delegationToolName;
    }
    return AGY_TO_DSH_MAP[rawInnerName] ?? rawInnerName;
}
/**
 * Unwrap ToolExecution to discover the underlying tool intent across
 * direct native calls, `agy_tool` envelopes, and `run_code` scripts.
 */
export function unwrapToolIntent(exec, delegationToolName) {
    const argsObj = parseArguments(exec.arguments);
    // 1. Direct agy_tool envelope
    if (exec.name === 'agy_tool') {
        const rawInnerName = (typeof argsObj?.tool === 'string' && argsObj.tool) ||
            (typeof argsObj?.toolName === 'string' && argsObj.toolName) ||
            (typeof argsObj?.Tool === 'string' && argsObj.Tool) ||
            (typeof argsObj?.ToolName === 'string' && argsObj.ToolName) ||
            (typeof argsObj?.tool_name === 'string' && argsObj.tool_name) ||
            'agy_tool';
        const innerArguments = argsObj?.input ?? argsObj?.Input ?? argsObj ?? undefined;
        const effectiveName = mapAgyInnerNameToDsh(rawInnerName, delegationToolName);
        return {
            effectiveName,
            rawInnerName,
            isWrapped: true,
            innerArguments,
        };
    }
    // 2. run_code wrapper embedding agy_tool
    if (exec.name === 'run_code') {
        const code = typeof argsObj?.code === 'string' ? argsObj.code : undefined;
        if (code) {
            // Must strictly match single-line mirror replay statement
            const m = STRICT_MIRROR_RUN_CODE.exec(code);
            if (m) {
                let rawInnerName;
                let innerArguments = undefined;
                try {
                    const parsed = JSON.parse(m[1]);
                    if (parsed && typeof parsed === 'object') {
                        const p = parsed;
                        if (typeof p.tool === 'string')
                            rawInnerName = p.tool;
                        else if (typeof p.toolName === 'string')
                            rawInnerName = p.toolName;
                        else if (typeof p.Tool === 'string')
                            rawInnerName = p.Tool;
                        else if (typeof p.ToolName === 'string')
                            rawInnerName = p.ToolName;
                        else if (typeof p.tool_name === 'string')
                            rawInnerName = p.tool_name;
                        innerArguments = p.input ?? p.Input ?? p;
                    }
                }
                catch {
                    const toolMatch = /(?:["']?(?:tool(?:Name)?|Tool(?:Name)?|tool_name)["']?)\s*:\s*['"]([^'"]+)['"]/.exec(m[1]);
                    if (toolMatch)
                        rawInnerName = toolMatch[1];
                }
                // Fallback: probe code comment (if not specified in JSON)
                if (!rawInnerName) {
                    const commentMatch = /\/\/\s*dsh-agy-link mirror:\s*replay recorded agy tool step \d+\s*\(([^)]+)\)/.exec(code);
                    if (commentMatch) {
                        rawInnerName = commentMatch[1];
                    }
                }
                const finalRawInner = rawInnerName ?? 'agy_tool';
                const effectiveName = mapAgyInnerNameToDsh(finalRawInner, delegationToolName);
                return {
                    effectiveName,
                    rawInnerName: finalRawInner,
                    isWrapped: true,
                    innerArguments,
                };
            }
        }
        // Direct run_code execution (not wrapping agy_tool or non-mirror code)
        return {
            effectiveName: 'run_code',
            rawInnerName: 'run_code',
            isWrapped: false,
            innerArguments: exec.arguments,
        };
    }
    // 3. Native direct call
    const rawInnerName = exec.name;
    let effectiveName;
    // Built-in native subagent / subagent_fork direct calls must stay intact
    // (they are not mapped to delegationToolName, so the orchestrator cannot bypass director)
    if (rawInnerName === 'subagent' || rawInnerName === 'subagent_fork') {
        effectiveName = rawInnerName;
    }
    else {
        effectiveName = AGY_TO_DSH_MAP[rawInnerName] ?? rawInnerName;
    }
    return {
        effectiveName,
        rawInnerName,
        isWrapped: false,
        innerArguments: exec.arguments,
    };
}
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
        'subagent_define',
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
    let warnedNoAgent = false;
    let warnedNoProjections = false;
    const blocked = (rawInnerName) => 'BLOCKED: orchestrate mode is ON for this session — you are the pure orchestrator and may not call `' +
        rawInnerName +
        '` yourself. This is enforced at the tool level, not a transient error: retrying will keep failing. ' +
        'You must NOT read files, search code, or execute commands directly. You MUST dispatch all exploration, research, and execution work via `' +
        deps.toolName +
        '` instead. To inspect or steer subagents you already started, use `list_agents`, `send_message`, or `interrupt_agent` (and `job_output` to collect background results).';
    return (exec) => {
        // 1. Unwrap intent to normalize agy_tool envelopes, run_code wrappers, and native calls
        const intent = unwrapToolIntent(exec, deps.toolName);
        // Fast path: allow-listed tools and vectr MCP tools are permitted for the orchestrator.
        if (allowed.has(intent.effectiveName) || isVectrMcpTool(intent.effectiveName))
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
        const s = agent.session;
        const origin = s?.header?.origin ?? s?.meta?.origin;
        const delegationDepth = Number(s?.header?.delegationDepth ?? s?.meta?.delegationDepth ?? 0);
        // Subagent children (spawn OR fork, any depth) are the workers: the
        // orchestrate contract never applies to them. Header/meta metadata is durable
        // (stamped by the subagent driver, survives resume), and it is the only
        // reliable discriminator — a fork child's log is seeded from the parent,
        // so an event-based check would falsely block the child.
        if (origin === 'subagent' || delegationDepth > 0)
            return undefined;
        const enforcement = deps.getEnforcement?.() ?? deps.enforcement ?? 'strict';
        // Per-turn orchestration tool-level block (controlled by enforcement setting:
        // strict blocks write/execute tools; lenient skips per-turn tool blocking).
        if (enforcement === 'strict' && detectPerTurnOrchestrate(agent.session) === 'on') {
            return blocked(intent.rawInnerName);
        }
        // Sticky orchestrate mode resolution (with 3-tier fallback to session.events)
        const projections = deps.getProjections();
        const mode = resolveOrchestrateMode(projections, [agent.session], (message, err) => deps.warn('orchestrate guard: ' + message, err));
        if (mode === 'on')
            return blocked(intent.rawInnerName);
        if (projections === undefined && !warnedNoProjections) {
            warnedNoProjections = true;
            deps.warn('orchestrate guard: sessionProjections service is missing — resolved mode via event fallback.');
        }
        return undefined;
    };
}
//# sourceMappingURL=orchestrate-guard.js.map