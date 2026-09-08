/**
 * Unit tests for the orchestrate prompt renderer (merged /orchestrate command).
 * Covers: dynamic role rendering from settings, the empty-roles notice, and
 * that the coordinator reference is generalized (never hard-codes a role id).
 */
import { describe, it, expect } from 'vitest';
import {
  renderOrchestratorRoles,
  renderOrchestratorPrompt,
  buildOrchestratorFrame,
  ORCHESTRATE_VALID_MODES,
  detectOrchestrateRequest,
  extractSessionEvents,
  detectPerTurnOrchestrate,
} from '../src/orchestrate.js';

const settings = {
  roles: {
    'dev-role': {
      displayName: '开发工程师',
      description: '实现功能代码',
      provider: 'opencode-go',
      model: 'mimo-v2.5',
    },
    'coord-role': {
      displayName: '项目协调者',
      description: '分解与协调任务',
      provider: 'opencode-go',
      model: 'mimo-v2.5',
    },
  },
};

describe('renderOrchestratorRoles', () => {
  it('tells the user to configure roles when none are set', () => {
    const text = renderOrchestratorRoles({}, 'subagent_role');
    expect(text).toContain('No Subagent Director roles are configured');
    expect(text).toContain('subagent-director.roles');
  });

  it('lists each configured role by id with its delegate line', () => {
    const text = renderOrchestratorRoles(settings, 'subagent_role');
    expect(text).toContain('subagent_role({ role: "dev-role", prompt: "..." })');
    expect(text).toContain('开发工程师');
    expect(text).toContain('项目协调者');
  });

  it('never hard-codes a specific coordinator role id', () => {
    const text = renderOrchestratorPrompt(settings, 'subagent_role');
    expect(text).not.toMatch(/\brole-3\b/);
    // Coordinator is referenced by display-name semantics, not a literal id.
    expect(text).toMatch(/协调|Orchestrator|Coordinator/);
  });
});

describe('renderOrchestratorPrompt', () => {
  it('uses the configured tool name, not a hard-coded one', () => {
    const text = renderOrchestratorPrompt(settings, 'my_role_tool');
    expect(text).toContain('my_role_tool({ role: "dev-role", prompt: "..." })');
    expect(text).not.toContain('subagent_role({ role: "dev-role"');
  });

  it('injects the empty-roles notice when settings have no roles', () => {
    const text = renderOrchestratorPrompt({}, 'subagent_role');
    expect(text).toContain('No Subagent Director roles are configured');
  });
});

describe('buildOrchestratorFrame', () => {
  it('substitutes the tool name into the framing', () => {
    expect(buildOrchestratorFrame('dispatch')).toContain('`dispatch` tool');
  });

  it('matches the guard policy: read-only tools and probing tools forbidden, pure orchestration enforced', () => {
    const text = buildOrchestratorFrame('dispatch');
    expect(text).toMatch(/NEVER read, probe, write, edit/);
    expect(text).toMatch(/delegate ALL exploration, research, investigation, and execution/);
    expect(text).toMatch(/ENFORCED at the tool level/);
  });

  it('names the subagent control tools and job_output the guard allow-lists (prompt ↔ enforcement parity)', () => {
    const text = buildOrchestratorFrame('dispatch');
    expect(text).toContain('list_agents');
    expect(text).toContain('send_message');
    expect(text).toContain('interrupt_agent');
    expect(text).toContain('job_output');
  });

  it('strict frame claims tool-level enforcement (the guard really blocks)', () => {
    const text = buildOrchestratorFrame('dispatch', 'strict');
    expect(text).toMatch(/ENFORCED at the tool level/);
  });

  it('lenient frame also claims tool-level enforcement (physical circuit breaker without exemption)', () => {
    const text = buildOrchestratorFrame('dispatch', 'lenient');
    expect(text).toMatch(/ENFORCED at the tool level/);
  });

  it('buildOrchestratorFrame defaults to strict', () => {
    expect(buildOrchestratorFrame('dispatch')).toMatch(/ENFORCED at the tool level:/);
  });

  it('renderOrchestratorPrompt threads the enforcement into the frame', () => {
    const prompt = renderOrchestratorPrompt(settings, 'subagent_role', 'lenient');
    expect(prompt).toMatch(/ENFORCED at the tool level:/);
    expect(prompt).toContain('subagent_role');
  });
});

