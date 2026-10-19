/** One role template card: read-only summary plus an inline editor.
 * Provider/model picks are limited to the routes authorized in the official
 * Subagent model-selection list; reasoning effort is a free-text field (the
 * alpha.4 client has no effort catalog). DSH 0.2.1 moved persona/tool
 * composition into an independent Agent Preset, so the card exposes an
 * `agentPreset` id instead. Writes go through the controller as path ops, and
 * failures return a localized message. */
import { useState } from 'react';
import type { DirectorAllowedRoute } from '../bridge-contract.js';
import type { SubagentDirectorKey } from './locales.js';
import { modelsForProvider, providerNames } from './allowed-routes.js';
import type { RoleDraft, StoredRole } from './store-logic.js';

export interface RoleCardProps {
  /** Persisted role id (kebab-case). */
  id: string;
  /** Persisted role value. */
  role: StoredRole;
  /** Whether this role is the defaultRole. */
  isDefault: boolean;
  /** Authorized routes (the only selectable provider/model pairs). */
  routes: readonly DirectorAllowedRoute[];
  /** Section copy. */
  t: (key: SubagentDirectorKey) => string;
  /** Commit an edited role; returns a localized failure message or undefined. */
  onSave: (draft: RoleDraft) => Promise<string | undefined>;
  /** Delete this role; returns a localized failure message or undefined. */
  onDelete: () => Promise<string | undefined>;
  /** Promote this role to default; returns a localized failure message or undefined. */
  onSetDefault: () => Promise<string | undefined>;
}

export function RoleCard({ id, role, isDefault, routes, t, onSave, onDelete, onSetDefault }: RoleCardProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [draft, setDraft] = useState<RoleDraft>({
    displayName: role.displayName,
    description: role.description,
    agentPreset: role.agentPreset ?? '',
    persona: role.persona ?? '',
    provider: role.provider ?? '',
    model: role.model ?? '',
    reasoningEffort: role.reasoningEffort ?? '',
    toolFilter: { allow: role.toolFilter?.allow ?? [] },
  });

  const provider = draft.provider || role.provider;
  const providers = providerNames(routes);
  const modelOptions = provider ? modelsForProvider(routes, provider) : [];

  const save = async (): Promise<void> => {
    setBusy(true);
    setFailure(undefined);
    try {
      const message = await onSave(draft);
      if (message !== undefined) {
        setFailure(message);
        return;
      }
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (): Promise<void> => {
    if (!window.confirm(t('confirmDeleteRole').replace('{id}', id))) return;
    setBusy(true);
    setFailure(undefined);
    try {
      const message = await onDelete();
      if (message !== undefined) setFailure(message);
    } finally {
      setBusy(false);
    }
  };

  const setField = (field: keyof RoleDraft, value: string): void => {
    setDraft((d) => ({ ...d, [field]: value }));
  };

  if (editing) {
    return (
      <div className="sd-card">
        <div className="sd-head">
          <div className="sd-head-main">
            <strong className="sd-title">{role.displayName || id}</strong>
            <div className="sd-role-sub">
              <span className="sd-mono">{id}</span>
              {isDefault ? <span className="sd-chip sd-chip-accent">{t('defaultRoleBadge')}</span> : null}
            </div>
          </div>
        </div>
        <div className="sd-field">
          <label className="sd-label">{t('roleDisplayName')}</label>
          <input className="sd-input" value={draft.displayName} placeholder={t('displayNamePlaceholder')} onChange={(e) => setField('displayName', e.target.value)} />
        </div>
        <div className="sd-field">
          <label className="sd-label">{t('roleDescription')}</label>
          <textarea className="sd-textarea" value={draft.description} placeholder={t('descriptionPlaceholder')} onChange={(e) => setField('description', e.target.value)} />
        </div>
        <div className="sd-field">
          <label className="sd-label">{t('agentPreset')}</label>
          <input
            className="sd-input"
            value={draft.agentPreset ?? ''}
            placeholder={t('agentPresetPlaceholder')}
            onChange={(e) => setField('agentPreset', e.target.value)}
          />
          <span className="sd-note">{t('agentPresetHint')}</span>
        </div>
        <div className="sd-grid">
          <div className="sd-field">
            <label className="sd-label">{t('provider')}</label>
            <select
              className="sd-select"
              value={draft.provider}
              disabled={providers.length === 0}
              onChange={(e) => setField('provider', e.target.value)}
            >
              <option value="">—</option>
              {providers.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>
          <div className="sd-field">
            <label className="sd-label">{t('model')}</label>
            <select
              className="sd-select"
              value={draft.model}
              disabled={modelOptions.length === 0}
              onChange={(e) => setField('model', e.target.value)}
            >
              <option value="">—</option>
              {modelOptions.map((m) => (
                <option key={m.model} value={m.model}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="sd-field">
            <label className="sd-label">{t('reasoningEffort')}</label>
            <input
              className="sd-input"
              value={draft.reasoningEffort}
              placeholder="(advisory)"
              onChange={(e) => setField('reasoningEffort', e.target.value)}
            />
          </div>
        </div>
        {failure !== undefined ? <p className="sd-error-text">{failure}</p> : null}
        <div className="sd-actions sd-actions-end">
          <button type="button" className="sd-btn sd-btn-primary" disabled={busy} onClick={() => void save()}>{t('save')}</button>
          <button type="button" className="sd-btn sd-btn-ghost" disabled={busy} onClick={() => setEditing(false)}>{t('cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-card">
      <div className="sd-role-head">
        <div className="sd-head-main">
          <strong className="sd-title">{role.displayName || id}</strong>
          <div className="sd-role-sub">
            <span className="sd-mono">{id}</span>
            {isDefault ? <span className="sd-chip sd-chip-accent">{t('defaultRoleBadge')}</span> : null}
          </div>
        </div>
      </div>
      {role.description ? (
        <p className="sd-role-desc">{role.description}</p>
      ) : null}
      <div className="sd-meta">
        <Metadata label={t('agentPreset')} value={role.agentPreset} />
        <Metadata label={t('provider')} value={role.provider} />
        <Metadata label={t('model')} value={role.model} />
        <Metadata label={t('reasoningEffort')} value={role.reasoningEffort} />
      </div>
      {role.persona || role.toolFilter?.allow?.length ? (
        <p className="sd-warn-text">{t('legacyRoleFields')}</p>
      ) : null}
      {failure !== undefined ? <p className="sd-error-text">{failure}</p> : null}
      <div className="sd-actions">
        <button type="button" className="sd-btn sd-btn-ghost" disabled={busy} onClick={() => setEditing(true)}>{t('edit')}</button>
        <button type="button" className="sd-btn sd-btn-ghost" disabled={busy || isDefault} onClick={() => (void onSetDefault(), undefined)}>{t('setDefaultRole')}</button>
        <button type="button" className="sd-btn sd-btn-danger" disabled={busy} onClick={() => void remove()}>{t('deleteRole')}</button>
      </div>
    </div>
  );
}

function Metadata({ label, value }: { label: string; value: string | undefined }): JSX.Element | null {
  if (!value) return null;
  return (
    <span className="sd-meta-item">
      <span className="sd-meta-label">{label}</span>
      <span className="sd-meta-value">{value}</span>
    </span>
  );
}
