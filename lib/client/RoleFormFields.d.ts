/**
 * Shared form fields component for Role Template (used in both Add and Edit modes).
 * Renders 8 fields: id, displayName, description, persona, provider, model, reasoningEffort, toolFilter.
 * Handles provider -> model cascading logic.
 */
import type { DirectorAllowedRoute } from '../bridge-contract.js';
import type { SubagentDirectorKey } from './locales.js';
import type { RoleDraft } from './store-logic.js';
export interface RoleFormFieldsProps {
    /** Persisted or draft role id. */
    id: string;
    /** Callback when role id changes. */
    onIdChange: (id: string) => void;
    /** Optional id validation error message. */
    idError?: string;
    /** Role draft containing all other fields. */
    draft: RoleDraft;
    /** Callback when draft fields change. */
    onDraftChange: (draft: RoleDraft) => void;
    /** Authorized routes (the only selectable provider/model pairs). */
    routes: readonly DirectorAllowedRoute[];
    /** Distinct model-visible tool names. */
    tools: readonly string[];
    /** Section copy. */
    t: (key: SubagentDirectorKey) => string;
    /** Whether the form inputs are disabled. */
    disabled?: boolean;
    /** Whether the role id field is specifically disabled. */
    idDisabled?: boolean;
    /** Whether this role is the default role (Main Agent). */
    isDefault?: boolean;
}
/**
 * Pure cascading helper: updates provider and resets model if not supported by the new provider.
 */
export declare function cascadeProviderChange(draft: RoleDraft, newProvider: string, routes: readonly DirectorAllowedRoute[]): RoleDraft;
export declare function RoleFormFields({ id, onIdChange, idError, draft, onDraftChange, routes, tools, t, disabled, idDisabled, isDefault, }: RoleFormFieldsProps): JSX.Element;
//# sourceMappingURL=RoleFormFields.d.ts.map