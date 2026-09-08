/**
 * Unit tests for the orchestrate-mode tool guard (tool-level enforcement of
 * the PURE ORCHESTRATOR contract) and the shared mode resolver.
 *
 * Covers the acceptance surface: mode-on blocks execution/write tools for the
 * main agent with an explicit BLOCKED reason, allows dispatch + read-only
 * tools; mode-off (and unresolvable) leaves everything allowed; subagent
 * children (durable header metadata) are never blocked; the read-only list is
 * config-driven (fail-closed for unlisted tools).
 */
import { describe, it, expect } from 'vitest';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';

import {
  createOrchestrateToolGuard,
  isVectrMcpTool,
  orchestrateAlwaysAllowedTools,
  ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS,
  ORCHESTRATE_SUBAGENT_CONTROL_TOOLS,
  AGY_TO_DSH_MAP,
  STRICT_MIRROR_RUN_CODE,
  unwrapToolIntent,
  type UnwrappedToolIntent,
  type OrchestrateGuardDeps,
} from '../src/orchestrate-guard.js';
import { resolveOrchestrateMode } from '../src/orchestrate.js';

/** Build the minimal ToolExecution shape the guard reads (name + agent + arguments). */
function makeExec(
  name: string,
  opts: {
    agent?: { session?: { header?: Record<string, unknown>; meta?: Record<string, unknown>; events?: unknown[] } };
    arguments?: unknown;
  } = {},
): ToolExecution {
  return { name, agent: opts.agent, arguments: opts.arguments } as unknown as ToolExecution;
}

/** Fake sessionProjections service returning a fixed mode for every session. */
function fakeProjections(mode: 'on' | 'off' | 'error' | 'empty') {
  return {
    snapshot: (session: unknown): { values: Record<string, { mode?: string }> } => {
      if (mode === 'error') throw new Error('projection cache miss');
      if (mode === 'empty') return { values: {} };
      return { values: { orchestrate: { mode } } };
    },
  };
}

/**
 * Build a session whose CURRENT turn is per-turn orchestrated the same way the
 * prompt/guard event stream does: a `turn/start` followed by a user/message
 * saying 使用orchestrate模式, or a `command/run` (/orchestrate <task>) inside
 * this turn's boundary (older message before it).
 */
function makePerTurnSession(kind: 'nl' | 'cmd'): { header: Record<string, unknown>; events: unknown[] } {
  if (kind === 'cmd') {
    return {
      header: { id: 's1' },
      events: [
        { type: 'user/message', seq: 0, data: { content: [{ type: 'text', text: '旧消息' }] } },
        { type: 'command/run', seq: 1, data: { name: 'orchestrate', args: ' 分析上周A股走势' } },
        { type: 'turn/start', seq: 2 },
        { type: 'user/message', seq: 3, data: { content: [{ type: 'text', text: '分析上周A股走势' }] } },
      ],
    };
  }
  return {
    header: { id: 's1' },
    events: [
      { type: 'turn/start', seq: 0 },
      { type: 'user/message', seq: 1, data: { content: [{ type: 'text', text: '使用orchestrate模式帮我分析' }] } },
    ],
  };
}

function makeGuard(
  mode: 'on' | 'off' | 'error' | 'empty' | 'missing',
  overrides: Partial<Pick<OrchestrateGuardDeps, 'toolName' | 'readOnlyTools' | 'enforcement'>> = {},
): (exec: ToolExecution) => string | undefined {
  const warnings: string[] = [];
  const deps: OrchestrateGuardDeps = {
    getProjections: () => (mode === 'missing' ? undefined : fakeProjections(mode)),
    toolName: overrides.toolName ?? 'subagent_role',
    readOnlyTools: overrides.readOnlyTools ?? ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS,
    enforcement: overrides.enforcement ?? 'strict',
    warn: (message: string) => warnings.push(message),
  };
  return createOrchestrateToolGuard(deps);
}



describe('isVectrMcpTool', () => {
  it('identifies default workspace vectr tools (mcp__vectr__*) and multi-codebase tools (mcp__vectr_<slug>__*)', () => {
    expect(isVectrMcpTool('mcp__vectr__search')).toBe(true);
    expect(isVectrMcpTool('mcp__vectr__locate')).toBe(true);
    expect(isVectrMcpTool('mcp__vectr__trace')).toBe(true);
    expect(isVectrMcpTool('mcp__vectr__vectr_search')).toBe(true);
    expect(isVectrMcpTool('mcp__vectr_demo__vectr_search')).toBe(true);
    expect(isVectrMcpTool('mcp__vectr_vnm__search')).toBe(true);
  });

  it('rejects non-vectr MCP tools and host tools (fail-closed)', () => {
    expect(isVectrMcpTool('mcp__github__create_issue')).toBe(false);
    expect(isVectrMcpTool('mcp__bash__run')).toBe(false);
    expect(isVectrMcpTool('mcp__filesystem__write_file')).toBe(false);
    expect(isVectrMcpTool('bash')).toBe(false);
    expect(isVectrMcpTool('edit')).toBe(false);
    expect(isVectrMcpTool('write')).toBe(false);
  });
});

