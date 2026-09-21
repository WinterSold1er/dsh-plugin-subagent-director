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
        gap: 8,
    },
    head: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    count: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 6px',
        borderRadius: 4,
        background: token.bgLayer1,
        border: '1px solid ' + token.border,
        color: token.labelTertiary,
        fontSize: 11,
        lineHeight: '14px',
    },
    search: {
        ...textInputStyle,
        height: 28,
        fontSize: 12,
        borderRadius: 6,
    },
    actionsRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    actionBtn: {
        ...ghostButtonStyle,
        height: 24,
        fontSize: 11,
        padding: '0 8px',
        borderRadius: 6,
    },
    grid: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        maxHeight: 240,
        overflowY: 'auto',
        border: '1px solid ' + token.border,
        borderRadius: 8,
        padding: '6px 8px',
        background: token.bgLayer1,
    },
    item: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: token.labelSecondary,
        cursor: 'pointer',
        padding: '3px 6px',
        borderRadius: 5,
        userSelect: 'none',
    },
    hint: {
        color: token.labelTertiary,
        fontSize: 11,
        lineHeight: '16px',
    },
    toggle: {
        ...ghostButtonStyle,
        height: 24,
        fontSize: 11,
        padding: '0 8px',
        borderRadius: 6,
        marginLeft: 'auto',
    },
};
/** Render the searchable, select-all capable tool-set picker. */
export function ToolSetPicker({ tools, selected, onChange, t, isDefault = false }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(true);
    const filtered = useMemo(() => filterToolNames(tools, query), [tools, query]);
    const allFilteredSelected = filtered.length > 0 && filtered.every((name) => selected.includes(name));
    if (tools.length === 0) {
        return (_jsxs("div", { style: style.root, children: [_jsx("label", { style: fieldLabelStyle, children: t('toolFilter') }), _jsx("span", { style: style.hint, children: t('toolFilterEmpty') })] }));
    }
    return (_jsxs("div", { style: style.root, children: [_jsxs("div", { style: style.head, children: [_jsx("label", { style: fieldLabelStyle, children: t('toolFilter') }), _jsx("span", { style: style.count, children: t('toolFilterCount', { count: selected.length, total: tools.length }) }), _jsx("button", { type: "button", style: style.toggle, onClick: () => setOpen((o) => !o), children: open ? t('toolFilterCollapse') : t('toolFilterExpand') })] }), open ? (_jsxs(_Fragment, { children: [_jsx("input", { style: style.search, value: query, placeholder: t('toolFilterSearch'), onChange: (e) => setQuery(e.target.value) }), _jsxs("div", { style: style.actionsRow, children: [_jsx("button", { type: "button", style: style.actionBtn, disabled: filtered.length === 0 || allFilteredSelected, onClick: () => onChange(addToolNames(selected, filtered)), children: t('toolFilterSelectAll') }), _jsx("button", { type: "button", style: style.actionBtn, disabled: filtered.length === 0 || !filtered.some((name) => selected.includes(name)), onClick: () => onChange(removeToolNames(selected, filtered)), children: t('toolFilterDeselectAll') })] }), filtered.length === 0 ? (_jsx("span", { style: style.hint, children: t('toolFilterNoMatch') })) : (_jsx("div", { style: style.grid, children: filtered.map((name) => (_jsxs("label", { style: style.item, children: [_jsx("input", { type: "checkbox", checked: selected.includes(name), onChange: () => onChange(toggleToolName(selected, name)) }), _jsx("span", { children: name })] }, name))) }))] })) : null, _jsx("span", { style: style.hint, children: isDefault
                    ? (selected.length === 0 ? t('mainAgentToolFilterNone') : t('mainAgentToolFilterHint'))
                    : (selected.length === 0 ? t('toolFilterNone') : t('toolFilterHint')) })] }));
}
//# sourceMappingURL=ToolSetPicker.js.map