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

import { SettingsSchema, resolveEnforcementLevel, deriveSwitchesFromEnforcement, resolveLayeredEnforcement } from '../src/settings.js';
import { Config } from '../src/config.js';
import { createOrchestrateToolGuard, ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS, type OrchestrateGuardDeps } from '../src/orchestrate-guard.js';
import { enforcementOps, interceptSwitchesOps, type StoredSection } from '../src/client/store-logic.js';
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

describe('index mount & Config schema — YAML switches pass-through and resolution priority', () => {

  it('Config schema does not auto-fill orchestrateEnforcement, preserving raw YAML switches', () => {
    const parsedEmpty = Config({});
    expect(parsedEmpty.orchestrateEnforcement).toBeUndefined();
    expect(resolveEnforcementLevel(parsedEmpty)).toBe('strict');

    const parsedSwitchOff = Config({ orchestrateInterceptTools: false });
    expect(parsedSwitchOff.orchestrateEnforcement).toBeUndefined();
    expect(parsedSwitchOff.orchestrateInterceptTools).toBe(false);
    expect(resolveEnforcementLevel(parsedSwitchOff)).toBe('none');
  });

  it('orchestrateInterceptTools: true alone safely resolves to strict, never downgraded to lenient', () => {
    expect(resolveEnforcementLevel({ orchestrateInterceptTools: true })).toBe('strict');
    expect(resolveEnforcementLevel({ orchestrateInterceptTools: true, orchestrateRoundIntercept: undefined })).toBe('strict');
  });

  it('YAML orchestrateInterceptTools: false penetrates to mount enforcement', () => {
    expect(resolveLayeredEnforcement(Config({ orchestrateInterceptTools: false }), {})).toBe('none');
  });

  it('YAML orchestrateRoundIntercept: false penetrates to mount enforcement (lenient)', () => {
    expect(
      resolveLayeredEnforcement(
        Config({ orchestrateInterceptTools: true, orchestrateRoundIntercept: false }),
        {}
      )
    ).toBe('lenient');
  });

  it('user settings override YAML mount configuration', () => {
    // Mount is none via YAML switch, but user explicitly enabled strict in UI settings
    const userOverridesMount = resolveLayeredEnforcement(
      Config({ orchestrateInterceptTools: false }),
      { orchestrateInterceptTools: true, orchestrateRoundIntercept: true }
    );
    expect(userOverridesMount).toBe('strict');

    // Mount is default strict, but user turned off interception in UI settings
    const userDisablesMount = resolveLayeredEnforcement(
      Config({}),
      { orchestrateInterceptTools: false }
    );
    expect(userDisablesMount).toBe('none');

    // User switches to lenient in UI settings
    const userSetsLenient = resolveLayeredEnforcement(
      Config({}),
      { orchestrateInterceptTools: true, orchestrateRoundIntercept: false }
    );
    expect(userSetsLenient).toBe('lenient');
  });

  it('absent user setting falls back to mount enforcement from YAML', () => {
    const fallbackLenient = resolveLayeredEnforcement(Config({ orchestrateEnforcement: 'lenient' }), {});
    expect(fallbackLenient).toBe('lenient');

    const fallbackStrict = resolveLayeredEnforcement(Config({}), {});
    expect(fallbackStrict).toBe('strict');
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

  it('lenient does NOT block a write tool on per-turn orchestration', () => {
    const guard = makeGuard(() => 'lenient');
    expect(guard(makeExec('bash', 'on'))).toBeUndefined();
  });

  it('toggling enforcement level dynamically updates per-turn guard behavior', () => {
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

  it('none does NOT block write tools even under sticky or per-turn orchestration', () => {
    const noneGuardSticky = createOrchestrateToolGuard({
      getProjections: () => fakeProjections(true),
      toolName: 'subagent_role',
      readOnlyTools: ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS,
      getEnforcement: () => 'none',
      warn: () => {},
    });
    expect(noneGuardSticky(makeExec('bash'))).toBeUndefined();

    const noneGuardPerTurn = createOrchestrateToolGuard({
      getProjections: () => fakeProjections(false),
      toolName: 'subagent_role',
      readOnlyTools: ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS,
      getEnforcement: () => 'none',
      warn: () => {},
    });
    expect(noneGuardPerTurn(makeExec('bash', 'on'))).toBeUndefined();
  });
});

describe('resolveEnforcementLevel and deriveSwitchesFromEnforcement', () => {
  it('deriveSwitchesFromEnforcement maps all three enforcement levels symmetrically', () => {
    expect(deriveSwitchesFromEnforcement('strict')).toEqual({
      orchestrateInterceptTools: true,
      orchestrateRoundIntercept: true,
    });
    expect(deriveSwitchesFromEnforcement('lenient')).toEqual({
      orchestrateInterceptTools: true,
      orchestrateRoundIntercept: false,
    });
    expect(deriveSwitchesFromEnforcement('none')).toEqual({
      orchestrateInterceptTools: false,
      orchestrateRoundIntercept: false,
    });
  });

  it('resolveEnforcementLevel defaults to strict baseline when config is empty or missing', () => {
    expect(resolveEnforcementLevel()).toBe('strict');
    expect(resolveEnforcementLevel(null)).toBe('strict');
    expect(resolveEnforcementLevel({})).toBe('strict');
  });

  it('resolveEnforcementLevel prioritizes explicit orchestrateInterceptTools = false to none', () => {
    expect(resolveEnforcementLevel({ orchestrateInterceptTools: false })).toBe('none');
    expect(resolveEnforcementLevel({ orchestrateInterceptTools: false, orchestrateRoundIntercept: true })).toBe('none');
    expect(resolveEnforcementLevel({ orchestrateInterceptTools: false, orchestrateEnforcement: 'strict' })).toBe('none');
  });

  it('resolveEnforcementLevel resolves orchestrateRoundIntercept = true to strict', () => {
    expect(resolveEnforcementLevel({ orchestrateInterceptTools: true, orchestrateRoundIntercept: true })).toBe('strict');
    expect(resolveEnforcementLevel({ orchestrateRoundIntercept: true })).toBe('strict');
  });

  it('resolveEnforcementLevel preserves backwards compatibility with orchestrateEnforcement', () => {
    expect(resolveEnforcementLevel({ orchestrateEnforcement: 'strict' })).toBe('strict');
    expect(resolveEnforcementLevel({ orchestrateEnforcement: 'lenient' })).toBe('lenient');
    expect(resolveEnforcementLevel({ orchestrateEnforcement: 'none' })).toBe('none');
  });

  it('resolveEnforcementLevel handles SettingsSchema parsed output correctly', () => {
    const fromEmpty = SettingsSchema({});
    expect(fromEmpty.orchestrateInterceptTools).toBeUndefined();
    expect(fromEmpty.orchestrateRoundIntercept).toBeUndefined();
    expect(resolveEnforcementLevel(fromEmpty)).toBe('strict');

    const fromExplicitLenient = SettingsSchema({ orchestrateInterceptTools: true, orchestrateRoundIntercept: false });
    expect(resolveEnforcementLevel(fromExplicitLenient)).toBe('lenient');

    const fromLegacyStrict = SettingsSchema({ orchestrateEnforcement: 'strict' });
    expect(resolveEnforcementLevel(fromLegacyStrict)).toBe('strict');

    const fromLegacyLenient = SettingsSchema({ orchestrateEnforcement: 'lenient' });
    expect(resolveEnforcementLevel(fromLegacyLenient)).toBe('lenient');
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

describe('store-logic — interceptSwitchesOps', () => {
  it('updates master switch and syncs orchestrateEnforcement to none when disabled', () => {
    const before: StoredSection = {
      orchestrateInterceptTools: true,
      orchestrateRoundIntercept: true,
      orchestrateEnforcement: 'strict',
    };
    const ops = interceptSwitchesOps(before, { orchestrateInterceptTools: false });
    expect(ops).toContainEqual({ op: 'set', path: ['orchestrateInterceptTools'], value: false });
    expect(ops).toContainEqual({ op: 'set', path: ['orchestrateEnforcement'], value: 'none' });
  });

  it('updates cascade switch and syncs orchestrateEnforcement to strict when enabled', () => {
    const before: StoredSection = {
      orchestrateInterceptTools: true,
      orchestrateRoundIntercept: false,
      orchestrateEnforcement: 'lenient',
    };
    const ops = interceptSwitchesOps(before, { orchestrateRoundIntercept: true });
    expect(ops).toContainEqual({ op: 'set', path: ['orchestrateRoundIntercept'], value: true });
    expect(ops).toContainEqual({ op: 'set', path: ['orchestrateEnforcement'], value: 'strict' });
  });

  it('returns no ops when values are unchanged', () => {
    const before: StoredSection = {
      orchestrateInterceptTools: true,
      orchestrateRoundIntercept: false,
      orchestrateEnforcement: 'lenient',
    };
    const ops = interceptSwitchesOps(before, {
      orchestrateInterceptTools: true,
      orchestrateRoundIntercept: false,
    });
    expect(ops).toEqual([]);
  });

  it('does not corrupt unset round switch to false when writing a single field on empty config', () => {
    const before: StoredSection = {};
    const ops = interceptSwitchesOps(before, { orchestrateInterceptTools: true });
    // Under strict SSOT baseline, fallback for round intercept is true, NOT false
    const roundOp = ops.find((op) => op.path[0] === 'orchestrateRoundIntercept');
    expect(roundOp).toBeDefined();
    expect(roundOp?.value).toBe(true);
    expect(ops).toContainEqual({ op: 'set', path: ['orchestrateInterceptTools'], value: true });
    expect(ops).toContainEqual({ op: 'set', path: ['orchestrateEnforcement'], value: 'strict' });
    // Verify it never writes false for unset round intercept
    expect(ops).not.toContainEqual({ op: 'set', path: ['orchestrateRoundIntercept'], value: false });
  });

  it('preserves strict enforcement and does not tamper with intercept switch when enabling round intercept on empty config', () => {
    const before: StoredSection = {};
    const ops = interceptSwitchesOps(before, { orchestrateRoundIntercept: true });
    expect(ops).toContainEqual({ op: 'set', path: ['orchestrateRoundIntercept'], value: true });
    expect(ops).toContainEqual({ op: 'set', path: ['orchestrateInterceptTools'], value: true });
    expect(ops).toContainEqual({ op: 'set', path: ['orchestrateEnforcement'], value: 'strict' });
    expect(ops).not.toContainEqual({ op: 'set', path: ['orchestrateInterceptTools'], value: false });
  });

  it('correctly sets lenient enforcement when explicitly disabling round intercept on empty config', () => {
    const before: StoredSection = {};
    const ops = interceptSwitchesOps(before, { orchestrateRoundIntercept: false });
    expect(ops).toContainEqual({ op: 'set', path: ['orchestrateRoundIntercept'], value: false });
    expect(ops).toContainEqual({ op: 'set', path: ['orchestrateInterceptTools'], value: true });
    expect(ops).toContainEqual({ op: 'set', path: ['orchestrateEnforcement'], value: 'lenient' });
  });

  it('UI recovery from none state restores round intercept to baseline true or historical explicit value without silently degrading to lenient', () => {
    // Simulate section in none state (orchestrateInterceptTools: false)
    const sectionNone: StoredSection = {
      orchestrateInterceptTools: false,
      orchestrateEnforcement: 'none',
    };
    const effective = resolveEnforcementLevel(sectionNone);
    const switches = deriveSwitchesFromEnforcement(effective);
    expect(switches.orchestrateRoundIntercept).toBe(false);

    // If section has no explicit orchestrateRoundIntercept, toggle to true restores round to baseline true (strict)
    const restoredBaseline = sectionNone.orchestrateRoundIntercept ?? true;
    expect(restoredBaseline).toBe(true);
    const opsBaseline = interceptSwitchesOps(sectionNone, {
      orchestrateInterceptTools: true,
      orchestrateRoundIntercept: restoredBaseline,
    });
    expect(opsBaseline).toContainEqual({ op: 'set', path: ['orchestrateRoundIntercept'], value: true });
    expect(opsBaseline).toContainEqual({ op: 'set', path: ['orchestrateEnforcement'], value: 'strict' });

    // If section had historical explicit orchestrateRoundIntercept = false, restores to false (lenient)
    const sectionHistoricalLenient: StoredSection = {
      orchestrateInterceptTools: false,
      orchestrateRoundIntercept: false,
      orchestrateEnforcement: 'none',
    };
    const restoredHistorical = sectionHistoricalLenient.orchestrateRoundIntercept ?? true;
    expect(restoredHistorical).toBe(false);
    const opsHistorical = interceptSwitchesOps(sectionHistoricalLenient, {
      orchestrateInterceptTools: true,
      orchestrateRoundIntercept: restoredHistorical,
    });
    expect(opsHistorical).toContainEqual({ op: 'set', path: ['orchestrateInterceptTools'], value: true });
    expect(opsHistorical).toContainEqual({ op: 'set', path: ['orchestrateEnforcement'], value: 'lenient' });
    expect(opsHistorical).not.toContainEqual({ op: 'set', path: ['orchestrateEnforcement'], value: 'strict' });
  });

  it('regression: full lifecycle [开启(strict) -> 关闭(none) -> 再开启] 100% 保持 strict，不降级为 lenient', () => {
    // Helper to apply mutation ops to stored section
    function applyOps(state: StoredSection, ops: ReturnType<typeof interceptSwitchesOps>): StoredSection {
      const next = { ...state };
      for (const op of ops) {
        if (op.op === 'set') {
          (next as any)[op.path[0]] = op.value;
        } else if (op.op === 'unset') {
          delete (next as any)[op.path[0]];
        }
      }
      return next;
    }

    // Step 1: Initial state is strict
    let section: StoredSection = {
      orchestrateInterceptTools: true,
      orchestrateRoundIntercept: true,
      orchestrateEnforcement: 'strict',
    };
    expect(resolveEnforcementLevel(section)).toBe('strict');

    // Step 2: User turns off master switch (value = false).
    // In SubagentOptionsSection, only { orchestrateInterceptTools: false } is submitted.
    const offOps = interceptSwitchesOps(section, { orchestrateInterceptTools: false });
    // Must NOT poison orchestrateRoundIntercept by writing false
    expect(offOps).not.toContainEqual({ op: 'set', path: ['orchestrateRoundIntercept'], value: false });
    const roundOp = offOps.find((op) => op.path[0] === 'orchestrateRoundIntercept');
    expect(roundOp).toBeUndefined();

    // Apply off ops: master switch is false, orchestrateRoundIntercept is preserved as true!
    section = applyOps(section, offOps);
    expect(section.orchestrateInterceptTools).toBe(false);
    expect(section.orchestrateRoundIntercept).toBe(true);
    expect(section.orchestrateEnforcement).toBe('none');
    expect(resolveEnforcementLevel(section)).toBe('none');

    // Step 3: User re-enables master switch (value = true).
    // UI reads savedRoundIntercept (which is true) and submits { orchestrateInterceptTools: true, orchestrateRoundIntercept: true }
    const savedRound = section.orchestrateRoundIntercept ?? true;
    expect(savedRound).toBe(true);
    const onOps = interceptSwitchesOps(section, {
      orchestrateInterceptTools: true,
      orchestrateRoundIntercept: savedRound,
    });
    section = applyOps(section, onOps);

    // Assert: enforcement is strictly 'strict', NEVER degraded to 'lenient'!
    expect(section.orchestrateInterceptTools).toBe(true);
    expect(section.orchestrateRoundIntercept).toBe(true);
    expect(section.orchestrateEnforcement).toBe('strict');
    expect(resolveEnforcementLevel(section)).toBe('strict');
  });

  it('regression: closing master switch on empty config does not contaminate roundIntercept to false', () => {
    const sectionEmpty: StoredSection = {};
    expect(resolveEnforcementLevel(sectionEmpty)).toBe('strict');

    // User disables master switch on clean config
    const offOps = interceptSwitchesOps(sectionEmpty, { orchestrateInterceptTools: false });
    expect(offOps).toContainEqual({ op: 'set', path: ['orchestrateInterceptTools'], value: false });
    expect(offOps).toContainEqual({ op: 'set', path: ['orchestrateEnforcement'], value: 'none' });
    // Must NOT write roundIntercept: false
    expect(offOps).not.toContainEqual({ op: 'set', path: ['orchestrateRoundIntercept'], value: false });
    expect(offOps.some((op) => op.path[0] === 'orchestrateRoundIntercept')).toBe(false);
  });
});

describe('DirectorConfig & YAML switches penetration', () => {
  it('Config schema leaves optional switches unset, and resolveEnforcementLevel defaults to strict baseline', () => {
    const parsed = Config({});
    expect(parsed.orchestrateEnforcement).toBeUndefined();
    expect(parsed.orchestrateInterceptTools).toBeUndefined();
    expect(parsed.orchestrateRoundIntercept).toBeUndefined();
    expect(resolveEnforcementLevel(parsed)).toBe('strict');
  });

  it('orchestrateInterceptTools: false in YAML penetrates without being masked by auto-fill', () => {
    const parsed = Config({ orchestrateInterceptTools: false });
    expect(parsed.orchestrateEnforcement).toBeUndefined();
    expect(parsed.orchestrateInterceptTools).toBe(false);
    expect(resolveEnforcementLevel(parsed)).toBe('none');
  });

  it('orchestrateInterceptTools: false has highest priority even if legacy enforcement was strict', () => {
    const parsed = Config({ orchestrateInterceptTools: false, orchestrateEnforcement: 'strict' });
    expect(resolveEnforcementLevel(parsed)).toBe('none');
  });
});