describe('orchestrateAlwaysAllowedTools', () => {
  it('includes the configured delegation tool, close, control, job_output, and interaction tools, but excludes native subagent tools', () => {
    const allowed = orchestrateAlwaysAllowedTools('my_dispatch');
    expect(allowed).toContain('my_dispatch');
    expect(allowed).not.toContain('subagent');
    expect(allowed).not.toContain('subagent_fork');
    expect(allowed).toContain('close_subagent');
    expect(allowed).toContain('job_output');
    expect(allowed).toContain('ask_user_question');
    expect(allowed).toContain('todo_write');
    // The DSH base bundle's subagent control family (list_agents / send_message /
    // interrupt_agent) must always be allowed: without discovery + steering +
    // stop the orchestrator cannot manage the subagents it dispatches.
    expect(ORCHESTRATE_SUBAGENT_CONTROL_TOOLS).toEqual(['list_agents', 'send_message', 'interrupt_agent']);
    for (const name of ORCHESTRATE_SUBAGENT_CONTROL_TOOLS) {
      expect(allowed, name).toContain(name);
    }
    // `report` is child-scoped (registered only in continuable child contexts),
    // so it must NOT be in the orchestrator allow-set.
    expect(allowed).not.toContain('report');
  });
});

describe('createOrchestrateToolGuard — mode off (and unresolvable)', () => {
  it('leaves execution/write tools allowed when mode is off', () => {
    const guard = makeGuard('off');
    for (const name of ['bash', 'edit', 'write']) {
      expect(guard(makeExec(name))).toBeUndefined();
    }
  });

  it('leaves everything allowed when the projection service is missing (fail-open)', () => {
    const guard = makeGuard('missing');
    expect(guard(makeExec('bash'))).toBeUndefined();
  });

  it('leaves everything allowed when the mode cannot be resolved (fail-open)', () => {
    for (const mode of ['error', 'empty'] as const) {
      const guard = makeGuard(mode);
      expect(guard(makeExec('bash'))).toBeUndefined();
    }
  });

  it('leaves calls without a calling agent allowed (unattributable, fail-open)', () => {
    const guard = makeGuard('on');
    expect(guard({ name: 'bash' } as unknown as ToolExecution)).toBeUndefined();
  });
});

describe('createOrchestrateToolGuard — mode on, main agent', () => {
  const mainAgent = { session: { header: { id: 'main-session' } } };

  it('blocks execution/write tools with a BLOCKED reason naming the tool and the dispatch target', () => {
    const guard = makeGuard('on');
    // `report` is appended: it is a child-scoped subagent tool, so even if a
    // host ever exposed it to the main agent it must stay fail-closed here.
    for (const name of ['bash', 'edit', 'write', 'pwsh', 'str_replace_editor', 'report']) {
      const reason = guard(makeExec(name, { agent: mainAgent }));
      expect(reason, name).toBeDefined();
      expect(reason).toContain('BLOCKED');
      expect(reason).toContain('orchestrate mode');
      expect(reason).toContain('`' + name + '`');
      expect(reason).toContain('subagent_role');
    }
  });

  it('is fail-closed: unlisted/unknown tools and other MCP tools are blocked too', () => {
    const guard = makeGuard('on');
    expect(guard(makeExec('mcp_some_write_tool', { agent: mainAgent }))).toContain('BLOCKED');
    expect(guard(makeExec('mcp__github__create_issue', { agent: mainAgent }))).toContain('BLOCKED');
    expect(guard(makeExec('mcp__filesystem__write_file', { agent: mainAgent }))).toContain('BLOCKED');
  });

  it('allows vectr MCP tools (mcp__vectr__* and mcp__vectr_<slug>__*) via fast path', () => {
    const guard = makeGuard('on');
    expect(guard(makeExec('mcp__vectr__search', { agent: mainAgent }))).toBeUndefined();
    expect(guard(makeExec('mcp__vectr__locate', { agent: mainAgent }))).toBeUndefined();
    expect(guard(makeExec('mcp__vectr_proj__search', { agent: mainAgent }))).toBeUndefined();
    // Non-vectr MCP tools remain blocked
    expect(guard(makeExec('mcp__github__create_issue', { agent: mainAgent }))).toContain('BLOCKED');
  });

  it('allows only dispatch tools, subagent control tools, job_output, and interaction tools', () => {
    const guard = makeGuard('on');
    for (const name of [
      'subagent_role',
      'close_subagent',
      ...ORCHESTRATE_SUBAGENT_CONTROL_TOOLS,
      'job_output',
      'ask_user_question',
      'todo_write',
    ]) {
      expect(guard(makeExec(name, { agent: mainAgent })), name).toBeUndefined();
    }
    // Native subagent tools, probing tools, and default read tools are strictly blocked
    for (const name of ['subagent', 'subagent_fork', 'read', 'grep', 'glob', 'ls', 'find']) {
      expect(guard(makeExec(name, { agent: mainAgent }))).toContain('BLOCKED');
    }
  });

  it('keeps the subagent control tools allowed even when the read-only list is overridden', () => {
    // The control family lives in the always-allowed set, not in the
    // config-injected read-only list — a deployment that narrows readOnlyTools
    // must not strip discovery/steering/stop from the orchestrator.
    const guard = makeGuard('on', { readOnlyTools: ['read'] });
    for (const name of ORCHESTRATE_SUBAGENT_CONTROL_TOOLS) {
      expect(guard(makeExec(name, { agent: mainAgent })), name).toBeUndefined();
    }
  });

  it('honours a custom read-only list (config-injected, fail-closed)', () => {
    const guard = makeGuard('on', { readOnlyTools: ['read'] });
    expect(guard(makeExec('read', { agent: mainAgent }))).toBeUndefined();
    // grep dropped from the allow-list → now blocked for the orchestrator.
    expect(guard(makeExec('grep', { agent: mainAgent }))).toContain('BLOCKED');
  });
});

