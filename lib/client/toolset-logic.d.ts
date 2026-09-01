/**
 * Pure tool-set picker logic for the role editor (search / select-all /
 * deselect-all). Framework-free so the filtering and set algebra are
 * unit-testable without React.
 *
 * The select-all / deselect-all semantics follow the "filtered scope" rule:
 * they operate ONLY on the currently filtered tool names, never on tools the
 * search has hidden, so a user searching for "web" cannot accidentally select
 * every unrelated tool.
 */
/** Case-insensitive substring filter over tool names; empty query keeps all. */
export declare function filterToolNames(tools: readonly string[], query: string): string[];
/** Toggle one tool name in the allow list (order-preserving). */
export declare function toggleToolName(current: readonly string[], name: string): string[];
/** Add every candidate to the allow list (deduplicated, order-preserving). */
export declare function addToolNames(current: readonly string[], candidates: readonly string[]): string[];
/** Remove every candidate from the allow list. */
export declare function removeToolNames(current: readonly string[], candidates: readonly string[]): string[];
//# sourceMappingURL=toolset-logic.d.ts.map