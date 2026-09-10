/**
 * Subagent Director — M3b observability dock readout.
 *
 * Contributes a single ambient line to the `conversation.composer.dock` seat
 * (the band under the composer card). When the current session is an
 * addressed subagent child it shows the provider/model that child actually
 * ran on:
 *   - fast path: the opened transcript's latest assistant message already
 *     records provenance/requestConfig (zero extra RPC — see subagent-model.ts).
 *     On the alpha.4/alpha.5 host line the transcript nodes come from the
 *     chat view snapshot's `legacy.nodes` slice, read through the injected
 *     `useChatSnapshot(sessionId)` hook (uiConversation binding → 'chat' target);
 *   - fallback: current DSH runtimes do not populate those fields, so the
 *     dock asks the Host bridge for the child's last `request/header` event
 *     (`subagentModel` endpoint) and caches the answer per child session.
 * When neither source proves a model it degrades to a short notice. Ordinary
 * sessions render nothing, so the dock stays clean.
 *
 * The dock is an additive list slot declared by ui-conversation at runtime;
 * we only contribute an occupant, never re-declare it. The framework session
 * standard kit (ui-session merge) supplies `useSession`/`sessionId`; the
 * registration injects the RPC caller and the chat-snapshot hook.
 */
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Business face injected by the registration (client/index.ts). */
export interface SubagentModelDockInjected {
    /** Generic RPC caller for the /subagent-director bridge channel. */
    rpc: ClientConnectionRpc;
    /**
     * Alpha.4 chat-view snapshot hook: subscribes to the current session's
     * `chat` Conversation target (uiConversation binding) and returns its
     * snapshot, or undefined while no session is current / the target is
     * unassembled. The transcript nodes live at `snapshot.legacy.nodes`.
     */
    useChatSnapshot: (sessionId: SessionId | undefined) => ChatSnapshot | undefined;
}
/** Full props of the dock entry: session kit + inject + locale. */
export type SubagentModelDockProps = PropsRuntime<'conversation.composer.dock'> & InjectFace<SubagentModelDockInjected> & PropsLocale<typeof NS>;
/** Locale namespace shared with the settings page (registered in index apply). */
export declare const NS: 'settings.subagentDirector';
/** Render the provider/model readout for an addressed subagent, or nothing. */
export declare function SubagentModelDock({ useSession, sessionId, rpc, useChatSnapshot, t, }: SubagentModelDockProps): React.JSX.Element | null;
//# sourceMappingURL=SubagentModelDock.d.ts.map