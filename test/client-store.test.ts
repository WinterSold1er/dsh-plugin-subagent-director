/**
 * Unit tests for the pure settings-write logic of the Subagent Director client
 * (src/client/store-logic.ts). Everything here runs in a plain node env without
 * a host or React: path-op construction, the revision state machine, the
 * conflict → re-read decision, default-role switching, and the
 * clear-to-composition-default unset ops are all pure functions.
 */
import { describe, it, expect, vi } from 'vitest';
import { SubagentOptionsStore } from '../src/client/store.js';
import { SUBAGENT_DIRECTOR_RPC_CHANNEL, SUBAGENT_DIRECTOR_RPC_MUTATE } from '../src/bridge-contract.js';
import {
  addRoleOps,
  advanceRevision,
  adoptRevision,
  classifyMutateError,
  defaultModelOps,
  defaultRoleValid,
  markConflict,
  optional,
  removeRoleOps,
  renameRoleOps,
  resolveRoleId,
  restoreDefaultsOps,
  roleIdFromName,
  setDefaultRoleOps,
  toolFilterOps,
  updateRoleOps,
  validateRoleIdFormat,
  validateRoleIdUnique,
  validateRoleSubmission,
  type DefaultModelEdits,
  type RevisionState,
  type RoleDraft,
  type StoredRole,
  type StoredSection,
} from '../src/client/store-logic.js';

/** A fully-populated role draft. */
function draft(overrides: Partial<RoleDraft> = {}): RoleDraft {
  return {
    displayName: 'Code Reviewer',
    description: 'Reviews every diff for correctness.',
    persona: 'You are a careful reviewer.',
    provider: 'deepseek-official',
    model: 'deepseek-chat',
    reasoningEffort: 'high',
    ...overrides,
  };
}

describe('addRoleOps', () => {
  it('builds one set op at the role root carrying every non-blank field', () => {
    expect(addRoleOps('reviewer', draft())).toEqual([
      {
        op: 'set',
        path: ['roles', 'reviewer'],
        value: {
          displayName: 'Code Reviewer',
          description: 'Reviews every diff for correctness.',
          persona: 'You are a careful reviewer.',
          provider: 'deepseek-official',
          model: 'deepseek-chat',
          reasoningEffort: 'high',
        },
      },
    ]);
  });

  it('drops blank persona/provider/model/effort so the stored role has no empty strings', () => {
    const ops = addRoleOps('writer', {
      displayName: 'Writer',
      description: 'Writes prose',
      persona: '   ',
      provider: '',
      model: '  ',
      reasoningEffort: undefined,
    });
    expect(ops).toEqual([
      {
        op: 'set',
        path: ['roles', 'writer'],
        value: { displayName: 'Writer', description: 'Writes prose' },
      },
    ]);
  });
});

describe('optional', () => {
  it('normalizes blank/whitespace to undefined and passes through real strings', () => {
    expect(optional(undefined)).toBeUndefined();
    expect(optional('   ')).toBeUndefined();
    expect(optional('')).toBeUndefined();
    expect(optional('deepseek-chat')).toBe('deepseek-chat');
    expect(optional('  ai ')).toBe('ai');
  });
});

describe('updateRoleOps', () => {
  const stored: StoredRole = {
    displayName: 'Coder',
    description: 'Write code',
    persona: 'You are a coder.',
    provider: 'deepseek-official',
    model: 'deepseek-chat',
    reasoningEffort: 'low',
  };

  it('emits no ops when the draft is unchanged from the stored role', () => {
    expect(updateRoleOps('coder', stored, stored)).toEqual([]);
  });

  it('turns a changed field into a set op at the field path', () => {
    const ops = updateRoleOps('coder', stored, { ...stored, model: 'deepseek-reasoner' });
    expect(ops).toContainEqual({
      op: 'set',
      path: ['roles', 'coder', 'model'],
      value: 'deepseek-reasoner',
    });
  });

  it('turns a cleared field into an unset op (restore composition default)', () => {
    const ops = updateRoleOps('coder', stored, { ...stored, persona: '' });
    expect(ops).toContainEqual({ op: 'unset', path: ['roles', 'coder', 'persona'] });
    // the unchanged fields must not produce ops
    expect(ops).not.toContainEqual({ op: 'set', path: ['roles', 'coder', 'displayName'], value: 'Coder' });
  });

  it('handles a previously-absent role (before undefined) by treating it as empty', () => {
    const ops = updateRoleOps('fresh', undefined, draft({ model: '' }));
    expect(ops).toContainEqual({ op: 'set', path: ['roles', 'fresh', 'displayName'], value: 'Code Reviewer' });
    // a blank model equals the absent stored model, so it is simply left out (no op)
    expect(ops).not.toContainEqual(expect.objectContaining({ path: ['roles', 'fresh', 'model'] }));
  });
});

