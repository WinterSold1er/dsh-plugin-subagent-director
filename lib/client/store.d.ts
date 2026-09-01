/**
 * Subagent Director settings page store: one snapshot joining the configurable
 * provider directory (llm.providers), the model catalog (llm.models), and the
 * plugin's own settings namespace. The settings namespace is read/written
 * through the plugin's self-published `/subagent-director` RPC channel (see
 * ../remote.ts) because the Host apiproxy's exposedNamespaces() allowlist
 * answers `settings-not-exposed` for namespaces outside the model-provider
 * plane; llm.providers/llm.models still ride `connection.api.llm`. The host
 * stays the single fact source: every write travels as path ops through the
 * bridge's settingsMutate endpoint with an expectedRevision optimistic lock,
 * and pushed invalidations (settings/document-updated, llm/adapters-updated,
 * connection/reset) refresh the page.
 */
import type { ClientConnectionRpc, ConfigurableProviderView, IApiClient, ModelProviderGroup, SettingsNamespaceView } from '@deepseek-ai/dsh-client-connection/client';
import type { SubagentDirectorKey } from './locales.js';
import { type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
import { type DefaultModelEdits, type MutationErrorKind, type RoleDraft, type StoredRole, type StoredSection, type OrchestrateEnforcement } from './store-logic.js';
/** The settings namespace this page reads and writes. */
export declare const SUBAGENT_DIRECTOR_NS = "subagent-director";
/** Page snapshot rendered by the section component. */
export interface SubagentOptionsState {
    status: 'idle' | 'loading' | 'ready' | 'error';
    /** Whole-load failure text; write failures stay in the calling card. */
    error: string | null;
    /** Whether the settings provider accepts writes. */
    writable: boolean;
    /** Namespace view (redacted). */
    namespace: SettingsNamespaceView | undefined;
    /** The plugin's own user-layer section, cast to its known shape. */
    section: StoredSection | undefined;
    /** Current expectedRevision for the next mutate. */
    revision: number;
    /** Configurable provider directory. */
    providers: readonly ConfigurableProviderView[];
    /** Model catalog groups (provider → models → reasoning efforts). */
    models: readonly ModelProviderGroup[];
    /** Distinct model-visible tool names for role tool-set editing. */
    tools: readonly string[];
    /** The plugin name surfaced to the section. */
    loading: boolean;
}
/** Initial empty snapshot. */
export declare function initialSubagentOptionsState(): SubagentOptionsState;
/** Human text for a rejected wire call. */
export declare function messageOf(error: unknown): string;
/**
 * Raised when the /subagent-director bridge channel is not reachable on the
 * current transport (a Host that predates the bridge answers nothing). The
 * store surfaces this as the localized `bridgeUnavailable` copy instead of a
 * raw transport string.
 */
export declare class BridgeUnavailableError extends Error {
    constructor();
}
/** Whether a thrown value means the bridge channel could not be called at all. */
export declare function isBridgeUnavailable(error: unknown): boolean;
/** Wire faces the settings page needs: the bridge RPC caller, the llm face, and copy. */
export interface StoreWire {
    /** Generic RPC caller for the self-published /subagent-director channel. */
    rpc: ClientConnectionRpc;
    /** llm catalog/adapters face (still connection.api.llm). */
    llm: IApiClient['llm'];
    /** Section copy binder (for the localized bridge-unavailable message). */
    t: (key: SubagentDirectorKey) => string;
}
/** The settings page controller (one per settings surface). */
export declare class SubagentOptionsStore {
    readonly store: SnapshotStore<SubagentOptionsState>;
    private readonly wire;
    private generation;
    /** Last session id used for the tool catalog (reused by refreshes). */
    private lastSessionId;
    constructor(wire: StoreWire);
    /**
     * Call one bridge endpoint over the generic RPC channel. Returns the RpcResult
     * (ok or error branch). A transport-level rejection — the Host has no
     * /subagent-director channel — is folded into BridgeUnavailableError so the
     * caller can show the localized message.
     */
    private callBridge;
    /** Refresh the whole page snapshot: provider directory + model catalog + own namespace. */
    load(sessionId?: string): Promise<void>;
    /** Human text for a bridge RPC error branch. */
    private errorMessage;
    /**
     * Run one mutate and update the snapshot's revision. Returns a failure
     * message (localized by the caller) or undefined on success. A
     * settings-conflict re-reads the namespace and returns the conflict kind so
     * the UI can show the "please review and retry" message.
     */
    private mutate;
    private reloadNamespace;
    /** Error code of a bridge RPC error branch, when present. */
    private errorCode;
    addRole(id: string, draft: RoleDraft): Promise<string | undefined>;
    updateRole(id: string, before: StoredRole | undefined, draft: RoleDraft): Promise<string | undefined>;
    removeRole(id: string): Promise<string | undefined>;
    setDefaultRole(id: string): Promise<string | undefined>;
    setDefaultModel(edits: DefaultModelEdits): Promise<string | undefined>;
    restoreDefaults(): Promise<string | undefined>;
    setEnforcement(next: OrchestrateEnforcement): Promise<string | undefined>;
}
/** Outcome of one write so the UI can pick the right message. */
export interface MutationOutcome {
    ok: boolean;
    kind: MutationErrorKind;
    message: string | undefined;
}
//# sourceMappingURL=store.d.ts.map