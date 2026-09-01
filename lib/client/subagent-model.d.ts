/**
 * Subagent Director — M3b observability pure logic.
 *
 * Extracts the provider/model a subagent actually ran on, straight from an
 * opened subagent conversation snapshot with zero extra RPC: each finalized
 * assistant message may carry a reported `provenance` (the adapter-reported
 * provider/model) and the `requestConfig` that was requested. We take the
 * latest assistant message that exposes either, preferring the reported
 * provenance over the requested config, and format a localized readout.
 *
 * Pure and framework-free so the formatting rules are unit-testable.
 */
import type { AssistantMessageNode, ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
/** The durable provider/model identity of one subagent run. */
export interface SubagentModelRef {
    readonly found: true;
    readonly provider: string;
    readonly model: string;
}
/** A transcript has not yet proven which provider/model a subagent used. */
export interface NoSubagentModel {
    readonly found: false;
}
export type SubagentModelLookup = SubagentModelRef | NoSubagentModel;
/**
 * Prefer the latest assistant message's reported provenance; fall back to its
 * requested config. Order walks the snapshot's node list from the tail so we
 * surface the most recent completed request, which is the meaningful one when
 * a subagent retried or only partially ran.
 */
export declare function latestSubagentModel(snapshot: Pick<ConversationSnapshot, 'nodes'>): SubagentModelLookup;
/** Resolve the model identity off one assistant message (provenance first). */
export declare function provenanceOf(assistant: AssistantMessageNode): SubagentModelRef | null;
/**
 * Whether this conversation is an addressed subagent (a catalog-discovered
 * child) — the surface where the official read-only composer shows and where
 * a model readout is most useful. A null `subagent` on an ordinary session
 * returns false even when nodes carry provenance.
 */
export declare function isAddressedSubagent(snapshot: Pick<ConversationSnapshot, 'subagent'> | null | undefined): boolean;
/**
 * Compact provider/model label, e.g. "deepseek/deepseek-v4-flash". The model
 * id can already include a provider prefix; we do not hyphenate or re-quote
 * so the exact route stays readable in one line.
 */
export declare function formatModelRef(ref: SubagentModelRef): string;
/**
 * Whether this session is a continuable child (the surface where the
 * "release sustained state" control is meaningful). Reads the catalog
 * address's mode; ordinary sessions and one-shot children are false.
 */
export declare function isContinuableChild(snapshot: Pick<ConversationSnapshot, 'subagent'> | null | undefined): boolean;
/**
 * Merge a local snapshot-derived lookup with a remote (RPC) lookup: the local
 * provenance wins when present (the runtime's own record), otherwise the
 * remote result decides. Kept pure so the dock's data-source preference is
 * unit-testable without a wire.
 */
export declare function mergeModelLookup(local: SubagentModelLookup, remote: SubagentModelLookup): SubagentModelLookup;
//# sourceMappingURL=subagent-model.d.ts.map