describe('removeRoleOps', () => {
  it('unstets the role and, when it was default, also clears defaultRole', () => {
    expect(removeRoleOps('coder', { defaultRole: 'coder' })).toEqual([
      { op: 'unset', path: ['roles', 'coder'] },
      { op: 'unset', path: ['defaultRole'] },
    ]);
  });

  it('only unstets the role when it was not the default', () => {
    expect(removeRoleOps('writer', { defaultRole: 'coder' })).toEqual([
      { op: 'unset', path: ['roles', 'writer'] },
    ]);
  });
});

describe('setDefaultRoleOps', () => {
  it('sets defaultRole to the promoted id', () => {
    expect(setDefaultRoleOps('reviewer')).toEqual([
      { op: 'set', path: ['defaultRole'], value: 'reviewer' },
    ]);
  });
});

describe('defaultModelOps', () => {
  it('sets changed fields and unsets cleared fields against the stored section', () => {
    const before: StoredSection = {
      defaultProvider: 'deepseek-official',
      defaultModel: 'deepseek-chat',
      defaultReasoningEffort: 'low',
    };
    const edits: DefaultModelEdits = {
      provider: 'opencode-go',
      model: undefined, // cleared
      reasoningEffort: 'high',
    };
    expect(defaultModelOps(before, edits)).toEqual([
      { op: 'set', path: ['defaultProvider'], value: 'opencode-go' },
      { op: 'unset', path: ['defaultModel'] },
      { op: 'set', path: ['defaultReasoningEffort'], value: 'high' },
    ]);
  });

  it('emits no ops when nothing changed', () => {
    const before: StoredSection = { defaultProvider: 'x', defaultModel: 'y' };
    expect(defaultModelOps(before, { provider: 'x', model: 'y', reasoningEffort: undefined })).toEqual([]);
  });
});

describe('restoreDefaultsOps', () => {
  it('unsets every default field currently present (and leaves absent ones alone)', () => {
    expect(
      restoreDefaultsOps({
        defaultProvider: 'a',
        defaultModel: 'b',
        defaultReasoningEffort: 'c',
        defaultRole: 'd',
      }),
    ).toEqual([
      { op: 'unset', path: ['defaultProvider'] },
      { op: 'unset', path: ['defaultModel'] },
      { op: 'unset', path: ['defaultReasoningEffort'] },
      { op: 'unset', path: ['defaultRole'] },
    ]);
  });

  it('returns an empty op list when nothing is set', () => {
    expect(restoreDefaultsOps({})).toEqual([]);
  });
});

describe('defaultRoleValid', () => {
  it('is true when unset or when the referenced role exists', () => {
    expect(defaultRoleValid({})).toBe(true);
    expect(defaultRoleValid({ defaultRole: 'coder', roles: { coder: draft() } })).toBe(true);
  });

  it('is false when defaultRole points at a missing role', () => {
    expect(defaultRoleValid({ defaultRole: 'ghost', roles: { coder: draft() } })).toBe(false);
  });
});

describe('roleIdFromName', () => {
  it('kebab-cases a display name and dedupes with a numeric suffix', () => {
    expect(roleIdFromName('My Code Reviewer!', new Set())).toBe('my-code-reviewer');
    expect(roleIdFromName('my-code-reviewer', new Set(['my-code-reviewer']))).toBe('my-code-reviewer-2');
  });

  it('falls back to the prefix when a name produces no characters', () => {
    expect(roleIdFromName('!!!', new Set())).toBe('role');
  });
});

