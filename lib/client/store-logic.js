/** Path of the roles map from the section root. */
export const ROLES_PATH = ['roles'];
/** Normalize an optional string: blank/whitespace becomes undefined (removed). */
export function optional(value) {
    if (value === undefined)
        return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
}
/** Blank/whitespace-only check used to decide "clear to undefined". */
export function isBlank(value) {
    return value === undefined || value === null || value.trim().length === 0;
}
/** Kebab-case role ids (mirrors the Host validator in src/settings.ts). */
export const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Generate a kebab-case id from a display name; falls back to a prefix + counter. */
export function roleIdFromName(name, existing, prefix = 'role') {
    const base = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const candidate = base.length > 0 ? base : prefix;
    if (!existing.has(candidate))
        return candidate;
    for (let i = 2; i < 1000; i++) {
        if (!existing.has(candidate + '-' + i))
            return candidate + '-' + i;
    }
    return candidate + '-' + Date.now().toString(36);
}
/**
 * Build the path ops that create or fully replace one role. A single set at the
 * role's root writes every field at once (mutate resolves against the stored
 * section, so intermediate objects materialize).
 */
export function addRoleOps(id, role) {
    return [
        {
            op: 'set',
            path: [ROLES_PATH[0], id],
            value: {
                displayName: role.displayName,
                description: role.description,
                ...optional(role.persona) !== undefined ? { persona: optional(role.persona) } : {},
                ...optional(role.provider) !== undefined ? { provider: optional(role.provider) } : {},
                ...optional(role.model) !== undefined ? { model: optional(role.model) } : {},
                ...optional(role.reasoningEffort) !== undefined ? { reasoningEffort: optional(role.reasoningEffort) } : {},
                ...(role.toolFilter?.allow?.length ?? 0) > 0 ? { toolFilter: { allow: role.toolFilter.allow, deny: [] } } : {}
            }
        }
    ];
}
/** Field-by-field set-edits when a value changed from the stored role; unset when cleared. */
function fieldEdit(path, stored, next) {
    const store = typeof stored === 'string' ? stored : undefined;
    const normalized = optional(next);
    if (normalized === store)
        return undefined;
    if (normalized === undefined)
        return { op: 'unset', path: [...path] };
    return { op: 'set', path: [...path], value: normalized };
}
/**
 * Diff the tool-set (allow list) between the stored role and the edited draft.
 * The editor manages only `allow`; an existing `deny` is preserved on set and
 * the whole filter is removed when the allow list is cleared. An empty allow
 * list means "inherit the parent's full tool set" (issue #2 semantics).
 * @param base - the role's field path (e.g. ['roles', id]).
 */
export function toolFilterOps(base, before, draft) {
    const storedAllow = before?.toolFilter?.allow ?? [];
    const nextAllow = draft.toolFilter?.allow ?? [];
    const storedDeny = before?.toolFilter?.deny;
    const same = storedAllow.length === nextAllow.length &&
        storedAllow.every((name, i) => name === nextAllow[i]);
    if (same)
        return undefined;
    if (nextAllow.length === 0) {
        return { op: 'unset', path: [...base, 'toolFilter'] };
    }
    return {
        op: 'set',
        path: [...base, 'toolFilter'],
        value: { allow: [...nextAllow], ...(storedDeny !== undefined ? { deny: storedDeny } : {}) },
    };
}
/**
 * Diff one role between its stored value and the edited draft. Only changed
 * fields become ops; clearing a field becomes an unset that restores the
 * composition base / removes the user override.
 */
export function updateRoleOps(id, before, draft) {
    const b = before ?? {};
    const ops = [];
    const push = (op) => { if (op)
        ops.push(op); };
    const base = [ROLES_PATH[0], id];
    push(fieldEdit([...base, 'displayName'], b.displayName, draft.displayName));
    push(fieldEdit([...base, 'description'], b.description, draft.description));
    push(fieldEdit([...base, 'persona'], b.persona, draft.persona));
    push(fieldEdit([...base, 'provider'], b.provider, draft.provider));
    push(fieldEdit([...base, 'model'], b.model, draft.model));
    push(fieldEdit([...base, 'reasoningEffort'], b.reasoningEffort, draft.reasoningEffort));
    push(toolFilterOps(base, before, draft));
    return ops;
}
/**
 * Ops to remove one role. When it was the defaultRole, the reference is cleared
 * too so a stale default never points at a removed role.
 */
export function removeRoleOps(id, current) {
    const ops = [{ op: 'unset', path: [ROLES_PATH[0], id] }];
    if (current.defaultRole === id)
        ops.push({ op: 'unset', path: ['defaultRole'] });
    return ops;
}
/** Ops to promote one role to the default. */
export function setDefaultRoleOps(id) {
    return [{ op: 'set', path: ['defaultRole'], value: id }];
}
export function defaultModelOps(before, edits) {
    const ops = [];
    const push = (op) => { if (op)
        ops.push(op); };
    push(fieldEdit(['defaultProvider'], before.defaultProvider, edits.provider));
    push(fieldEdit(['defaultModel'], before.defaultModel, edits.model));
    push(fieldEdit(['defaultReasoningEffort'], before.defaultReasoningEffort, edits.reasoningEffort));
    return ops;
}
/** Ops to clear every default-model field and the defaultRole back to composition defaults. */
export function restoreDefaultsOps(current) {
    const ops = [];
    if (current.defaultProvider !== undefined)
        ops.push({ op: 'unset', path: ['defaultProvider'] });
    if (current.defaultModel !== undefined)
        ops.push({ op: 'unset', path: ['defaultModel'] });
    if (current.defaultReasoningEffort !== undefined)
        ops.push({ op: 'unset', path: ['defaultReasoningEffort'] });
    if (current.defaultRole !== undefined)
        ops.push({ op: 'unset', path: ['defaultRole'] });
    return ops;
}
/** Ops to set the orchestrate enforcement level ('strict' | 'lenient'). */
export function enforcementOps(before, next) {
    if (before.orchestrateEnforcement === next)
        return [];
    return [{ op: 'set', path: ['orchestrateEnforcement'], value: next }];
}
/** Whether a section's defaultRole references a role that currently exists. */
export function defaultRoleValid(section) {
    const role = section.defaultRole;
    return role === undefined || (section.roles?.[role] !== undefined);
}
/** Map an RPC error code to a UI outcome; unknown/undefined errors are fatal. */
export function classifyMutateError(code, _message) {
    if (code === 'settings-conflict')
        return 'conflict';
    if (code === 'settings-rejected' || code === 'schema-validation')
        return 'rejected';
    return 'fatal';
}
/** Advance after a successful write. */
export function advanceRevision(state, serverRevision) {
    return { revision: serverRevision, conflicted: false };
}
/** Mark a conflict: keep the stale revision (the editor must reload). */
export function markConflict(state) {
    return { revision: state.revision, conflicted: true };
}
/** Rebase after a reload picked up the fresh namespace. */
export function adoptRevision(_state, freshRevision) {
    return { revision: freshRevision, conflicted: false };
}
//# sourceMappingURL=store-logic.js.map