describe('createOrchestrateToolGuard — enforcement matrix (sticky × per-turn × strict/lenient)', () => {
  const mainAgent = { session: { header: { id: 'main-session' } } };

  it('strict: blocks write/execute and read tools on a per-turn natural-language turn (no sticky on)', () => {
    const guard = makeGuard('off', { enforcement: 'strict' });
    const perTurn = { agent: { session: makePerTurnSession('nl') } };
    expect(guard(makeExec('bash', perTurn))).toContain('BLOCKED');
    expect(guard(makeExec('edit', perTurn))).toContain('BLOCKED');
    expect(guard(makeExec('read', perTurn))).toContain('BLOCKED');
    expect(guard(makeExec('subagent_role', perTurn))).toBeUndefined();
  });

  it('strict: blocks write/execute tools on a /orchestrate <task> turn (command/run inside turn boundary)', () => {
    const guard = makeGuard('off', { enforcement: 'strict' });
    const perTurn = { agent: { session: makePerTurnSession('cmd') } };
    expect(guard(makeExec('bash', perTurn))).toContain('BLOCKED');
    expect(guard(makeExec('write', perTurn))).toContain('BLOCKED');
    // Dispatch tools stay allowed.
    expect(guard(makeExec('subagent_role', perTurn))).toBeUndefined();
  });

  it('strict: does NOT leak the per-turn block into a later turn (turn boundary respected)', () => {
    const guard = makeGuard('off', { enforcement: 'strict' });
    const session = {
      header: { id: 's1' },
      events: [
        { type: 'turn/start', seq: 0 },
        { type: 'user/message', seq: 1, data: { content: [{ type: 'text', text: '使用orchestrate模式帮我分析' }] } },
        { type: 'turn/start', seq: 2 },
        { type: 'user/message', seq: 3, data: { content: [{ type: 'text', text: '后续普通消息' }] } },
      ],
    };
    expect(guard(makeExec('bash', { agent: { session } }))).toBeUndefined();
  });

  it('strict: still blocks on the sticky projection when the current turn declares nothing', () => {
    const guard = makeGuard('on', { enforcement: 'strict' });
    expect(guard(makeExec('bash', { agent: mainAgent }))).toContain('BLOCKED');
  });

  it('lenient: also blocks per-turn turn (physical circuit breaker without lenient exemption)', () => {
    const guard = makeGuard('off', { enforcement: 'lenient' });
    for (const kind of ['nl', 'cmd'] as const) {
      const perTurn = { agent: { session: makePerTurnSession(kind) } };
      expect(guard(makeExec('bash', perTurn)), kind).toContain('BLOCKED');
      expect(guard(makeExec('read', perTurn)), kind).toContain('BLOCKED');
      expect(guard(makeExec('subagent_role', perTurn)), kind).toBeUndefined();
    }
  });

  it('lenient: still blocks on the sticky projection (the hard boundary)', () => {
    const guard = makeGuard('on', { enforcement: 'lenient' });
    expect(guard(makeExec('bash', { agent: mainAgent }))).toContain('BLOCKED');
    expect(guard(makeExec('read', { agent: mainAgent }))).toContain('BLOCKED');
    expect(guard(makeExec('subagent_role', { agent: mainAgent }))).toBeUndefined();
  });

  it('defaults to strict when enforcement is omitted (existing behaviour preserved)', () => {
    const guard = makeGuard('off');
    const perTurn = { agent: { session: makePerTurnSession('nl') } };
    expect(guard(makeExec('bash', perTurn))).toContain('BLOCKED');
  });

  it('never blocks subagent children on a per-turn turn even under strict (workers keep full access)', () => {
    const guard = makeGuard('off', { enforcement: 'strict' });
    const child = { agent: { session: { header: { origin: 'subagent', delegationDepth: 1 }, events: makePerTurnSession('nl').events } } };
    expect(guard(makeExec('bash', child))).toBeUndefined();
  });
});

describe('createOrchestrateToolGuard — subagent children', () => {
  const spawnChild = { session: { header: { origin: 'subagent', delegationDepth: 1 } } };
  const forkChild = { session: { header: { delegationDepth: 2 } } };

  it('never blocks subagent children (spawn: origin subagent) even when their seeded log says mode on', () => {
    const guard = makeGuard('on');
    expect(guard(makeExec('bash', { agent: spawnChild }))).toBeUndefined();
    expect(guard(makeExec('edit', { agent: spawnChild }))).toBeUndefined();
  });

  it('never blocks subagent children (fork: depth only, log seeded from parent)', () => {
    const guard = makeGuard('on');
    expect(guard(makeExec('bash', { agent: forkChild }))).toBeUndefined();
  });
});

