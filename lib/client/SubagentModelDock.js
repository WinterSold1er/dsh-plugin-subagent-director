import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useEffect, useRef, useState } from 'react';
import { SUBAGENT_DIRECTOR_RPC_CHANNEL, SUBAGENT_DIRECTOR_RPC_MODEL, } from '../bridge-contract.js';
import { formatModelRef, isAddressedSubagent, latestSubagentModel, mergeModelLookup, } from './subagent-model.js';
/** Locale namespace shared with the settings page (registered in index apply). */
export const NS = 'settings.subagentDirector';
/** Inline styling using the shared token surface (no CSS pipeline; M2 deviation). */
const style = {
    root: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 16px',
        fontSize: 12,
        lineHeight: '16px',
        color: 'var(--dsw-alias-label-tertiary)',
    },
    ref: {
        color: 'var(--dsw-alias-label-secondary)',
        fontFamily: 'var(--dsw-font-family-mono, monospace)',
    },
};
/** Render the provider/model readout for an addressed subagent, or nothing. */
export function SubagentModelDock({ session, rpc, t, }) {
    const [query, setQuery] = useState({ status: 'idle' });
    const cache = useRef(new Map());
    const local = latestSubagentModel(session);
    const childSessionId = session?.subagent?.address?.childSessionId;
    const lastSeq = session && Array.isArray(session.nodes) && session.nodes.length > 0
        ? session.nodes[session.nodes.length - 1].seq ?? 0
        : 0;
    useEffect(() => {
        if (!isAddressedSubagent(session)) {
            setQuery({ status: 'idle' });
            return;
        }
        if (local.found || childSessionId === undefined)
            return;
        const cached = cache.current.get(childSessionId);
        if (cached !== undefined) {
            setQuery(cached);
            return;
        }
        let alive = true;
        setQuery({ status: 'querying' });
        rpc
            .call(SUBAGENT_DIRECTOR_RPC_CHANNEL, SUBAGENT_DIRECTOR_RPC_MODEL, { sessionId: childSessionId })
            .then((result) => {
            if (!alive)
                return;
            let next;
            if (result.ok) {
                const value = result.value;
                next =
                    value.found === true
                        ? { status: 'found', ref: { found: true, provider: value.provider, model: value.model } }
                        : { status: 'missing' };
            }
            else {
                next = { status: 'failed' };
            }
            cache.current.set(childSessionId, next);
            setQuery(next);
        })
            .catch(() => {
            if (!alive)
                return;
            const next = { status: 'failed' };
            cache.current.set(childSessionId, next);
            setQuery(next);
        });
        return () => {
            alive = false;
        };
        // Re-query when the child gains new assistant messages (deps on the tail
        // seq) or when the addressed child changes; cache short-circuits repeats.
    }, [session?.sessionId, childSessionId, lastSeq, local.found, rpc]);
    if (!isAddressedSubagent(session))
        return null;
    const remoteLookup = query.status === 'found' ? query.ref : { found: false };
    const lookup = mergeModelLookup(local, remoteLookup);
    if (!lookup.found) {
        return (_jsx("div", { style: style.root, role: "status", children: query.status === 'failed' ? t('modelQueryFailed') : t('modelNotRecorded') }));
    }
    const ref = lookup;
    return (_jsxs("div", { style: style.root, role: "status", children: [_jsx("span", { children: t('modelRanOn') }), _jsx("span", { style: style.ref, title: t('modelRanOnTitle', { model: formatModelRef(ref) }), children: formatModelRef(ref) })] }));
}
//# sourceMappingURL=SubagentModelDock.js.map