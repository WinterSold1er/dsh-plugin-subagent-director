/**
 * Subagent Director — self-published setting bridge on the Host web server
 * (design fix: "namespace not exposed").
 *
 * The Web settings client read/writes the plugin's `subagent-director`
 * namespace via a dedicated "/subagent-director" webServer prefix route instead
 * of the Host apiproxy's settings.describe/mutate, which the API proxy gates
 * behind its hard-coded exposedNamespaces() allowlist
 * (dsh-host-apiproxy). A tree-external plugin cannot add its own namespace to
 * that list, so those calls answer `settings-not-exposed`. To bypass the
 * allowlist without touching apiproxy, this module self-publishes a prefix
 * route (kind:"prefix", path:"/subagent-director") via `ctx.webServer.register`
 * (dsh-host-webserver/lib/index.js:53-60) and reads/writes `ctx.settings`
 * itself.
 *
 * The wire contract mirrors the settings domain slice apiproxy exposes for
 * one namespace: `settingsView` returns `{ writable, view }` where `view` is a
 * `SettingsNamespaceView` (redacted), and `settingsMutate` applies path ops
 * with an optimistic `expectedRevision` and returns the new redacted view, or
 * an error with the same `settings-conflict` / `settings-rejected` semantics so
 * the existing client conflict-reload logic works unchanged. The client already
 * speaks this contract unchanged (dsh-client-connection/lib/client.js:10094-10113
 * and src/client/store.ts), so no client change is required.
 *
 * Pure mapping / wire-envelope helpers live at the top (no cordis) so they are
 * unit-testable in a plain node environment. The route handler is a node:http
 * (req, res) handler, mirroring the Connection channel semantics in
 * dsh-client-connection/lib/index.js:275-300 and 322-328, plus a lightweight
 * loopback Host fence.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Context } from '@deepseek-ai/cordis';
import { SessionId } from '@deepseek-ai/dsh-session';
import { SettingsConflictError, type SettingsDescriptor, type SettingsProvider } from '@deepseek-ai/dsh-settings';
import type { RpcResult, RpcError, SettingsNamespaceView, SettingsPathOpView } from '@deepseek-ai/dsh-host-apiproxy/api';
import { SettingsSchema } from './settings.js';
import { SUBAGENT_DIRECTOR_RPC_VIEW, SUBAGENT_DIRECTOR_RPC_MUTATE, SUBAGENT_DIRECTOR_RPC_CLOSE, SUBAGENT_DIRECTOR_RPC_MODEL, SUBAGENT_DIRECTOR_RPC_TOOLS, type DirectorCloseRequest, type DirectorModelRequest, type DirectorModelSuccess, type DirectorMutateRequest, type DirectorToolsSuccess, type DirectorViewSuccess } from './bridge-contract.js';
import { SUBAGENT_DIRECTOR_ROUTE_PATH } from './envelope.js';
/** Wire route path the bridge owns on the Host web server. */
export { SUBAGENT_DIRECTOR_ROUTE_PATH as SUBAGENT_DIRECTOR_RPC_CHANNEL };
/** Endpoint that returns the namespace's redacted wire view. */
export { SUBAGENT_DIRECTOR_RPC_VIEW };
/** Endpoint that applies one path-op mutation. */
export { SUBAGENT_DIRECTOR_RPC_MUTATE };
/** Endpoint that releases one resident continuable child of a live parent. */
export { SUBAGENT_DIRECTOR_RPC_CLOSE };
/** Endpoint that returns the actual provider/model of one child session. */
export { SUBAGENT_DIRECTOR_RPC_MODEL };
/** Endpoint that returns the model-visible tool catalog for role tool-set editing. */
export { SUBAGENT_DIRECTOR_RPC_TOOLS };
/** Request payload for the settingsMutate bridge endpoint. */
export type { DirectorMutateRequest, DirectorViewSuccess, DirectorCloseRequest, DirectorModelRequest, DirectorModelSuccess, DirectorToolsSuccess };
/**
 * The services the bridge dispatch needs beyond settings. Kept structural so
 * the module stays testable without a live cordis context; installers resolve
 * them lazily through ctx.get and may leave optional ones undefined.
 */
export interface BridgeDeps {
    settings: SettingsProvider;
    /** Live agent registry (dsh-agent ctx.agents). */
    agents?: {
        get(id: SessionId): unknown;
    };
    /** Subagent service (dsh-subagent ctx.subagents). */
    subagents?: {
        drainContinuableChildren(parent: unknown, childIds: readonly SessionId[]): Promise<void>;
    };
    /** Unified session query (dsh-session-query ctx.sessionQuery). */
    sessionQuery?: {
        readSession(sessionId: SessionId): Promise<{
            events: readonly unknown[];
        }>;
    };
    /** Tool registry (dsh-tools ctx.tools), for the role tool-set catalog. */
    tools?: {
        schemas(): readonly {
            name: string;
        }[];
    };
}
/**
 * Fold the actual provider/model off a session event log: walk from the tail
 * and take the LAST `request/header` event's `data.header.config`, which the
 * agent loop records on every model request (the durable "what actually ran"
 * source; assistant messages carry no provider/model in current DSH).
 * Returns undefined when the log records none.
 */
