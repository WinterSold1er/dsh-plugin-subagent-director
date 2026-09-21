import type { SnapshotSelectorHook } from './bind.js';
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client';
import type { DirectorAllowedRoute } from '../bridge-contract.js';
import type { SubagentDirectorKey } from './locales.js';
import type { SubagentOptionsState, SubagentOptionsStore } from './store.js';
import type { StoredRole } from './store-logic.js';
/** Injected dependencies of {@link SubagentOptionsSection} (slot `inject`). */
export interface SubagentOptionsSectionInjected {
    /** The page store (loaded on mount, refreshed on pushed invalidations). */
    controller: SubagentOptionsStore;
    /** uSES subscription hook bound to the store. */
    useSnapshot: SnapshotSelectorHook<SubagentOptionsState>;
    /** Section copy. */
    t: (key: SubagentDirectorKey) => string;
}
/** Props delivered by the slot outlet: the inject face spread flat. */
export type SubagentOptionsSectionProps = Partial<SubagentOptionsSectionInjected> & {
    /** Framework global kit: current-session selector (for the tool catalog). */
    useSessions?: SnapshotSelectorHook<SessionListState>;
};
/**
 * Render the Subagent Director settings section content column.
 * @param props - slot-delivered injected dependencies.
 * @returns the section, or null while the shell has not injected yet.
 */
export declare function SubagentOptionsSection(props: SubagentOptionsSectionProps): JSX.Element | null;
/** The role-template roster: cards plus an inline add form. */
export declare function RolesBlock({ controller, routes, tools, writable, roles, defaultRole, t }: {
    controller: SubagentOptionsStore;
    routes: readonly DirectorAllowedRoute[];
    tools: readonly string[];
    writable: boolean;
    roles: [string, StoredRole][];
    defaultRole: string | undefined;
    t: (key: SubagentDirectorKey) => string;
}): JSX.Element;
//# sourceMappingURL=SubagentOptionsSection.d.ts.map