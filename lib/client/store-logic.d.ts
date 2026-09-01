/**
 * Pure settings-write logic for the Subagent Director client (no React, no wire
 * calls). Everything here is a function of its inputs so the revision state
 * machine, path-op construction, and conflict handling are unit-testable in a
 * plain node environment without a running host.
 *
 * The persisted section shape mirrors the Host schema (see src/settings.ts):
 *   {
 *     defaultProvider?, defaultModel?, defaultReasoningEffort?,
 *     defaultRole?, fallbackOnInvalid?,
 *     roles?: { [id]: { displayName, description, persona?, provider?,
 *                       model?, reasoningEffort?, toolFilter? } }
 *   }
 */
import type { SettingsPathOpView } from '@deepseek-ai/dsh-host-apiproxy/api';
import type { OrchestrateEnforcement } from '../orchestrate-guard.js';
export type { OrchestrateEnforcement } from '../orchestrate-guard.js';
/** One role as the user edits it in a card (empty string = "clear the field"). */
export interface RoleDraft {
    displayName: string;
    description: string;
    persona?: string;
    provider?: string;
    model?: string;
    reasoningEffort?: string;
    /** Tool scoping: the allow list the editor manages (deny is preserved, not edited). */
    toolFilter?: {
        allow?: string[];
        deny?: string[];
    };
}
/** A persisted role template. */
export interface StoredRole {
    displayName: string;
    description: string;
    persona?: string;
    provider?: string;
    model?: string;
    reasoningEffort?: string;
    toolFilter?: {
        allow?: string[];
        deny?: string[];
    };
}
/** The persisted user-layer section (fields optional). */
export interface StoredSection {
    defaultProvider?: string;
    defaultModel?: string;
    defaultReasoningEffort?: string;
    defaultRole?: string;
    fallbackOnInvalid?: boolean;
    roles?: Record<string, StoredRole>;
    /** Orchestrate-mode tool-level enforcement (user setting). Absent ⇒ mount default. */
    orchestrateEnforcement?: OrchestrateEnforcement;
}
/** Path of the roles map from the section root. */
export declare const ROLES_PATH: readonly ['roles'];
/** Normalize an optional string: blank/whitespace becomes undefined (removed). */
export declare function optional(value: string | undefined): string | undefined;
/** Blank/whitespace-only check used to decide "clear to undefined". */
export declare function isBlank(value: string | undefined | null): boolean;
/** Kebab-case role ids (mirrors the Host validator in src/settings.ts). */
export declare const KEBAB_CASE: RegExp;
/** Generate a kebab-case id from a display name; falls back to a prefix + counter. */
export declare function roleIdFromName(name: string, existing: ReadonlySet<string>, prefix?: string): string;
/**
 * Build the path ops that create or fully replace one role. A single set at the
 * role's root writes every field at once (mutate resolves against the stored
 * section, so intermediate objects materialize).
 */
export declare function addRoleOps(id: string, role: RoleDraft | StoredRole): SettingsPathOpView[];
/**
 * Diff the tool-set (allow list) between the stored role and the edited draft.
 * The editor manages only `allow`; an existing `deny` is preserved on set and
 * the whole filter is removed when the allow list is cleared. An empty allow
 * list means "inherit the parent's full tool set" (issue #2 semantics).
 * @param base - the role's field path (e.g. ['roles', id]).
 */
export declare function toolFilterOps(base: readonly string[], before: StoredRole | undefined, draft: RoleDraft): SettingsPathOpView | undefined;
/**
 * Diff one role between its stored value and the edited draft. Only changed
 * fields become ops; clearing a field becomes an unset that restores the
 * composition base / removes the user override.
 */
export declare function updateRoleOps(id: string, before: StoredRole | undefined, draft: RoleDraft): SettingsPathOpView[];
/**
 * Ops to remove one role. When it was the defaultRole, the reference is cleared
 * too so a stale default never points at a removed role.
 */
export declare function removeRoleOps(id: string, current: Pick<StoredSection, 'defaultRole'>): SettingsPathOpView[];
/** Ops to promote one role to the default. */
export declare function setDefaultRoleOps(id: string): SettingsPathOpView[];
/** Ops for the default-model row: each cleared field is unset, changed fields set. */
export interface DefaultModelEdits {
    provider?: string;
    model?: string;
    reasoningEffort?: string;
}
export declare function defaultModelOps(before: StoredSection, edits: DefaultModelEdits): SettingsPathOpView[];
/** Ops to clear every default-model field and the defaultRole back to composition defaults. */
export declare function restoreDefaultsOps(current: StoredSection): SettingsPathOpView[];
/** Ops to set the orchestrate enforcement level ('strict' | 'lenient'). */
export declare function enforcementOps(before: StoredSection, next: OrchestrateEnforcement): SettingsPathOpView[];
/** Whether a section's defaultRole references a role that currently exists. */
export declare function defaultRoleValid(section: StoredSection): boolean;
/** Classification of a settings.mutate failure for the UI's conflict handling. */
export type MutationErrorKind = 'conflict' | 'rejected' | 'fatal';
/** Map an RPC error code to a UI outcome; unknown/undefined errors are fatal. */
export declare function classifyMutateError(code: string | undefined, _message?: string): MutationErrorKind;
/**
 * The revision state machine: after a successful mutate the server returns the
 * next revision; after a conflict the editor must re-read (drop pending edits)
 * and start from the freshly described revision. Collapses cleanly to a pure
 * function for testing.
 */
export interface RevisionState {
    /** Revision the next write must carry as expectedRevision. */
    revision: number;
    /** True once a conflict was observed, so the store knows to reload. */
    conflicted: boolean;
}
/** Advance after a successful write. */
export declare function advanceRevision(state: RevisionState, serverRevision: number): RevisionState;
/** Mark a conflict: keep the stale revision (the editor must reload). */
export declare function markConflict(state: RevisionState): RevisionState;
/** Rebase after a reload picked up the fresh namespace. */
export declare function adoptRevision(_state: RevisionState, freshRevision: number): RevisionState;
//# sourceMappingURL=store-logic.d.ts.map