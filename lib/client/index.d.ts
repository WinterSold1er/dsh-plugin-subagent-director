import type { ClientContext, ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
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
/**
 * Compile-time view of `conversation.composer.dock`: declared here only to
 * strongly type our occupant. The runtime seat is owned by
 * dsh-client-ui-conversation's bundle; this augmentation contributes no
 * runtime declaration (it stays in this package's own module scope).
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        'conversation.composer.dock': {
            kind: 'list';
            scope: 'session';
            owner: {
                readonly session: ConversationSnapshot | undefined;
                readonly input: unknown;
            };
        };
        /** Additive per-session header action row (ui-conversation seat). */
        'conversation.session.header.actions': {
            kind: 'list';
            scope: 'session';
        };
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