describe('validateRoleIdFormat', () => {
  it('accepts valid kebab-case strings', () => {
    expect(validateRoleIdFormat('coder')).toBe(true);
    expect(validateRoleIdFormat('code-reviewer')).toBe(true);
    expect(validateRoleIdFormat('qa-agent-1')).toBe(true);
    expect(validateRoleIdFormat('role-42-sub')).toBe(true);
  });

  it('rejects invalid kebab-case strings', () => {
    expect(validateRoleIdFormat('')).toBe(false);
    expect(validateRoleIdFormat('Coder')).toBe(false);
    expect(validateRoleIdFormat('code_reviewer')).toBe(false);
    expect(validateRoleIdFormat('code reviewer')).toBe(false);
    expect(validateRoleIdFormat('-coder')).toBe(false);
    expect(validateRoleIdFormat('coder-')).toBe(false);
    expect(validateRoleIdFormat('code--reviewer')).toBe(false);
    expect(validateRoleIdFormat('code@reviewer')).toBe(false);
    expect(validateRoleIdFormat('   ')).toBe(false);
  });
});

describe('validateRoleIdUnique', () => {
  const existing = new Set(['coder', 'reviewer', 'architect']);

  it('returns true if ID is not in existing set', () => {
    expect(validateRoleIdUnique('qa', existing)).toBe(true);
    expect(validateRoleIdUnique('tester', existing)).toBe(true);
  });

  it('returns false if ID is in existing set and currentId is not provided', () => {
    expect(validateRoleIdUnique('coder', existing)).toBe(false);
    expect(validateRoleIdUnique('reviewer', existing)).toBe(false);
  });

  it('returns true if ID matches currentId (editing same role)', () => {
    expect(validateRoleIdUnique('coder', existing, 'coder')).toBe(true);
  });

  it('returns false if ID is in existing set and matches another role', () => {
    expect(validateRoleIdUnique('reviewer', existing, 'coder')).toBe(false);
  });
});

describe('validateRoleSubmission', () => {
  const existing = new Set(['coder', 'reviewer']);

  it('auto-derives kebab-case ID from displayName when idInput is empty in add mode', () => {
    const res = validateRoleSubmission('', 'Senior Tester', existing);
    expect(res).toEqual({ ok: true, id: 'senior-tester' });
  });

  it('accepts valid custom ID when unique', () => {
    const res = validateRoleSubmission('qa-lead', 'Senior Tester', existing);
    expect(res).toEqual({ ok: true, id: 'qa-lead' });
  });

  it('rejects invalid ID format', () => {
    const res = validateRoleSubmission('Invalid_ID', 'Senior Tester', existing);
    expect(res).toEqual({ ok: false, errorKey: 'invalidRoleId' });
  });

  it('rejects duplicate ID when already taken by another role', () => {
    const res = validateRoleSubmission('reviewer', 'Senior Tester', existing);
    expect(res).toEqual({ ok: false, errorKey: 'duplicateRoleId' });
  });

  it('allows same ID in edit mode when matching currentId', () => {
    const res = validateRoleSubmission('coder', 'Updated Coder', existing, 'coder');
    expect(res).toEqual({ ok: true, id: 'coder' });
  });

  it('rejects duplicate ID in edit mode when matching another existing role', () => {
    const res = validateRoleSubmission('reviewer', 'Updated Coder', existing, 'coder');
    expect(res).toEqual({ ok: false, errorKey: 'duplicateRoleId' });
  });

  it('rejects empty ID in edit mode instead of falling back to currentId', () => {
    const resEmpty = validateRoleSubmission('', 'Updated Coder', existing, 'coder');
    expect(resEmpty).toEqual({ ok: false, errorKey: 'invalidRoleId' });

    const resWhitespace = validateRoleSubmission('   ', 'Updated Coder', existing, 'coder');
    expect(resWhitespace).toEqual({ ok: false, errorKey: 'invalidRoleId' });
  });

  it('rejects empty or whitespace-only displayName', () => {
    const resEmpty = validateRoleSubmission('coder', '', existing);
    expect(resEmpty).toEqual({ ok: false, errorKey: 'requiredDisplayName' });

    const resWhitespace = validateRoleSubmission('coder', '   ', existing);
    expect(resWhitespace).toEqual({ ok: false, errorKey: 'requiredDisplayName' });
  });

  it('rejects empty or whitespace-only description when provided', () => {
    const resEmpty = validateRoleSubmission('coder', 'Coder', existing, undefined, '');
    expect(resEmpty).toEqual({ ok: false, errorKey: 'requiredDescription' });

    const resWhitespace = validateRoleSubmission('coder', 'Coder', existing, undefined, '   ');
    expect(resWhitespace).toEqual({ ok: false, errorKey: 'requiredDescription' });
  });
});

