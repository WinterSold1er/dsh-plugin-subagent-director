import type { DirectorAllowedRoute } from '../bridge-contract.js';
import type { SubagentDirectorKey } from './locales.js';
import { type RoleDraft, type StoredRole } from './store-logic.js';
export interface RoleCardProps {
    /** Persisted role id (kebab-case). */
    id: string;
    /** Persisted role value. */
    role: StoredRole;
    /** Whether this role is the defaultRole (Main Agent). */
    isDefault: boolean;
    /** Authorized routes (the only selectable provider/model pairs). */
    routes: readonly DirectorAllowedRoute[];
    /** Distinct model-visible tool names (for the tool-set row). */
    tools: readonly string[];
    /** All existing role IDs (for uniqueness check during rename). */
    existingRoleIds: ReadonlySet<string>;
    /** Whether settings are writable by the current user. */
    writable: boolean;
    /** Optional initial editing state (useful for tests). */
    initialEditing?: boolean;
    /** Section copy. */
    t: (key: SubagentDirectorKey) => string;
    /** Commit an edited role; returns a localized failure message or undefined. */
    onSave: (newId: string, draft: RoleDraft) => Promise<string | undefined>;
    /** Delete this role; returns a localized failure message or undefined. */
    onDelete: () => Promise<string | undefined>;
    /** Promote this role to default; returns a localized failure message or undefined. */
    onSetDefault: () => Promise<string | undefined>;
}
export declare function RoleCard({ id, role, isDefault, routes, tools, existingRoleIds, writable, initialEditing, t, onSave, onDelete, onSetDefault, }: RoleCardProps): JSX.Element;
//# sourceMappingURL=RoleCard.d.ts.map