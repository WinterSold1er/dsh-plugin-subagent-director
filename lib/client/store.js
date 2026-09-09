import { SUBAGENT_DIRECTOR_RPC_CHANNEL, SUBAGENT_DIRECTOR_RPC_VIEW, SUBAGENT_DIRECTOR_RPC_MUTATE, SUBAGENT_DIRECTOR_RPC_TOOLS, } from '../bridge-contract.js';
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
import { addRoleOps, classifyMutateError, defaultModelOps, removeRoleOps, restoreDefaultsOps, enforcementOps, setDefaultRoleOps, updateRoleOps, } from './store-logic.js';
/** The settings namespace this page reads and writes. */
export const SUBAGENT_DIRECTOR_NS = 'subagent-director';
/** Initial empty snapshot. */
export function initialSubagentOptionsState() {
    return {
        status: 'idle',
        error: null,
        writable: true,
        namespace: undefined,
        section: undefined,
        revision: 0,
        providers: [],
        models: [],
        tools: [],
        loading: false,
    };
}
/** Human text for a rejected wire call. */
export function messageOf(error) {
    if (error instanceof Error)
        return error.message;
    return typeof error === 'string' ? error : String(error);
}
/**
 * Raised when the /subagent-director bridge channel is not reachable on the
 * current transport (a Host that predates the bridge answers nothing). The
 * store surfaces this as the localized `bridgeUnavailable` copy instead of a
 * raw transport string.
 */