describe('resolveRoleId', () => {
  it('returns trimmed customId when non-empty', () => {
    expect(resolveRoleId('my-custom-id', 'Any Name', new Set())).toBe('my-custom-id');
    expect(resolveRoleId('  custom-id  ', 'Any Name', new Set())).toBe('custom-id');
  });

  it('falls back to roleIdFromName when customId is undefined or whitespace', () => {
    expect(resolveRoleId(undefined, 'Code Reviewer', new Set())).toBe('code-reviewer');
    expect(resolveRoleId('', 'Code Reviewer', new Set())).toBe('code-reviewer');
    expect(resolveRoleId('   ', 'Code Reviewer', new Set())).toBe('code-reviewer');
  });
});

describe('renameRoleOps', () => {
  const stored: StoredRole = {
    displayName: 'Old Coder',
    description: 'Writes code',
    persona: 'You code',
    provider: 'deepseek-official',
    model: 'deepseek-chat',
    reasoningEffort: 'low',
    toolFilter: { allow: ['bash'], deny: ['eval'] },
  };

  it('delegates to updateRoleOps when oldId === newId', () => {
    const updatedDraft: RoleDraft = {
      ...stored,
      displayName: 'New Coder',
    };
    const ops = renameRoleOps('coder', 'coder', stored, updatedDraft);
    expect(ops).toEqual(updateRoleOps('coder', stored, updatedDraft));
  });

  it('generates atomic unset, set, and preserves defaultRole when defaultRole matches oldId', () => {
    const newDraft: RoleDraft = {
      displayName: 'Senior Coder',
      description: 'Writes senior code',
      persona: 'You code expertly',
      provider: 'deepseek-official',
      model: 'deepseek-reasoner',
      reasoningEffort: 'high',
      toolFilter: { allow: ['bash', 'read'] },
    };

    const ops = renameRoleOps('coder', 'senior-coder', stored, newDraft, 'coder');
    expect(ops).toEqual([
      { op: 'unset', path: ['roles', 'coder'] },
      {
        op: 'set',
        path: ['roles', 'senior-coder'],
        value: {
          displayName: 'Senior Coder',
          description: 'Writes senior code',
          persona: 'You code expertly',
          provider: 'deepseek-official',
          model: 'deepseek-reasoner',
          reasoningEffort: 'high',
          toolFilter: { allow: ['bash', 'read'], deny: ['eval'] },
        },
      },
      { op: 'set', path: ['defaultRole'], value: 'senior-coder' },
    ]);
  });

  it('does not emit defaultRole op when defaultRole does not match oldId', () => {
    const newDraft: RoleDraft = {
      displayName: 'Senior Coder',
      description: 'Writes senior code',
    };
    const storedNoDeny: StoredRole = {
      displayName: 'Old Coder',
      description: 'Writes code',
    };
    const ops = renameRoleOps('coder', 'senior-coder', storedNoDeny, newDraft, 'reviewer');
    expect(ops).toEqual([
      { op: 'unset', path: ['roles', 'coder'] },
      {
        op: 'set',
        path: ['roles', 'senior-coder'],
        value: {
          displayName: 'Senior Coder',
          description: 'Writes senior code',
        },
      },
    ]);
  });

  it('preserves unknown/extra fields present on the before role', () => {
    const storedWithCustom = {
      ...stored,
      customAnnotation: 'important',
      arbitraryMeta: { version: 1 },
    } as StoredRole;
    const newDraft: RoleDraft = {
      displayName: 'Senior Coder',
      description: 'Writes senior code',
    };
    const ops = renameRoleOps('coder', 'senior-coder', storedWithCustom, newDraft);
    expect(ops[1]).toMatchObject({
      op: 'set',
      path: ['roles', 'senior-coder'],
    });
    const val = (ops[1] as any).value;
    expect(val.customAnnotation).toBe('important');
    expect(val.arbitraryMeta).toEqual({ version: 1 });
  });

  it('preserves before.toolFilter.deny when draft.toolFilter.allow is empty or omitted', () => {
    const draftEmptyAllow: RoleDraft = {
      displayName: 'Senior Coder',
      description: 'Writes senior code',
      toolFilter: { allow: [] },
    };
    const ops = renameRoleOps('coder', 'senior-coder', stored, draftEmptyAllow);
    const val = (ops[1] as any).value;
    expect(val.toolFilter).toEqual({ deny: ['eval'] });
  });

  it('does not force { deny: [] } when before has no deny list', () => {
    const storedNoDeny: StoredRole = {
      displayName: 'Old Coder',
      description: 'Writes code',
      toolFilter: { allow: ['bash'] },
    };
    const draftWithAllow: RoleDraft = {
      displayName: 'New Coder',
      description: 'Writes code',
      toolFilter: { allow: ['read'] },
    };
    const ops = renameRoleOps('coder', 'senior-coder', storedNoDeny, draftWithAllow);
    const val = (ops[1] as any).value;
    expect(val.toolFilter).toEqual({ allow: ['read'] });
    expect(val.toolFilter.deny).toBeUndefined();
  });
});

