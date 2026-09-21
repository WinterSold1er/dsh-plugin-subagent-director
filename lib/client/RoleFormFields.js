import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { modelsForProvider, providerNames } from './allowed-routes.js';
import { ToolSetPicker } from './ToolSetPicker.js';
import { badgeDotStyle, calloutBannerStyle, fieldLabelStyle, rowStyle, selectStyle, textAreaStyle, textInputStyle, token, } from './ui.js';
/**
 * Pure cascading helper: updates provider and resets model if not supported by the new provider.
 */
export function cascadeProviderChange(draft, newProvider, routes) {
    const modelOptions = newProvider ? modelsForProvider(routes, newProvider) : [];
    const modelValid = modelOptions.some((m) => m.model === draft.model);
    return {
        ...draft,
        provider: newProvider,
        model: modelValid ? draft.model : '',
    };
}
export function RoleFormFields({ id, onIdChange, idError, draft, onDraftChange, routes, tools, t, disabled = false, idDisabled = false, isDefault = false, }) {
    const providers = providerNames(routes);
    const modelOptions = draft.provider ? modelsForProvider(routes, draft.provider) : [];
    const allowList = draft.toolFilter?.allow ?? [];
    const setField = (field, value) => {
        onDraftChange({ ...draft, [field]: value });
    };
    const handleProviderChange = (newProvider) => {
        onDraftChange(cascadeProviderChange(draft, newProvider, routes));
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('roleId') }), _jsx("input", { style: textInputStyle, value: id, placeholder: t('roleIdPlaceholder'), disabled: disabled || idDisabled, onChange: (e) => onIdChange(e.target.value) }), idError !== undefined ? (_jsx("div", { style: { color: token.danger, fontSize: 12 }, children: idError })) : null] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('roleDisplayName') }), _jsx("input", { style: textInputStyle, value: draft.displayName, placeholder: t('displayNamePlaceholder'), disabled: disabled, onChange: (e) => setField('displayName', e.target.value) })] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('roleDescription') }), _jsx("textarea", { style: textAreaStyle, value: draft.description, placeholder: t('descriptionPlaceholder'), disabled: disabled, onChange: (e) => setField('description', e.target.value) })] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('rolePersona') }), _jsx("textarea", { style: textAreaStyle, value: draft.persona ?? '', placeholder: t('personaPlaceholder'), disabled: disabled, onChange: (e) => setField('persona', e.target.value) })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }, children: [_jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('provider') }), _jsxs("select", { style: selectStyle, value: draft.provider ?? '', disabled: disabled || providers.length === 0, onChange: (e) => handleProviderChange(e.target.value), children: [_jsx("option", { value: "", children: "\u2014" }), providers.map((pId) => (_jsx("option", { value: pId, children: pId }, pId)))] })] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('model') }), _jsxs("select", { style: selectStyle, value: draft.model ?? '', disabled: disabled || modelOptions.length === 0, onChange: (e) => setField('model', e.target.value), children: [_jsx("option", { value: "", children: "\u2014" }), modelOptions.map((m) => (_jsx("option", { value: m.model, children: m.label }, m.model)))] })] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('reasoningEffort') }), _jsx("input", { style: textInputStyle, value: draft.reasoningEffort ?? '', placeholder: t('reasoningEffortAdvisory'), disabled: disabled, onChange: (e) => setField('reasoningEffort', e.target.value) })] })] }), _jsxs("div", { style: rowStyle, children: [isDefault ? (_jsx("div", { style: calloutBannerStyle, children: _jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }, children: [_jsxs("div", { style: { color: token.labelPrimary, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("span", { style: badgeDotStyle }), t('mainAgentCalloutTitle')] }), _jsx("div", { style: { color: token.labelSecondary, fontSize: 12, lineHeight: '18px' }, children: t('mainAgentCalloutDesc') })] }) })) : null, _jsx(ToolSetPicker, { tools: tools, selected: allowList, t: t, isDefault: isDefault, onChange: (allow) => onDraftChange({ ...draft, toolFilter: { ...draft.toolFilter, allow } }) })] })] }));
}
//# sourceMappingURL=RoleFormFields.js.map