export declare function latestRequestHeaderModel(events: readonly unknown[]): {
    provider: string;
    model: string;
} | undefined;
/**
 * Map one redacted settings descriptor to its wire view — mirrors apiproxy's
 * `namespaceView` (dsh-host-apiproxy/lib/index.js:2385-2399) exactly, so the
 * client store sees the same `SettingsNamespaceView` shape it already renders.
 */
export declare function toDirectorNamespaceView(descriptor: SettingsDescriptor): SettingsNamespaceView;
/**
 * Find the Subagent Director namespace in a redacted describe result and map
 * it to its wire view; `undefined` when the namespace is not registered.
 */
export declare function pickDirectorNamespaceView(descriptors: readonly SettingsDescriptor[]): SettingsNamespaceView | undefined;
/**
 * Read the current redacted namespace view straight from the settings seam.
 * Exported for reuse by tests and by the bridge handler.
 */
export declare function readDirectorNamespaceView(settings: SettingsProvider): DirectorViewSuccess;
/** Build the `settings-rejected` RPC error for one seam failure. */
export declare function directorRejected(ns: string, error: unknown): RpcError;
/** Build the `settings-conflict` RPC error, mirroring apiproxy's mapping. */
export declare function directorConflict(conflict: SettingsConflictError): RpcError;
/**
 * Build the ok payload for the settingsView endpoint.
 * Mirrors the apiproxy `settings.describe` value minus `hasDocument` (the
 * bridge does not own the document affordance; the client ignores it).
 */
export declare function directorViewOk(settings: SettingsProvider): RpcResult<DirectorViewSuccess>;
/**
 * Execute one path-op mutation against the settings seam and map the outcome
 * to an RpcResult carrying the new redacted view (or a `settings-conflict` /
 * `settings-rejected` error). Pure over the injected primitives for testing.
 */
export declare function directorMutate(mutate: SettingsProvider['mutate'], describe: SettingsProvider['describe'], ns: string, ops: readonly SettingsPathOpView[], expectedRevision: number | undefined): Promise<RpcResult<SettingsNamespaceView>>;
/** Re-export the wire-envelope helpers so tests import them from one place. */
export { parseClientRequestEnvelope, isLoopbackHost, isLoopbackHostname, endpointFromPath, buildServerResponse, buildMethodMismatchResponse, buildBadRequestResponse, INVALID_REQUEST_RPC_ID, } from './envelope.js';
/**
 * The node:http handler for the "/subagent-director" prefix route. Owns the
 * full response lifecycle. Wire contract mirrors the generic Connection RPC
 * channel (dsh-client-connection/lib/index.js:275-328):
 *   - non-POST        → 404 "not found"
 *   - wrong content-type → 415
 *   - unparseable JSON body → 400 "body is not JSON"
 *   - malformed client-request envelope → 200 bad-request (fixed rpcId)
 *   - method vs endpoint mismatch → 200 bad-request
 *   - non-loopback Host header → 403 "forbidden" (lightweight trust fence)
 *   - dispatch error → 500 "handler failure: ..."
 */
export declare function handleDirectorBridgeRequest(deps: BridgeDeps, req: IncomingMessage, res: ServerResponse): Promise<void>;
/**
 * Return the distinct tool names for the role tool-set editor.
 *
 * The FULL model-visible set (preset tools such as bash/read/write/grep plus
 * registry tools) only exists in the calling agent's scope: preset tool
 * plugins register into the agent's ctx layers, so the global registry view
 * misses them. When the client supplies its session id, we enumerate through
 * that agent's own tools instance (`agent.ctx.get('tools').schemas(agent)`);
 * without a live agent we degrade to the global registry view so the page
 * still renders.
 */
export declare function dispatchSubagentTools(deps: BridgeDeps, payload: unknown): RpcResult<DirectorToolsSuccess>;
/**
 * Release one resident continuable child of an exact live parent (issue #1 UI
 * path). The parent agent is looked up by session id; when it is no longer
 * live its continuable children were released with it, which the client
 * surfaces as `subagent-parent-not-live`. A drain rejection (e.g. core
 * UNAUTHORIZED for a non-direct child) maps to `subagent-close-rejected`.
 */
export declare function dispatchSubagentClose(deps: BridgeDeps, payload: unknown): Promise<RpcResult<{
    closed: true;
}>>;
/**
 * Return the actual provider/model of one child session from its last
 * `request/header` event (the observability data source; see
 * latestRequestHeaderModel). Degrades to { found: false } when the log
 * records none and to `subagent-model-unavailable` when the session query
 * service is not mounted.
 */
export declare function dispatchSubagentModel(deps: BridgeDeps, payload: unknown): Promise<RpcResult<DirectorModelSuccess>>;
/**
 * Install the Subagent Director setting bridge on the Host web server via a
 * self-published prefix route. Lazy-acquires `ctx.webServer`; a deployment
 * without that service (e.g. headless) logs a debug line naming the missing
 * service and installs nothing. Returns a disposer.
 */
export declare function installDirectorRemoteBridge(ctx: Context): () => void;
/** Convenience re-export for the namespaced schema used to document the view. */
export { SettingsSchema };
//# sourceMappingURL=remote.d.ts.map