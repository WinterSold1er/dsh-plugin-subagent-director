import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Tool-set picker shared by the role editor and the add-role form.
 *
 * A compact row that expands into: a search box, select-all / deselect-all
 * (scoped to the CURRENT filter — tools hidden by the search are never
 * touched), a live "selected / total" count, and a checkbox grid of the
 * filtered tools. Collapsed, it shows the label, the count, and a
 * chevron toggle so a large catalog (hundreds of MCP tools) stays compact.
 */
import { useMemo, useState } from 'react';
import { addToolNames, filterToolNames, removeToolNames, toggleToolName, } from './toolset-logic.js';
import { fieldLabelStyle, ghostButtonStyle, textInputStyle, token } from './ui.js';
const style = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    head: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    count: {
        color: token.labelTertiary,
        fontSize: 11,
        lineHeight: '16px',
    },
    search: {
        ...textInputStyle,
        height: 26,
        fontSize: 12,
    },
    grid: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        maxHeight: 260,
        overflowY: 'auto',
        border: '1px solid ' + token.border,
        borderRadius: 6,
        padding: '6px 8px',
        background: token.bgLayer1,
    },
    item: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        color: token.labelSecondary,
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: 4,
    },
    hint: {
        color: token.labelTertiary,
        fontSize: 11,
        lineHeight: '15px',
    },
    toggle: {
        ...ghostButtonStyle,
        height: 24,
        fontSize: 12,
        padding: '0 8px',
    },
};
/** Render the searchable, select-all capable tool-set picker. */
export function ToolSetPicker({ tools, selected, onChange, t }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(true);
    const filtered = useMemo(() => filterToolNames(tools, query), [tools, query]);
    const filteredSet = useMemo(() => new Set(filtered), [filtered]);
    const allFilteredSelected = filtered.length > 0 && filtered.every((name) => selected.includes(name));
    if (tools.length === 0) {
        return (_jsxs("div", { style: style.root, children: [_jsx("label", { style: fieldLabelStyle, children: t('toolFilter') }), _jsx("span", { style: style.hint, children: t('toolFilterEmpty') })] }));
    }
    return (_jsxs("div", { style: style.root, children: [_jsxs("div", { style: style.head, children: [_jsx("label", { style: fieldLabelStyle, children: t('toolFilter') }), _jsx("span", { style: style.count, children: t('toolFilterCount', { count: selected.length, total: tools.length }) }), _jsx("button", { type: "button", style: style.toggle, onClick: () => setOpen((o) => !o), children: open ? t('toolFilterCollapse') : t('toolFilterExpand') })] }), open ? (_jsxs(_Fragment, { children: [_jsx("input", { style: style.search, value: query, placeholder: t('toolFilterSearch'), onChange: (e) => setQuery(e.target.value) }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { type: "button", style: ghostButtonStyle, disabled: filtered.length === 0 || allFilteredSelected, onClick: () => onChange(addToolNames(selected, filtered)), children: t('toolFilterSelectAll') }), _jsx("button", { type: "button", style: ghostButtonStyle, disabled: filtered.length === 0 || !filtered.some((name) => selected.includes(name)), onClick: () => onChange(removeToolNames(selected, filtered)), children: t('toolFilterDeselectAll') })] }), filtered.length === 0 ? (_jsx("span", { style: style.hint, children: t('toolFilterNoMatch') })) : (_jsx("div", { style: style.grid, children: filtered.map((name) => (_jsxs("label", { style: style.item, children: [_jsx("input", { type: "checkbox", checked: selected.includes(name), onChange: () => onChange(toggleToolName(selected, name)) }), name] }, name))) }))] })) : null, _jsx("span", { style: style.hint, children: selected.length === 0 ? t('toolFilterNone') : t('toolFilterHint') })] }));
}
//# sourceMappingURL=ToolSetPicker.js.map