describe('resolveOrchestrateMode', () => {
  const s1 = { id: 's1' };
  const s2 = { id: 's2' };

  it('returns undefined when projections are missing', () => {
    expect(resolveOrchestrateMode(undefined, [s1])).toBeUndefined();
  });

  it('returns on when any candidate says on (on wins immediately)', () => {
    const projections = {
      snapshot: (s: { id: string }) => ({ values: { orchestrate: { mode: s.id === 's2' ? 'on' : 'off' } } }),
    };
    expect(resolveOrchestrateMode(projections, [s1, s2])).toBe('on');
  });

  it('returns the first known value when no candidate says on', () => {
    const projections = { snapshot: () => ({ values: { orchestrate: { mode: 'off' } } }) };
    expect(resolveOrchestrateMode(projections, [s1, s2])).toBe('off');
  });

  it('reports per-candidate errors through warn and keeps probing', () => {
    const warnings: string[] = [];
    const projections = {
      snapshot: (s: { id: string }) => {
        if (s.id === 's1') throw new Error('boom');
        return { values: { orchestrate: { mode: 'on' } } };
      },
    };
    const mode = resolveOrchestrateMode(projections, [s1, s2], (m) => warnings.push(m));
    expect(mode).toBe('on');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('could not read orchestrator mode');
  });

  it('returns undefined when no candidate yields a value', () => {
    const projections = { snapshot: () => ({ values: {} }) };
    expect(resolveOrchestrateMode(projections, [s1])).toBeUndefined();
  });

  it('falls back to reverse scan of session.events when projections WeakMap misses or is missing', () => {
    const sessionWithEvents = {
      id: 's-events',
      events: [
        { type: 'user/message', seq: 0 },
        { type: 'orchestrate/change', seq: 1, data: { mode: 'on' } },
      ],
    };
    // Projections service present but returns empty for this session (WeakMap miss)
    const projectionsEmpty = { snapshot: () => ({ values: {} }) };
    expect(resolveOrchestrateMode(projectionsEmpty, [sessionWithEvents])).toBe('on');

    // Projections service completely undefined
    expect(resolveOrchestrateMode(undefined, [sessionWithEvents])).toBe('on');
  });

  it('falls back to reverse scan of session.snapshotEvents() function', () => {
    const sessionWithMethod = {
      id: 's-method',
      snapshotEvents: () => [
        { type: 'orchestrate/change', seq: 0, data: { mode: 'off' } },
        { type: 'orchestrate/change', seq: 1, data: { mode: 'on' } },
      ],
    };
    expect(resolveOrchestrateMode(undefined, [sessionWithMethod])).toBe('on');
  });
});

