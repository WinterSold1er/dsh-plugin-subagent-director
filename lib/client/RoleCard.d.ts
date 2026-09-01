import type { ModelProviderGroup } from '@deepseek-ai/dsh-client-connection/client';
import type { SubagentDirectorKey } from './locales.js';
import type { RoleDraft, StoredRole } from './store-logic.js';
export interface RoleCardProps {
    /** Persisted role id (kebab-case). */
    id: string;
    /** Persisted role value. */
    role: StoredRole;
    /** Whether this role is the defaultRole. */
    isDefault: boolean;
    /** Available providers (for the provider select). */
    groups: readonly ModelProviderGroup[];
    /** Distinct model-visible tool names (for the tool-set row). */
    tools: readonly string[];
    /** Section copy. */
    t: (key: SubagentDirectorKey) => string;
    /** Commit an edited role; returns a localized failure message or undefined. */
    onSave: (draft: RoleDraft) => Promise<string | undefined>;
    /** Delete this role; returns a localized failure message or undefined. */
    onDelete: () => Promise<string | undefined>;
    /** Promote this role to default; returns a localized failure message or undefined. */
    onSetDefault: () => Promise<string | undefined>;
}
export declare function RoleCard({ id, role, isDefault, groups, tools, t, onSave, onDelete, onSetDefault }: RoleCardProps): JSX.Element;
//# sourceMappingURL=RoleCard.d.ts.map