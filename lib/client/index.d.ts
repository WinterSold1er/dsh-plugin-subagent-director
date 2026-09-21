import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { en, zh, type SubagentDirectorKey } from './locales.js';
import { SubagentOptionsStore } from './store.js';
/** Dictionary namespace owned by Subagent Director (bilingual, typed). */
export declare const NS = "settings.subagentDirector";
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Subagent Director settings-page copy. */
        'settings.subagentDirector': SubagentDirectorKey;
    }
}
export { en, zh };
export type { SubagentDirectorKey } from './locales.js';
export type { SubagentOptionsSectionInjected, SubagentOptionsSectionProps } from './SubagentOptionsSection.js';
export type { SubagentOptionsState, SubagentOptionsStore } from './store.js';
/** Refetch the page snapshot only after its first load. */
export declare function refreshIfLoaded(controller: SubagentOptionsStore): void;
/** Services required by the settings registration (cordis fiber inject). */
export declare const inject: string[];
/**
 * Register the Subagent Director section once the `settings.section`
 * declaration is on the ledger, wire its store to the connection, and keep it
 * fresh on every pushed invalidation (settings or provider topology).
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map