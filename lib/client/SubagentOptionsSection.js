import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Subagent Director settings section: the default-model card
 * plus the role-template cards. The slot outlet delivers the inject face flat;
 * this component guards for a not-yet-injected render and then
 * renders its content column from the live snapshot.
 *
 * State lives in the page store (SubagentOptionsStore); writes travel as
 * path ops through settings.mutate with an optimistic-revision lock.
 */
import { useEffect, useRef, useState } from 'react';
import { modelsForProvider, providerNames } from './allowed-routes.js';
import { validateRoleSubmission } from './store-logic.js';
import { RoleCard } from './RoleCard.js';
import { RoleFormFields } from './RoleFormFields.js';
import { cardStyle, fieldLabelStyle, ghostButtonStyle, primaryButtonStyle, rowStyle, sectionWidth, selectStyle, textInputStyle, token, } from './ui.js';
/**
 * Render the Subagent Director settings section content column.
 * @param props - slot-delivered injected dependencies.
 * @returns the section, or null while the shell has not injected yet.
 */
export function SubagentOptionsSection(props) {
    const { controller, useSnapshot, t, useSessions } = props;
    if (controller === undefined || useSnapshot === undefined || t === undefined)
        return null;
    return _jsx(Loaded, { injected: { controller, useSnapshot, t, useSessions } });
}
function Loaded({ injected }) {
    const { controller, t } = injected;
    const state = injected.useSnapshot((s) => s);
    const sessionId = injected.useSessions !== undefined ? injected.useSessions((s) => s.current) : undefined;
    const lastSessionRef = useRef(undefined);
    useEffect(() => {
        if (state.status === 'idle' && !state.loading)
            void controller.load(sessionId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.status, state.loading, sessionId]);
    useEffect(() => {
        if (state.status === 'ready' && sessionId !== lastSessionRef.current) {
            lastSessionRef.current = sessionId;
            void controller.load(sessionId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, state.status]);
    if (state.status === 'error') {
        return (_jsxs("div", { style: sectionWidth, children: [_jsxs("p", { style: { color: token.danger, fontSize: 13 }, children: [t('loadError'), ": ", state.error ?? ''] }), _jsx("button", { style: ghostButtonStyle, onClick: () => void controller.load(), children: t('retry') })] }));
    }
    if (state.status !== 'ready') {
        return (_jsx("div", { style: sectionWidth, children: _jsx("p", { style: { color: token.labelSecondary, fontSize: 13 }, children: t('sectionIntro') }) }));
    }
    const section = state.section;
    const writable = state.writable;
    const roles = section?.roles ?? {};
    const entries = Object.entries(roles);
    const routes = state.allowedRoutes;
    const tools = state.tools;
    return (_jsxs("div", { style: sectionWidth, children: [_jsxs("div", { style: {
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: token.bgLayer3,
                    border: '1px solid ' + token.border,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                }, children: [_jsx("div", { style: { color: token.labelPrimary, fontSize: 14, fontWeight: 600 }, children: t('nav') }), _jsx("p", { style: { margin: 0, color: token.labelSecondary, fontSize: 13, lineHeight: '20px' }, children: t('sectionIntro') })] }), _jsx(DefaultModelRow, { controller: controller, routes: routes, modelSelectionEnabled: state.modelSelectionEnabled, writable: writable, current: {
                    provider: section?.defaultProvider,
                    model: section?.defaultModel,
                    reasoningEffort: section?.defaultReasoningEffort,
                }, t: t }), _jsx(RolesBlock, { controller: controller, routes: routes, tools: tools, writable: writable, roles: entries, defaultRole: section?.defaultRole, t: t })] }));
}
/** The default-model row: provider → model → reasoning-effort cascade + restore. */
function DefaultModelRow({ controller, routes, modelSelectionEnabled, writable, current, t }) {
    const [draft, setDraft] = useState({
        provider: current.provider ?? '',
        model: current.model ?? '',
        reasoningEffort: current.reasoningEffort ?? '',
    });
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState(undefined);
    const [done, setDone] = useState(false);
    useEffect(() => {
        if (busy)
            return;
        setDraft({
            provider: current.provider ?? '',
            model: current.model ?? '',
            reasoningEffort: current.reasoningEffort ?? '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current.provider, current.model, current.reasoningEffort]);
    const provider = draft.provider;
    const providers = providerNames(routes);
    const modelOptions = provider ? modelsForProvider(routes, provider) : [];
    const noAllowed = routes.length === 0;
    const save = async () => {
        setBusy(true);
        setFailure(undefined);
        try {
            const message = await controller.setDefaultModel({
                provider: draft.provider || undefined,
                model: draft.model || undefined,
                reasoningEffort: draft.reasoningEffort || undefined,
            });
            if (message !== undefined) {
                setFailure(message);
                return;
            }
            setDone(true);
        }
        finally {
            setBusy(false);
        }
    };
    const restore = async () => {
        setBusy(true);
        setFailure(undefined);
        try {
            const message = await controller.restoreDefaults();
            if (message !== undefined) {
                setFailure(message);
                return;
            }
            setDone(true);
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, children: [_jsxs("div", { children: [_jsx("strong", { style: { color: token.labelPrimary, fontSize: 15, fontWeight: 600 }, children: t('defaultsHeading') }), _jsx("p", { style: { margin: '4px 0 0', color: token.labelSecondary, fontSize: 13, lineHeight: '18px' }, children: t('defaultsHint') })] }), _jsx("button", { style: ghostButtonStyle, disabled: !writable || busy, onClick: () => void restore(), children: t('restoreDefaults') })] }), noAllowed ? (_jsx("p", { style: { margin: 0, color: token.danger, fontSize: 12, lineHeight: '16px' }, children: t('noAllowedModels') })) : null, _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }, children: [_jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('defaultProvider') }), noAllowed ? (_jsx("div", { style: { color: token.labelSecondary, fontSize: 12 }, children: "\u2014" })) : (_jsxs("select", { style: selectStyle, value: draft.provider, disabled: !writable || providers.length === 0, onChange: (e) => setDraft((d) => ({ provider: e.target.value, model: '', reasoningEffort: '' })), children: [_jsx("option", { value: "", children: "\u2014" }), providers.map((id) => (_jsx("option", { value: id, children: id }, id)))] }))] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('defaultModel') }), noAllowed ? (_jsx("div", { style: { color: token.labelSecondary, fontSize: 12 }, children: "\u2014" })) : (_jsxs("select", { style: selectStyle, value: draft.model, disabled: !writable || modelOptions.length === 0, onChange: (e) => setDraft((d) => ({ ...d, model: e.target.value, reasoningEffort: '' })), children: [_jsx("option", { value: "", children: "\u2014" }), modelOptions.map((m) => (_jsx("option", { value: m.model, children: m.label }, m.model)))] }))] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('defaultReasoningEffort') }), _jsx("input", { style: textInputStyle, value: draft.reasoningEffort, disabled: !writable, placeholder: modelSelectionEnabled ? '' : '(advisory)', onChange: (e) => setDraft((d) => ({ ...d, reasoningEffort: e.target.value })) })] })] }), failure !== undefined ? _jsx("div", { style: { color: token.danger, fontSize: 12 }, children: failure }) : null, done ? _jsx("div", { style: { color: token.accent, fontSize: 12, fontWeight: 500 }, children: t('restoreDone') }) : null, _jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }, children: _jsx("button", { style: primaryButtonStyle, disabled: !writable || busy, onClick: () => void save(), children: t('save') }) })] }));
}
/** The role-template roster: cards plus an inline add form. */
export function RolesBlock({ controller, routes, tools, writable, roles, defaultRole, t }) {
    const [adding, setAdding] = useState(false);
    const [customId, setCustomId] = useState('');
    const [idError, setIdError] = useState(undefined);
    const [draft, setDraft] = useState({
        displayName: '',
        description: '',
        persona: '',
        provider: '',
        model: '',
        reasoningEffort: '',
        toolFilter: { allow: [] },
    });
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState(undefined);
    const beginAdd = () => {
        setCustomId('');
        setIdError(undefined);
        setDraft({ displayName: '', description: '', persona: '', provider: '', model: '', reasoningEffort: '', toolFilter: { allow: [] } });
        setFailure(undefined);
        setAdding(true);
    };
    const saveAdd = async () => {
        const existing = new Set(roles.map(([id]) => id));
        const validation = validateRoleSubmission(customId, draft.displayName, existing, undefined, draft.description);
        if (!validation.ok) {
            setIdError(t(validation.errorKey));
            return;
        }
        const id = validation.id;
        setBusy(true);
        setFailure(undefined);
        try {
            const message = await controller.addRole(id, draft);
            if (message !== undefined) {
                setFailure(message);
                return;
            }
            setAdding(false);
        }
        finally {
            setBusy(false);
        }
    };
    const existingRoleIds = new Set(roles.map(([id]) => id));
    return (_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }, children: [_jsxs("div", { children: [_jsx("strong", { style: { color: token.labelPrimary, fontSize: 15, fontWeight: 600 }, children: t('rolesHeading') }), _jsx("p", { style: { margin: '4px 0 0', color: token.labelSecondary, fontSize: 13, lineHeight: '18px' }, children: t('rolesHint') })] }), _jsx("button", { style: ghostButtonStyle, disabled: !writable || adding, onClick: beginAdd, children: t('addRole') })] }), adding ? (_jsxs("div", { style: { border: '1px dashed ' + token.border, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: token.bgLayer1 }, children: [_jsx(RoleFormFields, { id: customId, onIdChange: (val) => {
                            setCustomId(val);
                            if (idError)
                                setIdError(undefined);
                        }, idError: idError, draft: draft, onDraftChange: setDraft, routes: routes, tools: tools, t: t, disabled: !writable || busy, isDefault: false }), failure !== undefined ? _jsx("div", { style: { color: token.danger, fontSize: 12 }, children: failure }) : null, _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 4 }, children: [_jsx("button", { style: primaryButtonStyle, disabled: !writable || busy, onClick: () => void saveAdd(), children: t('addRole') }), _jsx("button", { style: ghostButtonStyle, disabled: busy, onClick: () => setAdding(false), children: t('cancel') })] })] })) : null, roles.length === 0 && !adding ? (_jsx("div", { style: { padding: '24px 16px', textAlign: 'center', borderRadius: 8, border: '1px dashed ' + token.border }, children: _jsx("p", { style: { margin: 0, color: token.labelSecondary, fontSize: 13 }, children: t('emptyRoles') }) })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: roles.map(([id, role]) => (_jsx(RoleCard, { id: id, role: role, isDefault: defaultRole === id, routes: routes, tools: tools, existingRoleIds: existingRoleIds, writable: writable, t: t, onSave: (newId, d) => {
                        if (newId !== id) {
                            return controller.renameRole(id, newId, role, d);
                        }
                        return controller.updateRole(id, role, d);
                    }, onDelete: () => controller.removeRole(id), onSetDefault: () => controller.setDefaultRole(id) }, id))) }))] }));
}
//# sourceMappingURL=SubagentOptionsSection.js.map