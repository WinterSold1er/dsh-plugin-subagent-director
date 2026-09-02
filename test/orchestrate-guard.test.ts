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
  type OrchestrateGuardDeps,
} from '../src/orchestrate-guard.js';
import { resolveOrchestrateMode } from '../src/orchestrate.js';

/** Build the minimal ToolExecution shape the guard reads (name + agent). */
function makeExec(
  name: string,
  opts: { agent?: { session?: { header?: Record<string, unknown>; events?: unknown[] } } } = {},
): ToolExecution {
  return { name, agent: opts.agent } as unknown as ToolExecution;
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
  it('always includes the configured delegation tool, built-in subagent tools, close, control, job_output, and interaction tools', () => {
    const allowed = orchestrateAlwaysAllowedTools('my_dispatch');
    expect(allowed).toContain('my_dispatch');
    expect(allowed).toContain('subagent');
    expect(allowed).toContain('subagent_fork');
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

  it('allows dispatch tools, subagent control tools, job_output, interaction tools, read-only tools, and vectr MCP tools', () => {
    const guard = makeGuard('on');
    for (const name of [
      'subagent_role',
      'subagent',
      'subagent_fork',
      'close_subagent',
      ...ORCHESTRATE_SUBAGENT_CONTROL_TOOLS,
      'job_output',
      'ask_user_question',
      'todo_write',
      ...ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS,
      'mcp__vectr__search',
      'mcp__vectr__vectr_search',
      'mcp__vectr_demo__search',
    ]) {
      expect(guard(makeExec(name, { agent: mainAgent })), name).toBeUndefined();
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

  it('strict: blocks write/execute tools on a per-turn natural-language turn (no sticky on)', () => {
    const guard = makeGuard('off', { enforcement: 'strict' });
    const perTurn = { agent: { session: makePerTurnSession('nl') } };
    expect(guard(makeExec('bash', perTurn))).toContain('BLOCKED');
    expect(guard(makeExec('edit', perTurn))).toContain('BLOCKED');
    // Read-only tools stay allowed on the same turn.
    expect(guard(makeExec('read', perTurn))).toBeUndefined();
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

  it('lenient: does NOT block a per-turn turn (prompt-only), even when a per-turn request is present', () => {
    const guard = makeGuard('off', { enforcement: 'lenient' });
    for (const kind of ['nl', 'cmd'] as const) {
      const perTurn = { agent: { session: makePerTurnSession(kind) } };
      expect(guard(makeExec('bash', perTurn)), kind).toBeUndefined();
    }
  });

  it('lenient: still blocks on the sticky projection (the hard boundary)', () => {
    const guard = makeGuard('on', { enforcement: 'lenient' });
    expect(guard(makeExec('bash', { agent: mainAgent }))).toContain('BLOCKED');
    expect(guard(makeExec('read', { agent: mainAgent }))).toBeUndefined();
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
});
