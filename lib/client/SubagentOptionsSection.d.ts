import type { SnapshotSelectorHook } from './bind.js';
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client';
import type { SubagentDirectorKey } from './locales.js';
import type { SubagentOptionsState, SubagentOptionsStore } from './store.js';
/** Injected dependencies of {@link SubagentOptionsSection} (slot `inject`). */
export interface SubagentOptionsSectionInjected {
    /** The page store (loaded on mount, refreshed on pushed invalidations). */
    controller: SubagentOptionsStore;
    /** uSES subscription hook bound to the store. */
    useSnapshot: SnapshotSelectorHook<SubagentOptionsState>;
    /** Wire faces the page writes through (kept for parity with the slot contract). */
    api: unknown;
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
//# sourceMappingURL=SubagentOptionsSection.d.ts.map