describe('unwrapToolIntent & AGY_TO_DSH_MAP', () => {
  it('defines the complete AGY_TO_DSH_MAP dictionary per specification', () => {
    // Delegation mappings
    expect(AGY_TO_DSH_MAP['invoke_subagent']).toBe('subagent_role');
    expect(AGY_TO_DSH_MAP['run_subagent']).toBe('subagent_role');
    expect(AGY_TO_DSH_MAP['subagent']).toBe('subagent_role');
    // Define mappings
    expect(AGY_TO_DSH_MAP['define_subagent']).toBe('subagent_define');
    expect(AGY_TO_DSH_MAP['defineSubagent']).toBe('subagent_define');
    // Shell execution mappings
    expect(AGY_TO_DSH_MAP['run_command']).toBe('bash');
    expect(AGY_TO_DSH_MAP['execute_command']).toBe('bash');
    expect(AGY_TO_DSH_MAP['bash']).toBe('bash');
    // File edit / write mappings
    expect(AGY_TO_DSH_MAP['write_to_file']).toBe('edit');
    expect(AGY_TO_DSH_MAP['replace_file_content']).toBe('edit');
    expect(AGY_TO_DSH_MAP['edit_file']).toBe('edit');
    expect(AGY_TO_DSH_MAP['create_file']).toBe('edit');
    expect(AGY_TO_DSH_MAP['edit']).toBe('edit');
    // File read mappings
    expect(AGY_TO_DSH_MAP['read_file']).toBe('read');
    expect(AGY_TO_DSH_MAP['view_file']).toBe('read');
    expect(AGY_TO_DSH_MAP['read']).toBe('read');
    // Directory / file search mappings
    expect(AGY_TO_DSH_MAP['list_directory']).toBe('ls');
    expect(AGY_TO_DSH_MAP['ls']).toBe('ls');
    expect(AGY_TO_DSH_MAP['find_files']).toBe('find');
    expect(AGY_TO_DSH_MAP['find']).toBe('find');
    expect(AGY_TO_DSH_MAP['glob']).toBe('find');
    // Grep search mappings
    expect(AGY_TO_DSH_MAP['grep_search']).toBe('grep');
    expect(AGY_TO_DSH_MAP['search_files']).toBe('grep');
    expect(AGY_TO_DSH_MAP['grep']).toBe('grep');
    // Interaction mappings
    expect(AGY_TO_DSH_MAP['ask_user_question']).toBe('ask_user_question');
    expect(AGY_TO_DSH_MAP['ask_user']).toBe('ask_user_question');
    expect(AGY_TO_DSH_MAP['ask']).toBe('ask_user_question');
    expect(AGY_TO_DSH_MAP['todo_write']).toBe('todo_write');
    expect(AGY_TO_DSH_MAP['todo']).toBe('todo_write');
  });

  it('unwraps native direct calls without altering semantics (subagent preserved)', () => {
    const bash = unwrapToolIntent(makeExec('bash'), 'subagent_role');
    expect(bash).toEqual({
      effectiveName: 'bash',
      rawInnerName: 'bash',
      isWrapped: false,
      innerArguments: undefined,
    });

    const role = unwrapToolIntent(makeExec('subagent_role'), 'subagent_role');
    expect(role).toEqual({
      effectiveName: 'subagent_role',
      rawInnerName: 'subagent_role',
      isWrapped: false,
      innerArguments: undefined,
    });

    // Native subagent is NOT mapped to delegationToolName
    const nativeSubagent = unwrapToolIntent(makeExec('subagent'), 'subagent_role');
    expect(nativeSubagent).toEqual({
      effectiveName: 'subagent',
      rawInnerName: 'subagent',
      isWrapped: false,
      innerArguments: undefined,
    });
  });

  it('unwraps agy_tool envelopes and routes delegation to custom delegationToolName', () => {
    const inv = unwrapToolIntent(
      makeExec('agy_tool', { arguments: { tool: 'invoke_subagent', input: { role: 'tester' } } }),
      'custom_dispatch',
    );
    expect(inv.effectiveName).toBe('custom_dispatch');
    expect(inv.rawInnerName).toBe('invoke_subagent');
    expect(inv.isWrapped).toBe(true);
    expect(inv.innerArguments).toEqual({ role: 'tester' });

    // Inner subagent in agy_tool maps to delegationToolName
    const agySubagent = unwrapToolIntent(
      makeExec('agy_tool', { arguments: { tool: 'subagent', input: { prompt: 'hi' } } }),
      'subagent_role',
    );
    expect(agySubagent.effectiveName).toBe('subagent_role');
    expect(agySubagent.rawInnerName).toBe('subagent');
    expect(agySubagent.isWrapped).toBe(true);

    // agy_tool run_command
    const agyBash = unwrapToolIntent(
      makeExec('agy_tool', { arguments: JSON.stringify({ run: 'r1', step: 0, tool: 'run_command' }) }),
      'subagent_role',
    );
    expect(agyBash.effectiveName).toBe('bash');
    expect(agyBash.rawInnerName).toBe('run_command');
    expect(agyBash.isWrapped).toBe(true);
  });

  it('unwraps run_code wrappers embedding agy_tool', () => {
    const codeCall = unwrapToolIntent(
      makeExec('run_code', {
        arguments: {
          code: "// dsh-agy-link mirror: replay recorded agy tool step 0 (invoke_subagent)\nreturn await tools['agy_tool']({\"run\":\"r1\",\"step\":0,\"tool\":\"invoke_subagent\"})",
          description: 'replay agy tool step 0 · invoke_subagent',
        },
      }),
      'subagent_role',
    );
    expect(codeCall.effectiveName).toBe('subagent_role');
    expect(codeCall.rawInnerName).toBe('invoke_subagent');
    expect(codeCall.isWrapped).toBe(true);

    const codeBash = unwrapToolIntent(
      makeExec('run_code', {
        arguments: {
          code: "return await tools['agy_tool']({\"run\":\"r1\",\"step\":1,\"tool\":\"run_command\"})",
          description: 'replay agy tool step 1 · run_command',
        },
      }),
      'subagent_role',
    );
    expect(codeBash.effectiveName).toBe('bash');
    expect(codeBash.rawInnerName).toBe('run_command');
    expect(codeBash.isWrapped).toBe(true);

    // Fallback via comment when tool is omitted in JSON
    const legacyCode = unwrapToolIntent(
      makeExec('run_code', {
        arguments: {
          code: "// dsh-agy-link mirror: replay recorded agy tool step 2 (write_to_file)\nreturn await tools['agy_tool']({\"run\":\"r1\",\"step\":2})",
          description: 'replay agy tool step 2 · write_to_file',
        },
      }),
      'subagent_role',
    );
    expect(legacyCode.effectiveName).toBe('edit');
    expect(legacyCode.rawInnerName).toBe('write_to_file');
    expect(legacyCode.isWrapped).toBe(true);

    // Non-agy run_code stays run_code
    const plainCode = unwrapToolIntent(
      makeExec('run_code', { arguments: { code: 'console.log("direct")' } }),
      'subagent_role',
    );
    expect(plainCode.effectiveName).toBe('run_code');
    expect(plainCode.rawInnerName).toBe('run_code');
    expect(plainCode.isWrapped).toBe(false);
  });
});

