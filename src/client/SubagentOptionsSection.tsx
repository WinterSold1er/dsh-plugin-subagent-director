/**
 * Subagent Director configuration section (design section 9): the default-model
 * row plus the role-template cards. It is registered into
 * `plugins.bundle.config` keyed by the package name, so it renders on this
 * plugin's own page in the DSH plugin manager (插件列表 →
 * dsh-plugin-subagent-director), between the package description and the
 * component rows — not in the DSH settings panel any more.
 *
 * The slot outlet erases the share boundary and delivers the inject face flat
 * plus the `view` the page dispatches; this component guards for a
 * not-yet-injected render (and for `summary`) and then renders its content
 * column from the live snapshot.
 *
 * State lives in the page store (SubagentOptionsStore); every write travels as
 * path ops through settings.mutate with an optimistic-revision lock, so the
 * section only ever echoes the acknowledge-and-reload outcome. Failures return
 * a localized message that the save/delete/restore controls surface inline.
 *
 * Presentation follows the official DSH design language: a content column of
 * card sections built from theme tokens (surface / border / type scale / focus
 * ring), with all hover and focus behaviour defined in ui.ts.
 */
import { useEffect, useState } from 'react';
// Type-only: pulls in the Plugins page's slot contract so the
// `plugins.bundle.config` cell (and its `view`/`form` owner props) merge into
// the client `SlotMap` via module augmentation. The package is never imported at
// runtime — the slot outlet owns rendering; this import exists purely for types.
import type { PluginConfigViewProps } from '@deepseek-ai/dsh-client-ui-plugin-manager/client';
import type { SnapshotSelectorHook } from './bind.js';
import type { DirectorAllowedRoute } from '../bridge-contract.js';
import { modelsForProvider, providerNames } from './allowed-routes.js';
import type { SubagentDirectorKey } from './locales.js';
import type { SubagentOptionsState, SubagentOptionsStore } from './store.js';
import type { RoleDraft, StoredRole } from './store-logic.js';
import { roleIdFromName } from './store-logic.js';
import { RoleCard } from './RoleCard.js';

/** Injected dependencies of {@link SubagentOptionsSection} (slot `inject`). */
export interface SubagentOptionsSectionInjected {
    /** The page store (loaded on mount, refreshed on pushed invalidations). */
    controller: SubagentOptionsStore;
    /** uSES subscription hook bound to the store. */
    useSnapshot: SnapshotSelectorHook<SubagentOptionsState>;
    /** Section copy. */
    t: (key: SubagentDirectorKey) => string;
}

/** Props delivered by the slot outlet: the inject face spread flat, plus the view the plugin page dispatches. */
export type SubagentOptionsSectionProps = Partial<SubagentOptionsSectionInjected> & Partial<PluginConfigViewProps>;

/** Local draft of the default-model row. */
interface DefaultRowDraft {
    provider: string;
    model: string;
    reasoningEffort: string;
}

/**
 * Render the Subagent Director configuration content column.
 * @param props - slot-delivered injected dependencies.
 * @returns the section, or null while the shell has not injected yet.
 */
export function SubagentOptionsSection(props: SubagentOptionsSectionProps): JSX.Element | null {
    const { controller, useSnapshot, t } = props;
    if (controller === undefined || useSnapshot === undefined || t === undefined) return null;
    // `summary` is reserved for official cards and row fallbacks; the bundle
    // page this section is registered on only ever asks for `page`.
    if (props.view === 'summary') return null;
    return <Loaded injected={{ controller, useSnapshot, t }} />;
}

interface LoadedInjected {
    controller: SubagentOptionsStore;
    useSnapshot: SnapshotSelectorHook<SubagentOptionsState>;
    t: (key: SubagentDirectorKey) => string;
}