export class BridgeUnavailableError extends Error {
    constructor() {
        super('Subagent Director settings bridge (/subagent-director) is not available on this server');
    }
}
/** Whether a thrown value means the bridge channel could not be called at all. */
export function isBridgeUnavailable(error) {
    return error instanceof BridgeUnavailableError;
}
/** The settings page controller (one per settings surface). */
export class SubagentOptionsStore {
    store;
    wire;
    generation = 0;
    /** Last session id used for the tool catalog (reused by refreshes). */
    lastSessionId;
    constructor(wire) {
        this.wire = wire;
        this.store = createSnapshotStore(initialSubagentOptionsState());
    }
    /**
     * Call one bridge endpoint over the generic RPC channel. Returns the RpcResult
     * (ok or error branch). A transport-level rejection — the Host has no
     * /subagent-director channel — is folded into BridgeUnavailableError so the
     * caller can show the localized message.
     */
    async callBridge(endpoint, payload) {
        let result;
        try {
            result = (await this.wire.rpc.call(SUBAGENT_DIRECTOR_RPC_CHANNEL, endpoint, payload));
        }
        catch (error) {
            throw new BridgeUnavailableError();
        }
        if (!result.ok) {
            return { ok: false, error: result.error };
        }
        return { ok: true, value: result.value };
    }
    /** Refresh the whole page snapshot: provider directory + model catalog + own namespace. */
    async load(sessionId) {
        const generation = ++this.generation;
        if (sessionId !== undefined)
            this.lastSessionId = sessionId;
        const effectiveSessionId = this.lastSessionId;
        this.store.update((s) => {
            s.status = 'loading';
            s.error = null;
            s.loading = true;
        });
        try {
            const [providersResponse, modelsResponse, viewResult, toolsResult] = await Promise.all([
                this.wire.llm.providers({}),
                this.wire.llm.models({}),
                this.callBridge(SUBAGENT_DIRECTOR_RPC_VIEW),
                // The tool catalog is best-effort: a bridge without the endpoint (or a
                // registry-less host) degrades to an empty list, never blocks the page.
                // Passing the current session id lets the Host enumerate the agent's
                // FULL tool view (preset tools like bash/read/write live in the agent
                // scope, not the global registry).
                this.callBridge(SUBAGENT_DIRECTOR_RPC_TOOLS, { sessionId: effectiveSessionId }).catch(() => ({
                    ok: false,
                    error: { code: 'internal', message: 'tool catalog unavailable' },
                })),
            ]);
            if (!providersResponse.result.ok)
                throw new Error(providersResponse.result.error.message);
            if (!modelsResponse.result.ok)
                throw new Error(modelsResponse.result.error.message);
            if (!viewResult.ok)
                throw new Error(this.errorMessage(viewResult.error));
            if (generation !== this.generation)
                return;
            const view = viewResult.value.view;
            const section = (view?.value ?? {});
            const writable = viewResult.value.writable;
            const providers = providersResponse.result.value.providers;
            const models = modelsResponse.result.value.groups;
            const tools = toolsResult.ok ? toolsResult.value.tools : [];
            this.store.update((s) => {
                s.status = 'ready';
                s.error = null;
                s.writable = writable;
                s.providers = providers;
                s.models = models;
                s.tools = tools;
                s.namespace = view;
                s.section = section;
                s.revision = view?.revision ?? 0;
                s.loading = false;
            });
        }
        catch (error) {
            if (generation !== this.generation)
                return;
            this.store.update((s) => {
                s.status = 'error';
                s.error = isBridgeUnavailable(error) ? this.wire.t('bridgeUnavailable') : messageOf(error);
                s.loading = false;
            });
        }
    }
    /** Human text for a bridge RPC error branch. */
    errorMessage(error) {
        if (error !== null && typeof error === 'object' && 'message' in error) {
            const message = error.message;
            if (typeof message === 'string')
                return message;
        }
        return messageOf(error);
    }
    /**
     * Run one mutate and update the snapshot's revision. Returns a failure
     * message (localized by the caller) or undefined on success. A
     * settings-conflict re-reads the namespace and returns the conflict kind so
     * the UI can show the "please review and retry" message.
     */
    async mutate(ops) {
        const state = this.store.getSnapshot();
        const ns = SUBAGENT_DIRECTOR_NS;
        const revision = state.revision;
        let result;
        try {
            result = await this.callBridge(SUBAGENT_DIRECTOR_RPC_MUTATE, { ns, ops, expectedRevision: revision });
        }
        catch (error) {
            return {
                ok: false,
                kind: 'fatal',
                message: isBridgeUnavailable(error) ? this.wire.t('bridgeUnavailable') : messageOf(error),
            };
        }
        if (result.ok) {
            const admitted = result.value;
            this.store.update((s) => {
                s.revision = admitted.revision;
                // Refresh the cached section/namespace from the acknowledged view.
                s.namespace = admitted;
                s.section = (admitted.value ?? {});
            });
            return { ok: true, kind: 'fatal', message: undefined };
        }
        const code = this.errorCode(result.error);
        const message = this.errorMessage(result.error);
        const kind = classifyMutateError(code, message);
        if (kind === 'conflict') {
            // Re-read the authoritative namespace so the user reviews fresh values.
            await this.reloadNamespace();
            return { ok: false, kind, message };
        }
        return { ok: false, kind, message };
    }
    async reloadNamespace() {
        try {
            const result = await this.callBridge(SUBAGENT_DIRECTOR_RPC_VIEW);
            if (!result.ok)
                return;
            const view = result.value.view;
            if (!view)
                return;
            this.store.update((s) => {
                s.namespace = view;
                s.section = (view.value ?? {});
                s.revision = view.revision;
                s.writable = result.value.writable;
            });
        }
        catch {
            /* keep last good snapshot */
        }
    }
    /** Error code of a bridge RPC error branch, when present. */
    errorCode(error) {
        if (error !== null && typeof error === 'object' && 'code' in error) {
            const code = error.code;
            return typeof code === 'string' ? code : undefined;
        }
        return undefined;
    }
    async addRole(id, draft) {
        const result = await this.mutate(addRoleOps(id, draft));
        return result.ok ? undefined : result.message;
    }
    async updateRole(id, before, draft) {
        const result = await this.mutate(updateRoleOps(id, before, draft));
        return result.ok ? undefined : result.message;
    }
    async removeRole(id) {
        const state = this.store.getSnapshot();
        const result = await this.mutate(removeRoleOps(id, { defaultRole: state.section?.defaultRole }));
        return result.ok ? undefined : result.message;
    }
    async setDefaultRole(id) {
        const result = await this.mutate(setDefaultRoleOps(id));
        return result.ok ? undefined : result.message;
    }
    async setDefaultModel(edits) {
        const state = this.store.getSnapshot();
        const result = await this.mutate(defaultModelOps(state.section ?? {}, edits));
        return result.ok ? undefined : result.message;
    }
    async restoreDefaults() {
        const state = this.store.getSnapshot();
        const result = await this.mutate(restoreDefaultsOps(state.section ?? {}));
        return result.ok ? undefined : result.message;
    }
    async setEnforcement(next) {
        const state = this.store.getSnapshot();
        const result = await this.mutate(enforcementOps(state.section ?? {}, next));
        return result.ok ? undefined : result.message;
    }
}
//# sourceMappingURL=store.js.map