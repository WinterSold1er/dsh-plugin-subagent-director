/**
 * Tool-set picker shared by the role editor and the add-role form.
 *
 * A compact row that expands into: a search box, select-all / deselect-all
 * (scoped to the CURRENT filter — tools hidden by the search are never
 * touched), a live "selected / total" count, and a checkbox grid of the
 * filtered tools. Collapsed, it shows the label, the count, and a
 * chevron toggle so a large catalog (hundreds of MCP tools) stays compact.
 */
import type { SubagentDirectorKey } from './locales.js';
export interface ToolSetPickerProps {
    /** All model-visible tool names (the catalog). */
    tools: readonly string[];
    /** Currently selected (allow-list) tool names. */
    selected: readonly string[];
    /** Commit the new allow list. */
    onChange: (allow: string[]) => void;
    /** Section copy; may accept interpolation params. */
    t: (key: SubagentDirectorKey, params?: Record<string, string | number>) => string;
}
/** Render the searchable, select-all capable tool-set picker. */
export declare function ToolSetPicker({ tools, selected, onChange, t }: ToolSetPickerProps): React.JSX.Element;
//# sourceMappingURL=ToolSetPicker.d.ts.map