function Loaded({ injected }: { injected: LoadedInjected }): JSX.Element | null {
    const { controller, t } = injected;
    const state = injected.useSnapshot((s) => s);

    // Kick the first load once when the page mounts (post-load refreshes ride
    // the pushed invalidations wired in apply()). The tool catalog is requested
    // without a session id: DSH 0.1.7's SessionListState no longer exposes a
    // "current" session (the plugin-page slot's owner props carry only
    // `view`), so the Host enumerates its global tool registry. The scoped
    // per-agent catalog is a documented 0.1.7 regression (see CHANGELOG).
    useEffect(() => {
        if (state.status === 'idle' && !state.loading) void controller.load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.status, state.loading]);

    if (state.status === 'error') {
        return (
            <div className="sd-section">
                <div className="sd-card sd-card-error">
                    <p className="sd-error-text">{t('loadError')} {state.error ?? ''}</p>
                    <div className="sd-actions">
                        <button type="button" className="sd-btn sd-btn-ghost" onClick={() => void controller.load()}>{t('retry')}</button>
                    </div>
                </div>
            </div>
        );
    }
    if (state.status !== 'ready') {
        return <div className="sd-section"><p className="sd-intro">{t('sectionIntro')}</p></div>;
    }

    const section = state.section;
    const writable = state.writable;
    const roles = section?.roles ?? {};
    const entries = Object.entries(roles) as [string, StoredRole][];
    const routes = state.allowedRoutes;

    return (
        <div className="sd-section">
            <p className="sd-intro">{t('sectionIntro')}</p>
            <DefaultModelRow
                controller={controller}
                routes={routes}
                modelSelectionEnabled={state.modelSelectionEnabled}
                writable={writable}
                current={{
                    provider: section?.defaultProvider,
                    model: section?.defaultModel,
                    reasoningEffort: section?.defaultReasoningEffort,
                }}
                t={t}
            />
            <RolesBlock
                controller={controller}
                routes={routes}
                writable={writable}
                roles={entries}
                defaultRole={section?.defaultRole}
                t={t}
            />
        </div>
    );
}