describe('ORCHESTRATE_VALID_MODES', () => {
  it('accepts only on/off', () => {
    expect(ORCHESTRATE_VALID_MODES).toEqual(['on', 'off']);
  });
});

describe('detectOrchestrateRequest', () => {
  it('returns on for a bare /orchestrate at the start', () => {
    expect(detectOrchestrateRequest('/orchestrate')).toBe('on');
    expect(detectOrchestrateRequest('  /orchestrate')).toBe('on');
  });

  it('returns on for /orchestrate on (case-insensitive)', () => {
    expect(detectOrchestrateRequest('/orchestrate on')).toBe('on');
    expect(detectOrchestrateRequest('/orchestrate ON')).toBe('on');
  });

  it('returns off for /orchestrate off', () => {
    expect(detectOrchestrateRequest('/orchestrate off')).toBe('off');
  });

  it('returns on for /orchestrate with task text (the task is orchestrated)', () => {
    expect(detectOrchestrateRequest('/orchestrate 分析上周A股走势')).toBe('on');
    expect(detectOrchestrateRequest('/orchestrate maybe')).toBe('on');
  });

  it('returns on for 使用orchestrate模式 at the start', () => {
    expect(detectOrchestrateRequest('使用orchestrate模式帮我分析这个项目')).toBe('on');
    expect(detectOrchestrateRequest('请使用 orchestrate 模式分析')).toBe('on');
    expect(detectOrchestrateRequest('我想使用orchestrate模式')).toBe('on');
  });

  it('returns on for use orchestrate mode', () => {
    expect(detectOrchestrateRequest('use orchestrate mode to analyze this')).toBe('on');
  });

  it('returns undefined for questions about orchestrate mode', () => {
    expect(detectOrchestrateRequest('什么是orchestrate模式')).toBeUndefined();
    expect(detectOrchestrateRequest('帮我解释一下使用orchestrate模式的好处')).toBeUndefined();
    expect(detectOrchestrateRequest('请问使用orchestrate模式注意事项')).toBeUndefined();
    expect(detectOrchestrateRequest('请问使用orchestrate模式')).toBeUndefined();
    expect(detectOrchestrateRequest('使用orchestrate模式注意事项')).toBeUndefined();
  });

  it('returns undefined for unrelated text', () => {
    expect(detectOrchestrateRequest('帮我分析这个项目')).toBeUndefined();
  });
});

describe('extractSessionEvents', () => {
  it('extracts from snapshotEvents() on real DSH Session instance', () => {
    const realEvents = [{ type: 'turn/start', seq: 0 }];
    const session = {
      snapshotEvents: () => realEvents,
    };
    expect(extractSessionEvents(session)).toBe(realEvents);
  });

  it('prioritizes snapshotEvents() over events and log', () => {
    const snap = [{ type: 'snap', seq: 1 }];
    const evs = [{ type: 'events', seq: 2 }];
    const log = [{ type: 'log', seq: 3 }];
    const session = {
      snapshotEvents: () => snap,
      events: evs,
      log: log,
    };
    expect(extractSessionEvents(session)).toBe(snap);
  });

  it('falls back to events when snapshotEvents is not a function', () => {
    const evs = [{ type: 'events', seq: 2 }];
    const session = { events: evs };
    expect(extractSessionEvents(session)).toBe(evs);
  });

  it('falls back to log when snapshotEvents and events are missing', () => {
    const log = [{ type: 'log', seq: 3 }];
    const session = { log };
    expect(extractSessionEvents(session)).toBe(log);
  });

  it('falls back gracefully if snapshotEvents throws', () => {
    const evs = [{ type: 'events', seq: 2 }];
    const session = {
      snapshotEvents: () => {
        throw new Error('snapshot error');
      },
      events: evs,
    };
    expect(extractSessionEvents(session)).toBe(evs);
  });

  it('returns undefined for null, undefined, or non-object', () => {
    expect(extractSessionEvents(null)).toBeUndefined();
    expect(extractSessionEvents(undefined)).toBeUndefined();
    expect(extractSessionEvents('string')).toBeUndefined();
  });

  it('allows detectPerTurnOrchestrate on real DSH Session with only snapshotEvents()', () => {
    const realSession = {
      snapshotEvents: () => [
        { type: 'turn/start', seq: 0 },
        {
          type: 'user/message',
          seq: 1,
          data: { content: [{ type: 'text', text: '使用orchestrate模式帮我分析' }] },
        },
      ],
    };
    expect(detectPerTurnOrchestrate(realSession)).toBe('on');
  });
});
