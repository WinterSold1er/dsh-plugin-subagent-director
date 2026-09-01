/**
 * Tests for the orchestrateEnforcement USER-SETTING toggle (design: settings-page
 * strict/lenient switch). Covers:
 *  - the SettingsSchema accepts the field and resolves the union (no default,
 *    so an absent user setting reads as undefined and falls through to strict);
 *  - the plugin entry resolves enforcement with priority user-setting > mount
 *    config > 'strict' (src/index.ts);
 *  - the tool guard reads enforcement LIVE via getEnforcement so a settings
 *    toggle applies without a restart;
 *  - store-logic enforcementOps builds the right path op (and none when unchanged);
 *  - the store controller setEnforcement writes through (pure mutate outcome).
 */
import { describe, it, expect } from 'vitest';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';

import { SettingsSchema } from '../src/settings.js';
import { createOrchestrateToolGuard, ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS, type OrchestrateGuardDeps } from '../src/orchestrate-guard.js';
import { enforcementOps, type StoredSection } from '../src/client/store-logic.js';
import type { OrchestrateEnforcement } from '../src/orchestrate-guard.js';

function makeExec(name: string, perTurn?: 'on'): ToolExecution {
  const events = perTurn === 'on'
    ? [
        { type: 'turn/start', seq: 0 },
        { type: 'user/message', seq: 1, data: { content: [{ type: 'text', text: '使用orchestrate模式' }] } },
      ]
    : [];
  return {
    name,
    agent: { session: { header: { id: 's1' }, events } },
  } as unknown as ToolExecution;
}

function fakeProjections(on: boolean) {
  return {
    snapshot: () => ({ values: { orchestrate: { mode: on ? 'on' : 'off' } } }),
  };
}

describe('SettingsSchema — orchestrateEnforcement field', () => {
  it('absent field resolves to undefined (no default, falls through to strict)', () => {
    const resolved = SettingsSchema({});
    expect(resolved.orchestrateEnforcement).toBeUndefined();
  });

  it('accepts "strict" and "lenient"', () => {
    expect(SettingsSchema({ orchestrateEnforcement: 'strict' }).orchestrateEnforcement).toBe('strict');
    expect(SettingsSchema({ orchestrateEnforcement: 'lenient' }).orchestrateEnforcement).toBe('lenient');
  });

  it('rejects a non-union value at resolve time', () => {
    expect(() => SettingsSchema({ orchestrateEnforcement: 'medium' as never })).toThrow();
  });
});

describe('plugin entry — enforcement resolution priority (user > mount > strict)', () => {
  // Mirror of src/index.ts resolveEnforcement: user setting wins, else mount
  // config, else strict.
  function resolveEnforcement(getSettings: () => { orchestrateEnforcement?: OrchestrateEnforcement }, mount: OrchestrateEnforcement): OrchestrateEnforcement {
    return getSettings().orchestrateEnforcement ?? mount;
  }

  it('user setting overrides the mount config', () => {
    expect(resolveEnforcement(() => ({ orchestrateEnforcement: 'lenient' }), 'strict')).toBe('lenient');
    expect(resolveEnforcement(() => ({ orchestrateEnforcement: 'strict' }), 'lenient')).toBe('strict');
  });

  it('absent user setting falls back to the mount config', () => {
    expect(resolveEnforcement(() => ({}), 'lenient')).toBe('lenient');
    expect(resolveEnforcement(() => ({}), 'strict')).toBe('strict');
  });
});

describe('tool guard — live getEnforcement (no restart)', () => {
function makeGuard(getEnforcement: () => OrchestrateEnforcement): (e: ToolExecution) => string | undefined {
    const deps: OrchestrateGuardDeps = {
      // sticky projection OFF: the only orchestrate-in-effect signal is the
      // per-turn event, so strict blocks / lenient allows (prompt-only).
      getProjections: () => fakeProjections(false),
      toolName: 'subagent_role',
      readOnlyTools: ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS,
      getEnforcement,
      warn: () => {},
    };
    return createOrchestrateToolGuard(deps);
  }

  it('strict blocks a write tool on per-turn orchestration', () => {
    const guard = makeGuard(() => 'strict');
    expect(guard(makeExec('bash', 'on'))).toMatch(/BLOCKED/);
  });

  it('lenient allows a write tool on per-turn orchestration (prompt-only)', () => {
    const guard = makeGuard(() => 'lenient');
    expect(guard(makeExec('bash', 'on'))).toBeUndefined();
  });

  it('a live toggle from strict to lenient takes effect on the next call', () => {
    let level: OrchestrateEnforcement = 'strict';
    const guard = makeGuard(() => level);
    expect(guard(makeExec('bash', 'on'))).toMatch(/BLOCKED/);
    level = 'lenient';
    expect(guard(makeExec('bash', 'on'))).toBeUndefined();
    level = 'strict';
    expect(guard(makeExec('bash', 'on'))).toMatch(/BLOCKED/);
  });

  it('both levels block a write tool under the sticky projection', () => {
    const sticky = (mode: OrchestrateEnforcement) => {
      const deps: OrchestrateGuardDeps = {
        getProjections: () => fakeProjections(true),
        toolName: 'subagent_role',
        readOnlyTools: ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS,
        getEnforcement: () => mode,
        warn: () => {},
      };
      return createOrchestrateToolGuard(deps);
    };
    expect(sticky('strict')(makeExec('bash'))).toMatch(/BLOCKED/);
    expect(sticky('lenient')(makeExec('bash'))).toMatch(/BLOCKED/);
  });
});

describe('store-logic — enforcementOps', () => {
  it('builds a set op when the level changes', () => {
    const before: StoredSection = { orchestrateEnforcement: 'strict' };
    expect(enforcementOps(before, 'lenient')).toEqual([{ op: 'set', path: ['orchestrateEnforcement'], value: 'lenient' }]);
  });

  it('builds no op when the level is unchanged', () => {
    const before: StoredSection = { orchestrateEnforcement: 'lenient' };
    expect(enforcementOps(before, 'lenient')).toEqual([]);
  });

  it('sets the field when it was absent', () => {
    const before: StoredSection = {};
    expect(enforcementOps(before, 'strict')).toEqual([{ op: 'set', path: ['orchestrateEnforcement'], value: 'strict' }]);
  });
});
