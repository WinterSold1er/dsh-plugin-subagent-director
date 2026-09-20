/** One role template card: read-only summary plus an inline editor.
 * Provider/model picks are limited to the routes authorized in the official
 * Subagent model-selection list; reasoning effort is a free-text field (the
 * alpha.4 client has no effort catalog). Writes go through the controller as
 * path ops, and failures return a localized message. */
import { useState } from 'react';
import type { DirectorAllowedRoute } from '../bridge-contract.js';
import type { SubagentDirectorKey } from './locales.js';
import { type RoleDraft, type StoredRole, validateRoleSubmission } from './store-logic.js';
import { RoleFormFields } from './RoleFormFields.js';
import {
  badgeDotStyle,
  dangerButtonStyle,
  ghostButtonStyle,
  idBadgeStyle,
  mainAgentBadgeStyle,
  metaChipStyle,
  primaryButtonStyle,
  roleCardDefaultStyle,
  roleCardStyle,
  token,
} from './ui.js';

export interface RoleCardProps {
  /** Persisted role id (kebab-case). */
  id: string;
  /** Persisted role value. */
  role: StoredRole;
  /** Whether this role is the defaultRole (Main Agent). */
  isDefault: boolean;
  /** Authorized routes (the only selectable provider/model pairs). */
  routes: readonly DirectorAllowedRoute[];
  /** Distinct model-visible tool names (for the tool-set row). */
  tools: readonly string[];
  /** All existing role IDs (for uniqueness check during rename). */
  existingRoleIds: ReadonlySet<string>;
  /** Whether settings are writable by the current user. */
  writable: boolean;
  /** Optional initial editing state (useful for tests). */
  initialEditing?: boolean;
  /** Section copy. */
  t: (key: SubagentDirectorKey) => string;
  /** Commit an edited role; returns a localized failure message or undefined. */
  onSave: (newId: string, draft: RoleDraft) => Promise<string | undefined>;
  /** Delete this role; returns a localized failure message or undefined. */
  onDelete: () => Promise<string | undefined>;
  /** Promote this role to default; returns a localized failure message or undefined. */
  onSetDefault: () => Promise<string | undefined>;
}

export function RoleCard({
  id,
  role,
  isDefault,
  routes,
  tools,
  existingRoleIds,
  writable,
  initialEditing = false,
  t,
  onSave,
  onDelete,
  onSetDefault,
}: RoleCardProps): JSX.Element {
  const [editing, setEditing] = useState(initialEditing);
  const [busy, setBusy] = useState(false);
  const [cardId, setCardId] = useState(id);
  const [idError, setIdError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [draft, setDraft] = useState<RoleDraft>({
    displayName: role.displayName,
    description: role.description,
    persona: role.persona ?? '',
    provider: role.provider ?? '',
    model: role.model ?? '',
    reasoningEffort: role.reasoningEffort ?? '',
    toolFilter: { allow: role.toolFilter?.allow ?? [] },
  });

  const beginEdit = (): void => {
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

  const save = async (): Promise<void> => {
    const validation = validateRoleSubmission(cardId, draft.displayName, existingRoleIds, id, draft.description);
    if (!validation.ok) {
      setIdError(t(validation.errorKey!));
      return;
    }
    const targetId = validation.id!;
    setBusy(true);
    setFailure(undefined);
    try {
      const message = await onSave(targetId, draft);
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

  if (editing) {
    return (
      <div style={isDefault ? roleCardDefaultStyle : roleCardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <strong style={{ color: token.labelPrimary, fontSize: 15, fontWeight: 600 }}>{t('roleDisplayName')}</strong>
          {isDefault ? (
            <span style={mainAgentBadgeStyle}>
              <span style={badgeDotStyle} />
              {t('defaultRoleBadge')}
            </span>
          ) : null}
        </div>
        <RoleFormFields
          id={cardId}
          onIdChange={(newId) => {
            setCardId(newId);
            if (idError) setIdError(undefined);
          }}
          idError={idError}
          draft={draft}
          onDraftChange={(newDraft) => {
            setDraft(newDraft);
            if (idError) setIdError(undefined);
          }}
          routes={routes}
          tools={tools}
          t={t}
          disabled={!writable || busy}
          isDefault={isDefault}
        />
        {failure !== undefined ? <div style={{ color: token.danger, fontSize: 12 }}>{failure}</div> : null}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button style={primaryButtonStyle} disabled={!writable || busy} onClick={() => void save()}>{t('save')}</button>
          <button style={ghostButtonStyle} disabled={busy} onClick={() => setEditing(false)}>{t('cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={isDefault ? roleCardDefaultStyle : roleCardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ color: token.labelPrimary, fontSize: 15, fontWeight: 600 }}>{role.displayName || id}</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={idBadgeStyle}>{id}</span>
          {isDefault ? (
            <span style={mainAgentBadgeStyle}>
              <span style={badgeDotStyle} />
              {t('defaultRoleBadge')}
            </span>
          ) : null}
        </div>
      </div>
      {role.description ? (
        <p style={{ margin: 0, color: token.labelSecondary, fontSize: 13, lineHeight: '19px' }}>{role.description}</p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Metadata label={t('provider')} value={role.provider} />
        <Metadata label={t('model')} value={role.model} />
        <Metadata label={t('reasoningEffort')} value={role.reasoningEffort} />
        {role.persona ? <Metadata label={t('persona')} value={role.persona} /> : null}
        {isDefault ? (
          role.toolFilter?.allow?.length ? (
            <Metadata label={t('mainAgentTools')} value={role.toolFilter.allow.join(', ')} />
          ) : (
            <Metadata label={t('mainAgentTools')} value={t('mainAgentDefaultReadOnly')} />
          )
        ) : (
          role.toolFilter?.allow?.length ? (
            <Metadata label={t('toolFilter')} value={role.toolFilter.allow.join(', ')} />
          ) : null
        )}
      </div>
      {failure !== undefined ? <div style={{ color: token.danger, fontSize: 12 }}>{failure}</div> : null}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button style={ghostButtonStyle} disabled={!writable || busy} onClick={beginEdit}>{t('edit')}</button>
        <button style={ghostButtonStyle} disabled={!writable || busy || isDefault} onClick={() => (void onSetDefault(), undefined)}>{t('setDefaultRole')}</button>
        <button style={dangerButtonStyle} disabled={!writable || busy} onClick={remove}>{t('deleteRole')}</button>
      </div>
    </div>
  );
}

function Metadata({ label, value }: { label: string; value: string | undefined }): JSX.Element | null {
  if (!value) return null;
  return (
    <span style={metaChipStyle}>
      <span>{label}:</span>
      <strong style={{ color: token.labelPrimary, fontWeight: 500 }}>{value}</strong>
    </span>
  );
}
