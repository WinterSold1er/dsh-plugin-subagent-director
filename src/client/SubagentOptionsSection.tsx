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
import type { SnapshotSelectorHook } from './bind.js';
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client';
import type { DirectorAllowedRoute } from '../bridge-contract.js';
import { modelsForProvider, providerNames } from './allowed-routes.js';
import type { SubagentDirectorKey } from './locales.js';
import type { SubagentOptionsState, SubagentOptionsStore } from './store.js';
import type { RoleDraft, StoredRole } from './store-logic.js';
import { validateRoleSubmission } from './store-logic.js';
import { RoleCard } from './RoleCard.js';
import { RoleFormFields } from './RoleFormFields.js';
import {
  cardStyle,
  fieldLabelStyle,
  ghostButtonStyle,
  primaryButtonStyle,
  rowStyle,
  sectionWidth,
  selectStyle,
  textInputStyle,
  token,
} from './ui.js';

/** Injected dependencies of {@link SubagentOptionsSection} (slot `inject`). */
export interface SubagentOptionsSectionInjected {
  /** The page store (loaded on mount, refreshed on pushed invalidations). */
  controller: SubagentOptionsStore;
  /** uSES subscription hook bound to the store. */
  useSnapshot: SnapshotSelectorHook<SubagentOptionsState>;
  /** Section copy. */
  t: (key: SubagentDirectorKey) => string;
}

/** Props delivered by the slot outlet: the inject face spread flat. */
export type SubagentOptionsSectionProps = Partial<SubagentOptionsSectionInjected> & {
  /** Framework global kit: current-session selector (for the tool catalog). */
  useSessions?: SnapshotSelectorHook<SessionListState>;
};

/** Local draft of the default-model row. */
interface DefaultRowDraft {
  provider: string;
  model: string;
  reasoningEffort: string;
}

/**
 * Render the Subagent Director settings section content column.
 * @param props - slot-delivered injected dependencies.
 * @returns the section, or null while the shell has not injected yet.
 */
export function SubagentOptionsSection(props: SubagentOptionsSectionProps): JSX.Element | null {
  const { controller, useSnapshot, t, useSessions } = props;
  if (controller === undefined || useSnapshot === undefined || t === undefined) return null;
  return <Loaded injected={{ controller, useSnapshot, t, useSessions }} />;
}

interface LoadedInjected {
  controller: SubagentOptionsStore;
  useSnapshot: SnapshotSelectorHook<SubagentOptionsState>;
  t: (key: SubagentDirectorKey) => string;
  useSessions?: SnapshotSelectorHook<SessionListState>;
}

