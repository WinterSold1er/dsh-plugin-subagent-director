import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** One role template card: read-only summary plus an inline editor.
 * Provider/model picks are limited to the routes authorized in the official
 * Subagent model-selection list; reasoning effort is a free-text field (the
 * alpha.4 client has no effort catalog). Writes go through the controller as
 * path ops, and failures return a localized message. */
import { useState } from 'react';
import { validateRoleSubmission } from './store-logic.js';
import { RoleFormFields } from './RoleFormFields.js';
import { badgeDotStyle, dangerButtonStyle, ghostButtonStyle, idBadgeStyle, mainAgentBadgeStyle, metaChipStyle, primaryButtonStyle, roleCardDefaultStyle, roleCardStyle, token, } from './ui.js';
export function RoleCard({ id, role, isDefault, routes, tools, existingRoleIds, writable, initialEditing = false, t, onSave, onDelete, onSetDefault, }) {
    const [editing, setEditing] = useState(initialEditing);
    const [busy, setBusy] = useState(false);
    const [cardId, setCardId] = useState(id);
    const [idError, setIdError] = useState(undefined);
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
    const beginEdit = () => {
        setCardId(id);
        setIdError(undefined);
        setFailure(undefined);
        setDraft({
            displayName: role.displayName,
            description: role.description,
            persona: role.persona ?? '',
            provider: role.provider ?? '',
            model: role.model ?? '',
            reasoningEffort: role.reasoningEffort ?? '',
            toolFilter: { allow: role.toolFilter?.allow ?? [] },
        });
        setEditing(true);
    };
    const save = async () => {
        const validation = validateRoleSubmission(cardId, draft.displayName, existingRoleIds, id, draft.description);
        if (!validation.ok) {
            setIdError(t(validation.errorKey));
            return;
        }
        const targetId = validation.id;
        setBusy(true);
        setFailure(undefined);
        try {
            const message = await onSave(targetId, draft);
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
    if (editing) {
        return (_jsxs("div", { style: isDefault ? roleCardDefaultStyle : roleCardStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, children: [_jsx("strong", { style: { color: token.labelPrimary, fontSize: 15, fontWeight: 600 }, children: t('roleDisplayName') }), isDefault ? (_jsxs("span", { style: mainAgentBadgeStyle, children: [_jsx("span", { style: badgeDotStyle }), t('defaultRoleBadge')] })) : null] }), _jsx(RoleFormFields, { id: cardId, onIdChange: (newId) => {
                        setCardId(newId);
                        if (idError)
                            setIdError(undefined);
                    }, idError: idError, draft: draft, onDraftChange: (newDraft) => {
                        setDraft(newDraft);
                        if (idError)
                            setIdError(undefined);
                    }, routes: routes, tools: tools, t: t, disabled: !writable || busy, isDefault: isDefault }), failure !== undefined ? _jsx("div", { style: { color: token.danger, fontSize: 12 }, children: failure }) : null, _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 4 }, children: [_jsx("button", { style: primaryButtonStyle, disabled: !writable || busy, onClick: () => void save(), children: t('save') }), _jsx("button", { style: ghostButtonStyle, disabled: busy, onClick: () => setEditing(false), children: t('cancel') })] })] }));
    }
    return (_jsxs("div", { style: isDefault ? roleCardDefaultStyle : roleCardStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, children: [_jsx("strong", { style: { color: token.labelPrimary, fontSize: 15, fontWeight: 600 }, children: role.displayName || id }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: idBadgeStyle, children: id }), isDefault ? (_jsxs("span", { style: mainAgentBadgeStyle, children: [_jsx("span", { style: badgeDotStyle }), t('defaultRoleBadge')] })) : null] })] }), role.description ? (_jsx("p", { style: { margin: 0, color: token.labelSecondary, fontSize: 13, lineHeight: '19px' }, children: role.description })) : null, _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: [_jsx(Metadata, { label: t('provider'), value: role.provider }), _jsx(Metadata, { label: t('model'), value: role.model }), _jsx(Metadata, { label: t('reasoningEffort'), value: role.reasoningEffort }), role.persona ? _jsx(Metadata, { label: t('persona'), value: role.persona }) : null, isDefault ? (role.toolFilter?.allow?.length ? (_jsx(Metadata, { label: t('mainAgentTools'), value: role.toolFilter.allow.join(', ') })) : (_jsx(Metadata, { label: t('mainAgentTools'), value: t('mainAgentDefaultReadOnly') }))) : (role.toolFilter?.allow?.length ? (_jsx(Metadata, { label: t('toolFilter'), value: role.toolFilter.allow.join(', ') })) : null)] }), failure !== undefined ? _jsx("div", { style: { color: token.danger, fontSize: 12 }, children: failure }) : null, _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 2 }, children: [_jsx("button", { style: ghostButtonStyle, disabled: !writable || busy, onClick: beginEdit, children: t('edit') }), _jsx("button", { style: ghostButtonStyle, disabled: !writable || busy || isDefault, onClick: () => (void onSetDefault(), undefined), children: t('setDefaultRole') }), _jsx("button", { style: dangerButtonStyle, disabled: !writable || busy, onClick: remove, children: t('deleteRole') })] })] }));
}
function Metadata({ label, value }) {
    if (!value)
        return null;
    return (_jsxs("span", { style: metaChipStyle, children: [_jsxs("span", { children: [label, ":"] }), _jsx("strong", { style: { color: token.labelPrimary, fontWeight: 500 }, children: value })] }));
}
//# sourceMappingURL=RoleCard.js.map