describe('classifyMutateError', () => {
  it('maps settings-conflict to conflict and schema validation to rejected', () => {
    expect(classifyMutateError('settings-conflict')).toBe('conflict');
    expect(classifyMutateError('schema-validation')).toBe('rejected');
    expect(classifyMutateError('settings-rejected')).toBe('rejected');
  });

  it('treats unknown/undefined codes as fatal so the UI can fall back to server text', () => {
    expect(classifyMutateError('nope')).toBe('fatal');
    expect(classifyMutateError(undefined)).toBe('fatal');
  });
});

describe('SubagentOptionsStore.renameRole', () => {
  it('invokes mutate with renameRoleOps including defaultRole migration', async () => {
    const fakeRpc = {
      call: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          revision: 2,
          value: {
            roles: {
              'new-coder': { displayName: 'New Coder', description: 'Desc' },
            },
            defaultRole: 'new-coder',
          },
        },
      }),
    };
    const store = new SubagentOptionsStore({
      rpc: fakeRpc as never,
      t: (k) => k,
    });
    store.store.update((s) => {
      s.revision = 1;
      s.section = {
        roles: {
          coder: { displayName: 'Old Coder', description: 'Desc' },
        },
        defaultRole: 'coder',
      };
    });

    const err = await (store as any).renameRole(
      'coder',
      'new-coder',
      { displayName: 'Old Coder', description: 'Desc' },
      { displayName: 'New Coder', description: 'Desc' },
    );
    expect(err).toBeUndefined();
    expect(fakeRpc.call).toHaveBeenCalledWith(
      SUBAGENT_DIRECTOR_RPC_CHANNEL,
      SUBAGENT_DIRECTOR_RPC_MUTATE,
      {
        ns: 'subagent-director',
        expectedRevision: 1,
        ops: [
          { op: 'unset', path: ['roles', 'coder'] },
          {
            op: 'set',
            path: ['roles', 'new-coder'],
            value: { displayName: 'New Coder', description: 'Desc' },
          },
          { op: 'set', path: ['defaultRole'], value: 'new-coder' },
        ],
      },
    );
    expect(store.store.getSnapshot().revision).toBe(2);
    expect(store.store.getSnapshot().section?.defaultRole).toBe('new-coder');
  });
});

