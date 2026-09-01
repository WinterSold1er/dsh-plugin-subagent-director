import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Subagent Director settings section (design section 9): the default-model row
 * plus the role-template cards. The slot outlet erases the share boundary and
 * delivers the inject face flat (PropsRuntime<'settings.section'> renderer is
 * the DSH shell); this component guards for a not-yet-injected render and then
 * renders its content column from the live snapshot.
 *
 * State lives in the page store (SubagentOptionsStore); every write travels as
 * path ops through settings.mutate with an optimistic-revision lock, so the
 * section only ever echoes the acknowledge-and-reload outcome. Failures return
 * a localized message that the save/delete/restore controls surface inline.
 */
import { useEffect, useRef, useState } from 'react';
import { roleIdFromName } from './store-logic.js';
import { RoleCard } from './RoleCard.js';
import { ToolSetPicker } from './ToolSetPicker.js';
import { cardStyle, fieldLabelStyle, ghostButtonStyle, primaryButtonStyle, rowStyle, sectionWidth, selectStyle, textAreaStyle, textInputStyle, token, } from './ui.js';
/** Derive reasoning-effort options from the catalog for an exact provider+model. */
function effortsFor(groups, provider, model) {
    if (!provider || !model)
        return [];
    const group = groups.find((g) => g.id === provider);
    const entry = group?.models.find((m) => m.id === model);
    return entry?.reasoning?.efforts ?? [];
}
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
    // Current session id drives the tool catalog: preset tools (bash/read/write)
    // live in the agent scope, so the Host enumerates that agent's view.
    const sessionId = injected.useSessions !== undefined ? injected.useSessions((s) => s.current) : undefined;
    const lastSessionRef = useRef(undefined);
    // Kick the first load once when the page mounts (post-load refreshes ride
    // the pushed invalidations wired in apply()).
    useEffect(() => {
        if (state.status === 'idle' && !state.loading)
            void controller.load(sessionId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.status, state.loading, sessionId]);
    // Refresh the tool catalog when the current session changes (a different
    // agent may expose a different tool set), without re-mounting the page.
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
        return _jsx("div", { style: sectionWidth, children: _jsx("p", { style: { color: token.labelSecondary, fontSize: 13 }, children: t('sectionIntro') }) });
    }
    const section = state.section;
    const writable = state.writable;
    const roles = section?.roles ?? {};
    const entries = Object.entries(roles);
    const groups = state.models;
    const tools = state.tools;
    return (_jsxs("div", { style: sectionWidth, children: [_jsx("p", { style: { margin: 0, color: token.labelSecondary, fontSize: 13, lineHeight: '18px' }, children: t('sectionIntro') }), _jsx(DefaultModelRow, { controller: controller, groups: groups, writable: writable, current: {
                    provider: section?.defaultProvider,
                    model: section?.defaultModel,
                    reasoningEffort: section?.defaultReasoningEffort,
                }, t: t }), _jsx(EnforcementRow, { controller: controller, writable: writable, current: section?.orchestrateEnforcement ?? 'strict', t: t }), _jsx(RolesBlock, { controller: controller, groups: groups, tools: tools, writable: writable, roles: entries, defaultRole: section?.defaultRole, t: t })] }));
}
/** The default-model row: provider → model → reasoning-effort cascade + restore. */
function DefaultModelRow({ controller, groups, writable, current, t }) {
    const [draft, setDraft] = useState({
        provider: current.provider ?? '',
        model: current.model ?? '',
        reasoningEffort: current.reasoningEffort ?? '',
    });
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState(undefined);
    const [done, setDone] = useState(false);
    // Reflect a fresh server snapshot into the draft (a pushed invalidation or a
    // restore reload; a user mid-edit is not clobbered because the section owns
    // the only editor for these three fields).
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
    const model = draft.model;
    const modelOptions = provider ? (groups.find((g) => g.id === provider)?.models ?? []) : [];
    const effortOptions = effortsFor(groups, provider, model);
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
    return (_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }, children: [_jsx("strong", { style: { color: token.labelPrimary, fontSize: 14 }, children: t('defaultsHeading') }), _jsx("button", { style: ghostButtonStyle, disabled: !writable || busy, onClick: () => void restore(), children: t('restoreDefaults') })] }), _jsx("p", { style: { margin: 0, color: token.labelSecondary, fontSize: 13, lineHeight: '18px' }, children: t('defaultsHint') }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }, children: [_jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('defaultProvider') }), _jsxs("select", { style: selectStyle, value: draft.provider, disabled: !writable || groups.length === 0, onChange: (e) => setDraft((d) => ({ provider: e.target.value, model: '', reasoningEffort: '' })), children: [_jsx("option", { value: "", children: "\u2014" }), groups.map((g) => (_jsx("option", { value: g.id, children: g.name }, g.id)))] })] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('defaultModel') }), _jsxs("select", { style: selectStyle, value: draft.model, disabled: !writable || modelOptions.length === 0, onChange: (e) => setDraft((d) => ({ ...d, model: e.target.value, reasoningEffort: '' })), children: [_jsx("option", { value: "", children: "\u2014" }), modelOptions.map((m) => (_jsx("option", { value: m.id, children: m.name }, m.id)))] })] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('defaultReasoningEffort') }), _jsxs("select", { style: selectStyle, value: draft.reasoningEffort, disabled: !writable || effortOptions.length === 0, onChange: (e) => setDraft((d) => ({ ...d, reasoningEffort: e.target.value })), children: [_jsx("option", { value: "", children: "\u2014" }), effortOptions.map((e) => (_jsx("option", { value: e.id, children: e.name }, e.id)))] })] })] }), failure !== undefined ? _jsx("div", { style: { color: token.danger, fontSize: 12 }, children: failure }) : null, done ? _jsx("div", { style: { color: token.accent, fontSize: 12 }, children: t('restoreDone') }) : null, _jsx("div", { style: { display: 'flex', gap: 8 }, children: _jsx("button", { style: primaryButtonStyle, disabled: !writable || busy, onClick: () => void save(), children: t('save') }) })] }));
}
/** The orchestrate-guard strictness toggle (strict ⇄ lenient). */
function EnforcementRow({ controller, writable, current, t }) {
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState(undefined);
    const [done, setDone] = useState(false);
    const choose = async (next) => {
        if (next === current)
            return;
        setBusy(true);
        setFailure(undefined);
        try {
            const message = await controller.setEnforcement(next);
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
    return (_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: rowStyle, children: [_jsx("strong", { style: { color: token.labelPrimary, fontSize: 14 }, children: t('enforcementHeading') }), _jsx("p", { style: { margin: 0, color: token.labelSecondary, fontSize: 13, lineHeight: '18px' }, children: t('enforcementHint') })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { style: current === 'strict' ? primaryButtonStyle : ghostButtonStyle, disabled: !writable || busy, onClick: () => void choose('strict'), children: t('enforcementStrict') }), _jsx("button", { style: current === 'lenient' ? primaryButtonStyle : ghostButtonStyle, disabled: !writable || busy, onClick: () => void choose('lenient'), children: t('enforcementLenient') })] }), failure !== undefined ? _jsx("div", { style: { color: token.danger, fontSize: 12 }, children: failure }) : null, done ? _jsx("div", { style: { color: token.accent, fontSize: 12 }, children: t('restoreDone') }) : null] }));
}
/** The role-template roster: cards plus an inline add form. */
function RolesBlock({ controller, groups, tools, writable, roles, defaultRole, t }) {
    const [adding, setAdding] = useState(false);
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
        setDraft({ displayName: '', description: '', persona: '', provider: '', model: '', reasoningEffort: '', toolFilter: { allow: [] } });
        setFailure(undefined);
        setAdding(true);
    };
    const saveAdd = async () => {
        setBusy(true);
        setFailure(undefined);
        try {
            const existing = new Set(roles.map(([id]) => id));
            const id = roleIdFromName(draft.displayName, existing);
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
    return (_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }, children: [_jsx("strong", { style: { color: token.labelPrimary, fontSize: 14 }, children: t('rolesHeading') }), _jsx("button", { style: ghostButtonStyle, disabled: !writable || adding, onClick: beginAdd, children: t('addRole') })] }), _jsx("p", { style: { margin: 0, color: token.labelSecondary, fontSize: 13, lineHeight: '18px' }, children: t('rolesHint') }), adding ? (_jsxs("div", { style: { border: '1px dashed ' + token.border, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('roleDisplayName') }), _jsx("input", { style: textInputStyle, value: draft.displayName, placeholder: t('displayNamePlaceholder'), onChange: (e) => setDraft((d) => ({ ...d, displayName: e.target.value })) })] }), _jsxs("div", { style: rowStyle, children: [_jsx("label", { style: fieldLabelStyle, children: t('roleDescription') }), _jsx("textarea", { style: textAreaStyle, value: draft.description, placeholder: t('descriptionPlaceholder'), onChange: (e) => setDraft((d) => ({ ...d, description: e.target.value })) })] }), _jsx("div", { style: rowStyle, children: _jsx(ToolSetPicker, { tools: tools, selected: draft.toolFilter?.allow ?? [], t: t, onChange: (allow) => setDraft((d) => ({ ...d, toolFilter: { allow } })) }) }), failure !== undefined ? _jsx("div", { style: { color: token.danger, fontSize: 12 }, children: failure }) : null, _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { style: primaryButtonStyle, disabled: !writable || busy, onClick: () => void saveAdd(), children: t('addRole') }), _jsx("button", { style: ghostButtonStyle, disabled: busy, onClick: () => setAdding(false), children: t('cancel') })] })] })) : null, roles.length === 0 && !adding ? (_jsx("p", { style: { margin: 0, color: token.labelSecondary, fontSize: 13 }, children: t('emptyRoles') })) : (roles.map(([id, role]) => (_jsx(RoleCard, { id: id, role: role, isDefault: defaultRole === id, groups: groups, tools: tools, t: t, onSave: (d) => controller.updateRole(id, role, d), onDelete: () => controller.removeRole(id), onSetDefault: () => controller.setDefaultRole(id) }, id))))] }));
}
//# sourceMappingURL=SubagentOptionsSection.js.map