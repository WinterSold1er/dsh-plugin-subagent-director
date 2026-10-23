import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
 * drainChildren under the address's durable parent authority; on
 * success the button turns into a settled label (the child's handle is
 * released), on failure a short inline error shows the core message.
 *
 * The seat is a list slot declared by ui-conversation; the framework session
 * standard kit supplies `useSession`/`sessionId` (ui-session merge over the
 * alpha.4 SessionSnapshot), the registration injects the RPC caller.
 */
import { useEffect, useState } from 'react';
import { SUBAGENT_DIRECTOR_RPC_CHANNEL, SUBAGENT_DIRECTOR_RPC_CLOSE, } from '../bridge-contract.js';
import { isContinuableChild } from './subagent-model.js';
/** Locale namespace shared with the settings page (registered in index apply). */
export const NS = 'settings.subagentDirector';
/** Render the release-sustained-state button for a continuable child, or nothing. */
export function SubagentCloseAction({ useSession, sessionId, rpc, t, }) {
    const session = useSession((s) => s);
    const [state, setState] = useState('idle');
    const [error, setError] = useState(null);
    // Reset the outcome when the user switches to another session.
    useEffect(() => {
        setState('idle');
        setError(null);
    }, [sessionId]);
    if (!isContinuableChild(session))
        return null;
    const address = session.subagent.address;
    const onClose = async () => {
        if (state === 'closing')
            return;
        setState('closing');
        setError(null);
        try {
            const result = await rpc.call(SUBAGENT_DIRECTOR_RPC_CHANNEL, SUBAGENT_DIRECTOR_RPC_CLOSE, {
                parentSessionId: address.parentSessionId,
                childSessionId: address.childSessionId,
            });
            if (result.ok) {
                setState('closed');
            }
            else {
                setState('failed');
                setError(result.error.message);
            }
        }
        catch {
            setState('failed');
        }
    };
    if (state === 'closed') {
        return (_jsx("div", { className: "sd-close-wrap", role: "status", children: _jsx("span", { className: "sd-close-settled", children: t('closedSubagent') }) }));
    }
    return (_jsxs("div", { className: "sd-close-wrap", children: [_jsx("button", { type: "button", className: "sd-btn sd-btn-danger sd-btn-sm", disabled: state === 'closing', onClick: () => {
                    const confirmed = typeof window === 'undefined' ||
                        window.confirm(t('confirmCloseContinuable', { id: address.childSessionId }));
                    if (confirmed)
                        void onClose();
                }, title: t('closeContinuableTitle', { id: address.childSessionId }), children: state === 'closing' ? t('closingContinuable') : t('closeContinuable') }), state === 'failed' && (_jsx("span", { className: "sd-close-error", role: "alert", title: t('closeFailed', { message: error ?? '' }), children: t('closeFailed', { message: error ?? '' }) }))] }));
}
//# sourceMappingURL=SubagentCloseAction.js.map