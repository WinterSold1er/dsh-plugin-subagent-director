/** Selector hook produced by {@link bindSnapshotSelector}. */
export type SnapshotSelectorHook<State> = <Selected>(selector: (state: State) => Selected) => Selected;
/** Minimal bare observable snapshot source accepted by the binder. */
export interface SnapshotSource<State> {
    subscribe(listener: () => void): () => void;
    getSnapshot(): State;
}
/**
 * Bind a bare observable source (subscribe/getSnapshot) to a selector hook.
 * The selector is applied to the snapshot on every render; identity stores can
 * simply pass `(s) => s`.
 */
export declare function bindSnapshotSelector<State>(store: SnapshotSource<State>): SnapshotSelectorHook<State>;
//# sourceMappingURL=bind.d.ts.map