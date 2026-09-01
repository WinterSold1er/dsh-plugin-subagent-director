/**
 * Subagent Director — M3b observability dock readout.
 *
 * Contributes a single ambient line to the `conversation.composer.dock` seat
 * (the band under the composer card). When the current session is an
 * addressed subagent child it shows the provider/model that child actually
 * ran on:
 *   - fast path: the opened transcript's latest assistant message already
 *     records provenance/requestConfig (zero extra RPC — see subagent-model.ts);
 *   - fallback: current DSH runtimes do not populate those fields, so the
 *     dock asks the Host bridge for the child's last `request/header` event
 *     (`subagentModel` endpoint) and caches the answer per child session.
 * When neither source proves a model it degrades to a short notice. Ordinary
 * sessions render nothing, so the dock stays clean.
 *
 * The dock is an additive list slot declared by ui-conversation at runtime;
 * we only contribute an occupant, never re-declare it. Our compile-time
 * SlotMap augmentation in index.ts narrows the registration typing.
 */
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client';
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Owner currency of the composer dock as ui-conversation declares it. */
export interface ComposerDockOwner {
    readonly session: ConversationSnapshot | undefined;
    readonly input: unknown;
}
/** Business face injected by the registration (client/index.ts). */
export interface SubagentModelDockInjected {
    /** Generic RPC caller for the /subagent-director bridge channel. */
    rpc: ClientConnectionRpc;
}
/** Full props of the dock entry: runtime (owner session) + inject + locale. */
export type SubagentModelDockProps = PropsRuntime<'conversation.composer.dock'> & InjectFace<SubagentModelDockInjected> & PropsLocale<typeof NS>;
/** Locale namespace shared with the settings page (registered in index apply). */
export declare const NS: 'settings.subagentDirector';
/** Render the provider/model readout for an addressed subagent, or nothing. */
export declare function SubagentModelDock({ session, rpc, t, }: SubagentModelDockProps): React.JSX.Element | null;
//# sourceMappingURL=SubagentModelDock.d.ts.map