/** The default-model row: provider → model → reasoning-effort cascade + restore. */
function DefaultModelRow({ controller, routes, modelSelectionEnabled, writable, current, t }: {
    controller: SubagentOptionsStore;
    routes: readonly DirectorAllowedRoute[];
    modelSelectionEnabled: boolean;
    writable: boolean;
    current: { provider?: string; model?: string; reasoningEffort?: string };
    t: (key: SubagentDirectorKey) => string;
}): JSX.Element {
    const [draft, setDraft] = useState<DefaultRowDraft>({
        provider: current.provider ?? '',
        model: current.model ?? '',
        reasoningEffort: current.reasoningEffort ?? '',
    });
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | undefined>(undefined);
    const [done, setDone] = useState(false);

    // Reflect a fresh server snapshot into the draft (a pushed invalidation or a
    // restore reload; a user mid-edit is not clobbered because the section owns
    // the only editor for these three fields).
    useEffect(() => {
        if (busy) return;
        setDraft({
            provider: current.provider ?? '',
            model: current.model ?? '',
            reasoningEffort: current.reasoningEffort ?? '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current.provider, current.model, current.reasoningEffort]);

    const provider = draft.provider;
    const model = draft.model;
    const providers = providerNames(routes);
    const modelOptions = provider ? modelsForProvider(routes, provider) : [];
    const noAllowed = routes.length === 0;

    const save = async (): Promise<void> => {
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
        } finally {
            setBusy(false);
        }
    };

    const restore = async (): Promise<void> => {
        setBusy(true);
        setFailure(undefined);
        try {
            const message = await controller.restoreDefaults();
            if (message !== undefined) {
                setFailure(message);
                return;
            }
            setDone(true);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="sd-card">
            <div className="sd-head">
                <div className="sd-head-main">
                    <strong className="sd-title">{t('defaultsHeading')}</strong>
                    <p className="sd-hint">{t('defaultsHint')}</p>
                </div>
                <button type="button" className="sd-btn sd-btn-ghost" disabled={!writable || busy} onClick={() => void restore()}>{t('restoreDefaults')}</button>
            </div>
            {noAllowed ? (
                <p className="sd-warn-text">{t('noAllowedModels')}</p>
            ) : null}
            <div className="sd-grid">
                <div className="sd-field">
                    <label className="sd-label">{t('defaultProvider')}</label>
                    {noAllowed ? (
                        <div className="sd-note">—</div>
                    ) : (
                        <select
                            className="sd-select"
                            value={draft.provider}
                            disabled={!writable || providers.length === 0}
                            onChange={(e) => setDraft((d) => ({ provider: e.target.value, model: '', reasoningEffort: '' }))}
                        >
                            <option value="">—</option>
                            {providers.map((id) => (
                                <option key={id} value={id}>{id}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="sd-field">
                    <label className="sd-label">{t('defaultModel')}</label>
                    {noAllowed ? (
                        <div className="sd-note">—</div>
                    ) : (
                        <select
                            className="sd-select"
                            value={draft.model}
                            disabled={!writable || modelOptions.length === 0}
                            onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value, reasoningEffort: '' }))}
                        >
                            <option value="">—</option>
                            {modelOptions.map((m) => (
                                <option key={m.model} value={m.model}>{m.label}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="sd-field">
                    <label className="sd-label">{t('defaultReasoningEffort')}</label>
                    <input
                        className="sd-input"
                        value={draft.reasoningEffort}
                        disabled={!writable}
                        placeholder={modelSelectionEnabled ? '' : '(advisory)'}
                        onChange={(e) => setDraft((d) => ({ ...d, reasoningEffort: e.target.value }))}
                    />
                </div>
            </div>
            {failure !== undefined ? <p className="sd-error-text">{failure}</p> : null}
            {done ? <p className="sd-success-text">{t('restoreDone')}</p> : null}
            <div className="sd-actions sd-actions-end">
                <button type="button" className="sd-btn sd-btn-primary" disabled={!writable || busy} onClick={() => void save()}>{t('save')}</button>
            </div>
        </div>
    );
}

/** The role-template roster: cards plus an inline add form. */
function RolesBlock({ controller, routes, writable, roles, defaultRole, t }: {
    controller: SubagentOptionsStore;
    routes: readonly DirectorAllowedRoute[];
    writable: boolean;
    roles: [string, StoredRole][];
    defaultRole: string | undefined;
    t: (key: SubagentDirectorKey) => string;
}): JSX.Element {
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState<RoleDraft>({
        displayName: '',
        description: '',
        agentPreset: '',
        persona: '',
        provider: '',
        model: '',
        reasoningEffort: '',
        toolFilter: { allow: [] },
    });
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | undefined>(undefined);

    const beginAdd = (): void => {
        setDraft({ displayName: '', description: '', agentPreset: '', persona: '', provider: '', model: '', reasoningEffort: '', toolFilter: { allow: [] } });
        setFailure(undefined);
        setAdding(true);
    };

    const saveAdd = async (): Promise<void> => {
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
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="sd-group">
            <div className="sd-head">
                <div className="sd-head-main">
                    <strong className="sd-title">{t('rolesHeading')}</strong>
                    <p className="sd-hint">{t('rolesHint')}</p>
                </div>
                <button type="button" className="sd-btn sd-btn-ghost" disabled={!writable || adding} onClick={beginAdd}>{t('addRole')}</button>
            </div>

            {adding ? (
                <div className="sd-card sd-card-inset">
                    <strong className="sd-title">{t('addRole')}</strong>
                    <div className="sd-field">
                        <label className="sd-label">{t('roleDisplayName')}</label>
                        <input
                            className="sd-input"
                            value={draft.displayName}
                            placeholder={t('displayNamePlaceholder')}
                            onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                        />
                    </div>
                    <div className="sd-field">
                        <label className="sd-label">{t('roleDescription')}</label>
                        <textarea
                            className="sd-textarea"
                            value={draft.description}
                            placeholder={t('descriptionPlaceholder')}
                            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                        />
                    </div>
                    <div className="sd-field">
                        <label className="sd-label">{t('agentPreset')}</label>
                        <input
                            className="sd-input"
                            value={draft.agentPreset ?? ''}
                            placeholder={t('agentPresetPlaceholder')}
                            onChange={(e) => setDraft((d) => ({ ...d, agentPreset: e.target.value }))}
                        />
                        <span className="sd-note">{t('agentPresetHint')}</span>
                    </div>
                    {failure !== undefined ? <p className="sd-error-text">{failure}</p> : null}
                    <div className="sd-actions sd-actions-end">
                        <button type="button" className="sd-btn sd-btn-primary" disabled={!writable || busy} onClick={() => void saveAdd()}>{t('addRole')}</button>
                        <button type="button" className="sd-btn sd-btn-ghost" disabled={busy} onClick={() => setAdding(false)}>{t('cancel')}</button>
                    </div>
                </div>
            ) : null}

            {roles.length === 0 && !adding ? (
                <p className="sd-empty">{t('emptyRoles')}</p>
            ) : (
                <div className="sd-list">
                    {roles.map(([id, role]) => (
                        <RoleCard
                            key={id}
                            id={id}
                            role={role}
                            isDefault={defaultRole === id}
                            routes={routes}
                            t={t}
                            onSave={(d: RoleDraft) => controller.updateRole(id, role, d)}
                            onDelete={() => controller.removeRole(id)}
                            onSetDefault={() => controller.setDefaultRole(id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
