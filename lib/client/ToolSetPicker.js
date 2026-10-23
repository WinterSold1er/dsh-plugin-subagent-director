import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Tool-set picker shared by the role editor and the add-role form.
 *
 * A compact row that expands into: a search box, select-all / deselect-all
 * (scoped to the CURRENT filter — tools hidden by the search are never
 * touched), a live "selected / total" count, and a checkbox grid of the
 * filtered tools. Collapsed, it shows the label, the count, and a chevron
 * toggle so a large catalog (hundreds of MCP tools) stays compact.
 *
 * Styling uses the shared `sd-*` classes from ui.ts so the picker matches the
 * rest of the settings section in both themes.
 */
import { useId, useMemo, useState } from 'react';
import { addToolNames, filterToolNames, removeToolNames, toggleToolName, } from './toolset-logic.js';
/** Render the searchable, select-all capable tool-set picker. */
export function ToolSetPicker({ tools, selected, onChange, t, isDefault = false }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(true);
    // Stable id for the expandable region so the toggle can advertise its target.
    const panelId = useId();
    const filtered = useMemo(() => filterToolNames(tools, query), [tools, query]);
    const filteredSet = useMemo(() => new Set(filtered), [filtered]);
    const allFilteredSelected = filtered.length > 0 && filtered.every((name) => selected.includes(name));
    if (tools.length === 0) {
        return (_jsxs("div", { className: "sd-toolset", children: [_jsx("label", { className: "sd-label", children: t('toolFilter') }), _jsx("span", { className: "sd-note", children: t('toolFilterEmpty') })] }));
    }
    return (_jsxs("div", { className: "sd-toolset", children: [_jsxs("div", { className: "sd-toolset-head", children: [_jsx("label", { className: "sd-label", children: t('toolFilter') }), _jsx("span", { className: "sd-toolset-count", children: t('toolFilterCount', { count: selected.length, total: tools.length }) }), _jsx("button", { type: "button", className: "sd-btn sd-btn-ghost sd-btn-sm", "aria-expanded": open, "aria-controls": open ? panelId : undefined, onClick: () => setOpen((o) => !o), children: open ? t('toolFilterCollapse') : t('toolFilterExpand') })] }), open ? (_jsxs("div", { className: "sd-toolset-body", id: panelId, children: [_jsx("input", { className: "sd-input sd-search", value: query, placeholder: t('toolFilterSearch'), onChange: (e) => setQuery(e.target.value) }), _jsxs("div", { className: "sd-actions", children: [_jsx("button", { type: "button", className: "sd-btn sd-btn-ghost sd-btn-sm", disabled: filtered.length === 0 || allFilteredSelected, onClick: () => onChange(addToolNames(selected, filtered)), children: t('toolFilterSelectAll') }), _jsx("button", { type: "button", className: "sd-btn sd-btn-ghost sd-btn-sm", disabled: filtered.length === 0 || !filtered.some((name) => selected.includes(name)), onClick: () => onChange(removeToolNames(selected, filtered)), children: t('toolFilterDeselectAll') })] }), filtered.length === 0 ? (_jsx("span", { className: "sd-note", children: t('toolFilterNoMatch') })) : (_jsx("div", { className: "sd-toolset-grid", children: filtered.map((name) => (_jsxs("label", { className: "sd-tool", children: [_jsx("input", { type: "checkbox", checked: selected.includes(name), onChange: () => onChange(toggleToolName(selected, name)) }), _jsx("span", { className: "sd-tool-name", children: name })] }, name))) }))] })) : null, _jsx("span", { className: "sd-note", children: isDefault
                    ? (selected.length === 0 ? t('mainAgentToolFilterNone') : t('mainAgentToolFilterHint'))
                    : (selected.length === 0 ? t('toolFilterNone') : t('toolFilterHint')) })] }));
}
//# sourceMappingURL=ToolSetPicker.js.map