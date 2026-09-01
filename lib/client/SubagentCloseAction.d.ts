/**
 * Subagent Director — "release sustained state" header action (issue #1).
 *
 * Contributes one button to the `conversation.session.header.actions` seat
 * (the additive per-session control row beside the session title). It renders
 * only while the CURRENT session is a continuable subagent child
 * (snapshot.subagent.address.mode === 'continuable') and otherwise returns
 * null, so ordinary sessions and one-shot children see nothing.
 *
 * Clicking asks the Host bridge's `subagentClose` endpoint to
 * drainContinuableChildren under the address's durable parent authority; on
 * success the button turns into a settled label (the child's handle is
 * released), on failure a short inline error shows the core message.
 *
 * The seat is a list slot declared by ui-conversation; the framework session
 * standard kit supplies `useSession`/`sessionId` (dsh-client-runtime merge),
 * the registration injects the RPC caller.
 */
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Business face injected by the registration (client/index.ts). */
export interface SubagentCloseActionInjected {
    /** Generic RPC caller for the /subagent-director bridge channel. */
    rpc: ClientConnectionRpc;
}
/** Full props: framework session kit + injected RPC + locale seat. */
export type SubagentCloseActionProps = PropsRuntime<'conversation.session.header.actions'> & InjectFace<SubagentCloseActionInjected> & PropsLocale<typeof NS>;
/** Locale namespace shared with the settings page (registered in index apply). */
export declare const NS: 'settings.subagentDirector';
/** Render the release-sustained-state button for a continuable child, or nothing. */
export declare function SubagentCloseAction({ useSession, sessionId, rpc, t, }: SubagentCloseActionProps): React.JSX.Element | null;
//# sourceMappingURL=SubagentCloseAction.d.ts.map