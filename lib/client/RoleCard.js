import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** One role template card: read-only summary plus an inline editor.
 * Provider/model/effort selects cascade from the model catalog; writes go
 * through the controller as path ops, and failures return a localized message. */
import { useState } from 'react';
import { ToolSetPicker } from './ToolSetPicker.js';
import { cardStyle, dangerButtonStyle, fieldLabelStyle, ghostButtonStyle, primaryButtonStyle, rowStyle, selectStyle, textAreaStyle, textInputStyle, token, } from './ui.js';
function effortsFor(groups, provider, model) {
    if (!provider || !model)
        return [];
    const group = groups.find((g) => g.id === provider);
    const entry = group?.models.find((m) => m.id === model);
    return entry?.reasoning?.efforts ?? [];
}
export function RoleCard({ id, role, isDefault, groups, tools, t, onSave, onDelete, onSetDefault }) {
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState(undefined);
    const [draft, setDraft] = useState({
        displayName: role.displayName,
        description: role.description,
        persona: role.persona ?? '',
        provider: role.provider ?? '',
        model: role.model ?? '',
        reasoningEffort: role.reasoningEffort ?? '',
        toolFilter: { allow: role.toolFilter?.allow ?? [] },
    });
    const provider = draft.provider || role.provider;
    const model = draft.model || role.model;
    const modelOptions = provider ? (groups.find((g) => g.id === provider)?.models ?? []) : [];
    const effortOptions = effortsFor(groups, provider, model);
    const save = async () => {
        setBusy(true);
        setFailure(undefined);
        try {
            const message = await onSave(draft);
            if (message !== undefined) {
                setFailure(message);
                return;
            }
            setEditing(false);
        }
        finally {
            setBusy(false);
        }
    };
    const remove = async () => {
        if (!window.confirm(t('confirmDeleteRole').replace('{id}', id)))
            return;
        setBusy(true);
        setFailure(undefined);
        try {
            const message = await onDelete();
            if (message !== undefined)
                setFailure(message);
        }
        finally {
            setBusy(false);
        }
    };
    const setField = (field, value) => {
        setDraft((d) => ({ ...d, [field]: value }));
    };
    const allowList = draft.toolFilter?.allow ?? [];
    if (editing) {
        return (_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 8 }, children: [_jsx("strong", { style: { color: token.labelPrimary, fontSize: 14 }, children: t('roleDisplayName') }), isDefault ? _jsx("span", { style: { color: token.accent, fontSize: 12 }, children: t('defaultRoleBadge') }) : null] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('roleDisplayName') }), _jsx("input", { style: textInputStyle, value: draft.displayName, placeholder: t('displayNamePlaceholder'), onChange: (e) => setField('displayName', e.target.value) })] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('roleDescription') }), _jsx("textarea", { style: textAreaStyle, value: draft.description, placeholder: t('descriptionPlaceholder'), onChange: (e) => setField('description', e.target.value) })] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('rolePersona') }), _jsx("textarea", { style: textAreaStyle, value: draft.persona, placeholder: t('personaPlaceholder'), onChange: (e) => setField('persona', e.target.value) })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }, children: [_jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('provider') }), _jsxs("select", { style: selectStyle, value: draft.provider, disabled: groups.length === 0, onChange: (e) => setField('provider', e.target.value), children: [_jsx("option", { value: "", children: "\u2014" }), groups.map((g) => (_jsx("option", { value: g.id, children: g.name }, g.id)))] })] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('model') }), _jsxs("select", { style: selectStyle, value: draft.model, disabled: modelOptions.length === 0, onChange: (e) => setField('model', e.target.value), children: [_jsx("option", { value: "", children: "\u2014" }), modelOptions.map((m) => (_jsx("option", { value: m.id, children: m.name }, m.id)))] })] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('reasoningEffort') }), _jsxs("select", { style: selectStyle, value: draft.reasoningEffort, disabled: effortOptions.length === 0, onChange: (e) => setField('reasoningEffort', e.target.value), children: [_jsx("option", { value: "", children: "\u2014" }), effortOptions.map((e) => (_jsx("option", { value: e.id, children: e.name }, e.id)))] })] })] }), _jsx("div", { style: rowStyle, children: _jsx(ToolSetPicker, { tools: tools, selected: allowList, t: t, onChange: (allow) => setDraft((d) => ({ ...d, toolFilter: { allow } })) }) }), failure !== undefined ? _jsx("div", { style: { color: token.danger, fontSize: 12 }, children: failure }) : null, _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { style: primaryButtonStyle, disabled: busy, onClick: save, children: t('save') }), _jsx("button", { style: ghostButtonStyle, disabled: busy, onClick: () => setEditing(false), children: t('cancel') })] })] }));
    }
    return (_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }, children: [_jsx("strong", { style: { color: token.labelPrimary, fontSize: 14 }, children: role.displayName || id }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("span", { style: { color: token.labelTertiary, fontSize: 12, fontVariantNumeric: 'tabular-nums' }, children: id }), isDefault ? _jsx("span", { style: { color: token.accent, fontSize: 12 }, children: t('defaultRoleBadge') }) : null] })] }), role.description ? (_jsx("p", { style: { margin: 0, color: token.labelSecondary, fontSize: 13, lineHeight: '18px' }, children: role.description })) : null, _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: [_jsx(Metadata, { label: t('provider'), value: role.provider }), _jsx(Metadata, { label: t('model'), value: role.model }), _jsx(Metadata, { label: t('reasoningEffort'), value: role.reasoningEffort }), role.persona ? _jsx(Metadata, { label: t('persona'), value: role.persona }) : null, role.toolFilter?.allow?.length ? (_jsx(Metadata, { label: t('toolFilter'), value: role.toolFilter.allow.join(', ') })) : null] }), failure !== undefined ? _jsx("div", { style: { color: token.danger, fontSize: 12 }, children: failure }) : null, _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { style: ghostButtonStyle, disabled: busy, onClick: () => setEditing(true), children: t('edit') }), _jsx("button", { style: ghostButtonStyle, disabled: busy || isDefault, onClick: () => (void onSetDefault(), undefined), children: t('setDefaultRole') }), _jsx("button", { style: dangerButtonStyle, disabled: busy, onClick: remove, children: t('deleteRole') })] })] }));
}
function Metadata({ label, value }) {
    if (!value)
        return null;
    return (_jsxs("span", { style: { color: token.labelSecondary, fontSize: 12 }, children: [label, ": ", _jsx("span", { style: { color: token.labelPrimary }, children: value })] }));
}
//# sourceMappingURL=RoleCard.js.map