describe('createOrchestrateToolGuard — agy_tool & run_code envelope unwrap & enforcement', () => {
  const mainAgent = { session: { header: { id: 'main-session' } } };

  it('allows agy_tool calling invoke_subagent under orchestrate mode', () => {
    const guard = makeGuard('on');
    const exec = makeExec('agy_tool', {
      agent: mainAgent,
      arguments: { tool: 'invoke_subagent', input: { role: 'developer' } },
    });
    expect(guard(exec)).toBeUndefined();
  });

  it('allows agy_tool calling run_subagent or subagent under orchestrate mode', () => {
    const guard = makeGuard('on');
    for (const tool of ['run_subagent', 'subagent']) {
      const exec = makeExec('agy_tool', {
        agent: mainAgent,
        arguments: { tool, input: { prompt: 'do work' } },
      });
      expect(guard(exec), tool).toBeUndefined();
    }
  });

  it('allows run_code wrapping agy_tool with invoke_subagent under orchestrate mode', () => {
    const guard = makeGuard('on');
    const exec = makeExec('run_code', {
      agent: mainAgent,
      arguments: {
        code: "return await tools['agy_tool']({\"run\":\"r1\",\"step\":0,\"tool\":\"invoke_subagent\"})",
        description: 'replay agy tool step 0 · invoke_subagent',
      },
    });
    expect(guard(exec)).toBeUndefined();
  });

  it('allows run_code wrapping agy_tool with subagent under orchestrate mode', () => {
    const guard = makeGuard('on');
    const exec = makeExec('run_code', {
      agent: mainAgent,
      arguments: {
        code: "return await tools['agy_tool']({\"run\":\"r1\",\"step\":0,\"tool\":\"subagent\"})",
        description: 'replay agy tool step 0 · subagent',
      },
    });
    expect(guard(exec)).toBeUndefined();
  });

  it('allows agy_tool calling define_subagent, ask_user_question, and todo_write under orchestrate mode', () => {
    const guard = makeGuard('on');
    for (const tool of ['define_subagent', 'defineSubagent', 'ask_user_question', 'ask_user', 'todo_write', 'todo']) {
      const exec = makeExec('agy_tool', {
        agent: mainAgent,
        arguments: { tool },
      });
      expect(guard(exec), tool).toBeUndefined();
    }
  });

  it('blocks agy_tool calling run_command with BLOCKED reason and inner tool name', () => {
    const guard = makeGuard('on');
    const exec = makeExec('agy_tool', {
      agent: mainAgent,
      arguments: { tool: 'run_command', input: { CommandLine: 'npm test' } },
    });
    const reason = guard(exec);
    expect(reason).toBeDefined();
    expect(reason).toContain('BLOCKED: orchestrate mode is ON');
    expect(reason).toContain('`run_command`');
    expect(reason).toContain('subagent_role');
  });

  it('blocks agy_tool calling write_to_file with BLOCKED reason and inner tool name', () => {
    const guard = makeGuard('on');
    const exec = makeExec('agy_tool', {
      agent: mainAgent,
      arguments: { tool: 'write_to_file', input: { AbsolutePath: '/tmp/test.ts' } },
    });
    const reason = guard(exec);
    expect(reason).toBeDefined();
    expect(reason).toContain('BLOCKED: orchestrate mode is ON');
    expect(reason).toContain('`write_to_file`');
    expect(reason).toContain('subagent_role');
  });

  it('blocks agy_tool calling read_file with BLOCKED reason and inner tool name', () => {
    const guard = makeGuard('on');
    const exec = makeExec('agy_tool', {
      agent: mainAgent,
      arguments: { tool: 'read_file', input: { AbsolutePath: '/tmp/test.ts' } },
    });
    const reason = guard(exec);
    expect(reason).toBeDefined();
    expect(reason).toContain('BLOCKED: orchestrate mode is ON');
    expect(reason).toContain('`read_file`');
    expect(reason).toContain('subagent_role');
  });

  it('blocks run_code wrapping agy_tool with run_command or write_to_file', () => {
    const guard = makeGuard('on');
    const bashExec = makeExec('run_code', {
      agent: mainAgent,
      arguments: {
        code: "return await tools['agy_tool']({\"run\":\"r1\",\"step\":3,\"tool\":\"run_command\"})",
        description: 'replay agy tool step 3 · run_command',
      },
    });
    const bashReason = guard(bashExec);
    expect(bashReason).toContain('BLOCKED');
    expect(bashReason).toContain('`run_command`');
    expect(bashReason).toContain('subagent_role');

    const editExec = makeExec('run_code', {
      agent: mainAgent,
      arguments: {
        code: "return await tools['agy_tool']({\"run\":\"r1\",\"step\":4,\"tool\":\"write_to_file\"})",
        description: 'replay agy tool step 4 · write_to_file',
      },
    });
    const editReason = guard(editExec);
    expect(editReason).toContain('BLOCKED');
    expect(editReason).toContain('`write_to_file`');
    expect(editReason).toContain('subagent_role');
  });

  it('allows subagent child sessions (delegationDepth > 0 or origin subagent) to call agy_tool run_command / write_to_file', () => {
    const guard = makeGuard('on');
    const depthChild = { session: { header: { delegationDepth: 1 } } };
    const originChild = { session: { header: { origin: 'subagent' } } };

    for (const child of [depthChild, originChild]) {
      const execCmd = makeExec('agy_tool', {
        agent: child,
        arguments: { tool: 'run_command', input: { CommandLine: 'cat /etc/hosts' } },
      });
      expect(guard(execCmd)).toBeUndefined();

      const execWrite = makeExec('agy_tool', {
        agent: child,
        arguments: { tool: 'write_to_file', input: { AbsolutePath: '/app/index.ts' } },
      });
      expect(guard(execWrite)).toBeUndefined();

      const execCode = makeExec('run_code', {
        agent: child,
        arguments: {
          code: "return await tools['agy_tool']({\"run\":\"r1\",\"step\":0,\"tool\":\"run_command\"})",
        },
      });
      expect(guard(execCode)).toBeUndefined();
    }
  });

  it('enforces unwrap on per-turn orchestration as well', () => {
    const guard = makeGuard('off');
    const perTurn = { agent: { session: makePerTurnSession('nl') } };

    // invoke_subagent allowed
    const allowExec = makeExec('agy_tool', {
      agent: perTurn.agent,
      arguments: { tool: 'invoke_subagent' },
    });
    expect(guard(allowExec)).toBeUndefined();

    // run_command blocked with inner name
    const blockExec = makeExec('agy_tool', {
      agent: perTurn.agent,
      arguments: { tool: 'run_command' },
    });
    const reason = guard(blockExec);
    expect(reason).toContain('BLOCKED');
    expect(reason).toContain('`run_command`');
  });
});