describe('revision state machine', () => {
  const idle: RevisionState = { revision: 3, conflicted: false };

  it('advanceRevision adopts the server revision and clears the conflict flag', () => {
    expect(advanceRevision(idle, 5)).toEqual({ revision: 5, conflicted: false });
  });

  it('markConflict keeps the stale revision and flags conflicted so the editor must reload', () => {
    expect(markConflict({ revision: 3, conflicted: false })).toEqual({ revision: 3, conflicted: true });
  });

  it('adoptRevision rebases to a freshly described revision', () => {
    expect(adoptRevision({ revision: 3, conflicted: true }, 9)).toEqual({ revision: 9, conflicted: false });
  });
});

describe('toolFilter ops（工具集行）', () => {
  const base = ['roles', 'coder'] as const;

  it('addRoleOps writes toolFilter only when the allow list is non-empty', () => {
    const withTools = addRoleOps('coder', { ...draft(), toolFilter: { allow: ['bash', 'read'] } });
    expect(withTools[0].value).toMatchObject({
      toolFilter: { allow: ['bash', 'read'], deny: [] },
    });
    const withoutTools = addRoleOps('coder', draft());
    expect((withoutTools[0].value as Record<string, unknown>).toolFilter).toBeUndefined();
  });

  it('toolFilterOps emits no op when the allow list is unchanged', () => {
    const stored: StoredRole = { displayName: 'Coder', description: 'x', toolFilter: { allow: ['bash'] } };
    expect(toolFilterOps(base, stored, { ...stored, toolFilter: { allow: ['bash'] } })).toBeUndefined();
  });

  it('toolFilterOps unstets when the draft clears the filter entirely', () => {
    const stored: StoredRole = { displayName: 'Coder', description: 'x', toolFilter: { allow: ['bash'] } };
    expect(toolFilterOps(base, stored, { ...stored, toolFilter: undefined })).toEqual({
      op: 'unset',
      path: ['roles', 'coder', 'toolFilter'],
    });
  });

  it('toolFilterOps sets the filter when the allow list grows', () => {
    const stored: StoredRole = { displayName: 'Coder', description: 'x', toolFilter: { allow: ['bash'] } };
    const op = toolFilterOps(base, stored, { ...stored, toolFilter: { allow: ['bash', 'read'] } });
    expect(op).toEqual({
      op: 'set',
      path: ['roles', 'coder', 'toolFilter'],
      value: { allow: ['bash', 'read'] },
    });
  });

  it('toolFilterOps preserves an existing deny list on set', () => {
    const stored: StoredRole = {
      displayName: 'Coder',
      description: 'x',
      toolFilter: { allow: ['bash'], deny: ['kill'] },
    };
    const op = toolFilterOps(base, stored, { ...stored, toolFilter: { allow: ['bash', 'read'] } });
    expect(op).toEqual({
      op: 'set',
      path: ['roles', 'coder', 'toolFilter'],
      value: { allow: ['bash', 'read'], deny: ['kill'] },
    });
  });

  it('toolFilterOps unstets the whole filter when the allow list is cleared', () => {
    const stored: StoredRole = { displayName: 'Coder', description: 'x', toolFilter: { allow: ['bash'] } };
    const op = toolFilterOps(base, stored, { ...stored, toolFilter: { allow: [] } });
    expect(op).toEqual({ op: 'unset', path: ['roles', 'coder', 'toolFilter'] });
  });

  it('updateRoleOps folds the toolFilter op in with the field edits', () => {
    const stored: StoredRole = { displayName: 'Coder', description: 'x' };
    const ops = updateRoleOps('coder', stored, { ...stored, toolFilter: { allow: ['bash'] } });
    expect(ops).toContainEqual({
      op: 'set',
      path: ['roles', 'coder', 'toolFilter'],
      value: { allow: ['bash'] },
    });
  });
});