function Loaded({ injected }: { injected: LoadedInjected }): JSX.Element | null {
  const { controller, t } = injected;
  const state = injected.useSnapshot((s) => s);
  const sessionId = injected.useSessions !== undefined ? injected.useSessions((s) => s.current) : undefined;
  const lastSessionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.status === 'idle' && !state.loading) void controller.load(sessionId);
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
    return (
      <div style={sectionWidth}>
        <p style={{ color: token.danger, fontSize: 13 }}>{t('loadError')}: {state.error ?? ''}</p>
        <button style={ghostButtonStyle} onClick={() => void controller.load()}>{t('retry')}</button>
      </div>
    );
  }
  if (state.status !== 'ready') {
    return (
      <div style={sectionWidth}>
        <p style={{ color: token.labelSecondary, fontSize: 13 }}>{t('sectionIntro')}</p>
      </div>
    );
  }

  const section = state.section;
  const writable = state.writable;
  const roles = section?.roles ?? {};
  const entries = Object.entries(roles) as [string, StoredRole][];
  const routes = state.allowedRoutes;
  const tools = state.tools;

  return (
    <div style={sectionWidth}>
      <div
        style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: token.bgLayer3,
          border: '1px solid ' + token.border,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ color: token.labelPrimary, fontSize: 14, fontWeight: 600 }}>{t('nav')}</div>
        <p style={{ margin: 0, color: token.labelSecondary, fontSize: 13, lineHeight: '20px' }}>{t('sectionIntro')}</p>
      </div>
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
        tools={tools}
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
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <strong style={{ color: token.labelPrimary, fontSize: 15, fontWeight: 600 }}>{t('defaultsHeading')}</strong>
          <p style={{ margin: '4px 0 0', color: token.labelSecondary, fontSize: 13, lineHeight: '18px' }}>{t('defaultsHint')}</p>
        </div>
        <button style={ghostButtonStyle} disabled={!writable || busy} onClick={() => void restore()}>{t('restoreDefaults')}</button>
      </div>
      {noAllowed ? (
        <p style={{ margin: 0, color: token.danger, fontSize: 12, lineHeight: '16px' }}>{t('noAllowedModels')}</p>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        <div style={rowStyle}>
          <label style={fieldLabelStyle}>{t('defaultProvider')}</label>
          {noAllowed ? (
            <div style={{ color: token.labelSecondary, fontSize: 12 }}>—</div>
          ) : (
            <select
              style={selectStyle}
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
        <div style={rowStyle}>
          <label style={fieldLabelStyle}>{t('defaultModel')}</label>
          {noAllowed ? (
            <div style={{ color: token.labelSecondary, fontSize: 12 }}>—</div>
          ) : (
            <select
              style={selectStyle}
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
        <div style={rowStyle}>
          <label style={fieldLabelStyle}>{t('defaultReasoningEffort')}</label>
          <input
            style={textInputStyle}
            value={draft.reasoningEffort}
            disabled={!writable}
            placeholder={modelSelectionEnabled ? '' : '(advisory)'}
            onChange={(e) => setDraft((d) => ({ ...d, reasoningEffort: e.target.value }))}
          />
        </div>
      </div>
      {failure !== undefined ? <div style={{ color: token.danger, fontSize: 12 }}>{failure}</div> : null}
      {done ? <div style={{ color: token.accent, fontSize: 12, fontWeight: 500 }}>{t('restoreDone')}</div> : null}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
        <button style={primaryButtonStyle} disabled={!writable || busy} onClick={() => void save()}>{t('save')}</button>
      </div>
    </div>
  );
}

/** The role-template roster: cards plus an inline add form. */
export function RolesBlock({ controller, routes, tools, writable, roles, defaultRole, t }: {
  controller: SubagentOptionsStore;
  routes: readonly DirectorAllowedRoute[];
  tools: readonly string[];
  writable: boolean;
  roles: [string, StoredRole][];
  defaultRole: string | undefined;
  t: (key: SubagentDirectorKey) => string;
}): JSX.Element {
  const [adding, setAdding] = useState(false);
  const [customId, setCustomId] = useState('');
  const [idError, setIdError] = useState<string | undefined>(undefined);
  const [draft, setDraft] = useState<RoleDraft>({
    displayName: '',
    description: '',
    persona: '',
    provider: '',
    model: '',
    reasoningEffort: '',
    toolFilter: { allow: [] },
  });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | undefined>(undefined);

  const beginAdd = (): void => {
    setCustomId('');
    setIdError(undefined);
    setDraft({ displayName: '', description: '', persona: '', provider: '', model: '', reasoningEffort: '', toolFilter: { allow: [] } });
    setFailure(undefined);
    setAdding(true);
  };

  const saveAdd = async (): Promise<void> => {
    const existing = new Set(roles.map(([id]) => id));
    const validation = validateRoleSubmission(customId, draft.displayName, existing, undefined, draft.description);
    if (!validation.ok) {
      setIdError(t(validation.errorKey!));
      return;
    }
    const id = validation.id!;
    setBusy(true);
    setFailure(undefined);
    try {
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

  const existingRoleIds = new Set(roles.map(([id]) => id));

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <strong style={{ color: token.labelPrimary, fontSize: 15, fontWeight: 600 }}>{t('rolesHeading')}</strong>
          <p style={{ margin: '4px 0 0', color: token.labelSecondary, fontSize: 13, lineHeight: '18px' }}>{t('rolesHint')}</p>
        </div>
        <button style={ghostButtonStyle} disabled={!writable || adding} onClick={beginAdd}>{t('addRole')}</button>
      </div>

      {adding ? (
        <div style={{ border: '1px dashed ' + token.border, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: token.bgLayer1 }}>
          <RoleFormFields
            id={customId}
            onIdChange={(val) => {
              setCustomId(val);
              if (idError) setIdError(undefined);
            }}
            idError={idError}
            draft={draft}
            onDraftChange={setDraft}
            routes={routes}
            tools={tools}
            t={t}
            disabled={!writable || busy}
            isDefault={false}
          />
          {failure !== undefined ? <div style={{ color: token.danger, fontSize: 12 }}>{failure}</div> : null}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button style={primaryButtonStyle} disabled={!writable || busy} onClick={() => void saveAdd()}>{t('addRole')}</button>
            <button style={ghostButtonStyle} disabled={busy} onClick={() => setAdding(false)}>{t('cancel')}</button>
          </div>
        </div>
      ) : null}

      {roles.length === 0 && !adding ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', borderRadius: 8, border: '1px dashed ' + token.border }}>
          <p style={{ margin: 0, color: token.labelSecondary, fontSize: 13 }}>{t('emptyRoles')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {roles.map(([id, role]) => (
            <RoleCard
              key={id}
              id={id}
              role={role}
              isDefault={defaultRole === id}
              routes={routes}
              tools={tools}
              existingRoleIds={existingRoleIds}
              writable={writable}
              t={t}
              onSave={(newId: string, d: RoleDraft) => {
                if (newId !== id) {
                  return controller.renameRole(id, newId, role, d);
                }
                return controller.updateRole(id, role, d);
              }}
              onDelete={() => controller.removeRole(id)}
              onSetDefault={() => controller.setDefaultRole(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