describe('Adversarial vulnerability defenses & compatibility', () => {
  const mainAgent = { session: { header: { id: 'main-session' } } };

  describe('P0 Defense: run_code multi-statement / injection / description spoofing prevention', () => {
    it('blocks run_code with statements appended after return await tools["agy_tool"](...)', () => {
      const guard = makeGuard('on');
      const maliciousExec = makeExec('run_code', {
        agent: mainAgent,
        arguments: {
          code: 'return await tools["agy_tool"]({"tool":"invoke_subagent"}); process.exit(1);',
        },
      });

      const intent = unwrapToolIntent(maliciousExec, 'subagent_role');
      expect(intent.isWrapped).toBe(false);
      expect(intent.effectiveName).toBe('run_code');

      const reason = guard(maliciousExec);
      expect(reason).toBeDefined();
      expect(reason).toContain('BLOCKED');
      expect(reason).toContain('`run_code`');
    });

    it('blocks run_code with statements prepended before return await tools["agy_tool"](...)', () => {
      const guard = makeGuard('on');
      const maliciousExec = makeExec('run_code', {
        agent: mainAgent,
        arguments: {
          code: 'require("fs").writeFileSync("/tmp/exploit", "hacked"); return await tools["agy_tool"]({"tool":"invoke_subagent"})',
        },
      });

      const intent = unwrapToolIntent(maliciousExec, 'subagent_role');
      expect(intent.isWrapped).toBe(false);
      expect(intent.effectiveName).toBe('run_code');

      const reason = guard(maliciousExec);
      expect(reason).toBeDefined();
      expect(reason).toContain('BLOCKED');
      expect(reason).toContain('`run_code`');
    });

    it('blocks description privilege escalation attempt when code does not specify invoke_subagent', () => {
      const guard = makeGuard('on');
      const spoofExec = makeExec('run_code', {
        agent: mainAgent,
        arguments: {
          code: 'return await tools["agy_tool"]({"run":"r1","step":0})',
          description: 'replay agy tool step 0 · invoke_subagent',
        },
      });

      const intent = unwrapToolIntent(spoofExec, 'subagent_role');
      // Description is strictly ignored: rawInnerName must NOT be elevated to invoke_subagent!
      expect(intent.rawInnerName).not.toBe('invoke_subagent');
      expect(intent.effectiveName).not.toBe('subagent_role');

      // agy_tool fallback is not allowed for pure orchestrator
      const reason = guard(spoofExec);
      expect(reason).toBeDefined();
      expect(reason).toContain('BLOCKED');
    });

    it('blocks non-mirror code with comments spoofing agy replay', () => {
      const guard = makeGuard('on');
      const fakeExec = makeExec('run_code', {
        agent: mainAgent,
        arguments: {
          code: '// dsh-agy-link mirror: replay recorded agy tool step 0 (invoke_subagent)\nconst malicious = true;',
        },
      });

      const intent = unwrapToolIntent(fakeExec, 'subagent_role');
      expect(intent.isWrapped).toBe(false);
      expect(intent.effectiveName).toBe('run_code');

      const reason = guard(fakeExec);
      expect(reason).toBeDefined();
      expect(reason).toContain('BLOCKED');
    });

    it('allows strictly matched single-line mirror run_code with or without leading comment', () => {
      const guard = makeGuard('on');

      // Without comment, bracket notation
      const exec1 = makeExec('run_code', {
        agent: mainAgent,
        arguments: {
          code: 'return await tools[\'agy_tool\']({"tool":"invoke_subagent","input":{"role":"dev"}});',
        },
      });
      expect(guard(exec1)).toBeUndefined();

      // With leading comment, dot notation
      const exec2 = makeExec('run_code', {
        agent: mainAgent,
        arguments: {
          code: '// replay step 0\nreturn await tools.agy_tool({"tool":"invoke_subagent"})',
        },
      });
      expect(guard(exec2)).toBeUndefined();
    });

    it('exports and validates STRICT_MIRROR_RUN_CODE pattern', () => {
      expect(STRICT_MIRROR_RUN_CODE.test('return await tools["agy_tool"]({})')).toBe(true);
      expect(STRICT_MIRROR_RUN_CODE.test('return await tools.agy_tool({})')).toBe(true);
      expect(STRICT_MIRROR_RUN_CODE.test('// comment\nreturn await tools["agy_tool"]({})')).toBe(true);
      expect(STRICT_MIRROR_RUN_CODE.test('return await tools["agy_tool"]({}); somethingElse();')).toBe(false);
      expect(STRICT_MIRROR_RUN_CODE.test('somethingElse(); return await tools["agy_tool"]({})')).toBe(false);
    });
  });

  describe('P0 Defense: Casing & camelCase/PascalCase subagent delegation name variants', () => {
    it('maps all camelCase and PascalCase variants in AGY_TO_DSH_MAP', () => {
      expect(AGY_TO_DSH_MAP['invokeSubagent']).toBe('subagent_role');
      expect(AGY_TO_DSH_MAP['InvokeSubagent']).toBe('subagent_role');
      expect(AGY_TO_DSH_MAP['runSubagent']).toBe('subagent_role');
      expect(AGY_TO_DSH_MAP['RunSubagent']).toBe('subagent_role');
      expect(AGY_TO_DSH_MAP['Subagent']).toBe('subagent_role');
    });

    it('allows agy_tool with camelCase or PascalCase delegation tool names', () => {
      const guard = makeGuard('on');
      const variants = [
        'invoke_subagent',
        'invokeSubagent',
        'InvokeSubagent',
        'run_subagent',
        'runSubagent',
        'RunSubagent',
        'subagent',
        'Subagent',
      ];

      for (const tool of variants) {
        const exec = makeExec('agy_tool', {
          agent: mainAgent,
          arguments: { tool, input: { role: 'tester' } },
        });
        const reason = guard(exec);
        expect(reason, `Expected ${tool} to be allowed`).toBeUndefined();
      }
    });

    it('routes normalized delegation variants to custom delegationToolName', () => {
      const variants = [
        'invoke_subagent',
        'invokeSubagent',
        'InvokeSubagent',
        'run_subagent',
        'runSubagent',
        'RunSubagent',
        'subagent',
        'Subagent',
        'invoke-subagent',
      ];

      for (const tool of variants) {
        const intent = unwrapToolIntent(
          makeExec('agy_tool', { arguments: { tool } }),
          'custom_orchestrator_dispatch',
        );
        expect(intent.effectiveName, tool).toBe('custom_orchestrator_dispatch');
      }
    });
  });

  describe('P1 Compatibility: PascalCase argument key parsing', () => {
    it('unwraps agy_tool with PascalCase keys (Tool, ToolName, tool_name, Input)', () => {
      // Tool + Input
      const exec1 = makeExec('agy_tool', {
        arguments: { Tool: 'invoke_subagent', Input: { role: 'architect' } },
      });
      const intent1 = unwrapToolIntent(exec1, 'subagent_role');
      expect(intent1.rawInnerName).toBe('invoke_subagent');
      expect(intent1.effectiveName).toBe('subagent_role');
      expect(intent1.innerArguments).toEqual({ role: 'architect' });

      // ToolName
      const exec2 = makeExec('agy_tool', {
        arguments: { ToolName: 'InvokeSubagent' },
      });
      const intent2 = unwrapToolIntent(exec2, 'subagent_role');
      expect(intent2.rawInnerName).toBe('InvokeSubagent');
      expect(intent2.effectiveName).toBe('subagent_role');

      // tool_name
      const exec3 = makeExec('agy_tool', {
        arguments: { tool_name: 'invoke_subagent' },
      });
      const intent3 = unwrapToolIntent(exec3, 'subagent_role');
      expect(intent3.rawInnerName).toBe('invoke_subagent');
      expect(intent3.effectiveName).toBe('subagent_role');
    });

    it('allows PascalCase subagent delegation in guard and blocks PascalCase execution tools', () => {
      const guard = makeGuard('on');

      // PascalCase delegation allowed
      const allowExec = makeExec('agy_tool', {
        agent: mainAgent,
        arguments: { Tool: 'InvokeSubagent', Input: { prompt: 'design' } },
      });
      expect(guard(allowExec)).toBeUndefined();

      // PascalCase run_command blocked
      const blockExec = makeExec('agy_tool', {
        agent: mainAgent,
        arguments: { Tool: 'run_command', Input: { CommandLine: 'rm -rf /' } },
      });
      const reason = guard(blockExec);
      expect(reason).toBeDefined();
      expect(reason).toContain('BLOCKED');
      expect(reason).toContain('`run_command`');
    });

    it('unwraps PascalCase keys inside run_code mirror statements', () => {
      const guard = makeGuard('on');
      const exec = makeExec('run_code', {
        agent: mainAgent,
        arguments: {
          code: 'return await tools["agy_tool"]({"Tool":"InvokeSubagent","Input":{"role":"qa"}})',
        },
      });

      const intent = unwrapToolIntent(exec, 'subagent_role');
      expect(intent.isWrapped).toBe(true);
      expect(intent.rawInnerName).toBe('InvokeSubagent');
      expect(intent.effectiveName).toBe('subagent_role');
      expect(intent.innerArguments).toEqual({ role: 'qa' });
      expect(guard(exec)).toBeUndefined();
    });
  });

  describe('P1 Stability: session.meta subagent identification dual compatibility', () => {
    it('allows worker subagents identified via session.meta.origin = "subagent"', () => {
      const guard = makeGuard('on');
      const metaOriginWorker = {
        session: {
          meta: { origin: 'subagent' },
        },
      };

      expect(guard(makeExec('bash', { agent: metaOriginWorker }))).toBeUndefined();
      expect(guard(makeExec('edit', { agent: metaOriginWorker }))).toBeUndefined();
      expect(guard(makeExec('write', { agent: metaOriginWorker }))).toBeUndefined();
    });

    it('allows worker subagents identified via session.meta.delegationDepth > 0', () => {
      const guard = makeGuard('on');
      const metaDepthWorker = {
        session: {
          meta: { delegationDepth: 1 },
        },
      };

      expect(guard(makeExec('bash', { agent: metaDepthWorker }))).toBeUndefined();
      expect(guard(makeExec('edit', { agent: metaDepthWorker }))).toBeUndefined();
    });

    it('allows worker subagents with string delegationDepth in session.meta', () => {
      const guard = makeGuard('on');
      const stringDepthWorker = {
        session: {
          meta: { delegationDepth: '2' },
        },
      };

      expect(guard(makeExec('bash', { agent: stringDepthWorker }))).toBeUndefined();
    });

    it('blocks main agent when neither header nor meta has subagent origin or delegationDepth', () => {
      const guard = makeGuard('on');
      const pureMain = {
        session: {
          meta: { origin: 'user', delegationDepth: 0 },
        },
      };

      expect(guard(makeExec('bash', { agent: pureMain }))).toContain('BLOCKED');
      expect(guard(makeExec('edit', { agent: pureMain }))).toContain('BLOCKED');
    });
  });
});
