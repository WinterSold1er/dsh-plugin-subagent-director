/**
 * Shared form fields component for Role Template (used in both Add and Edit modes).
 * Renders 8 fields: id, displayName, description, persona, provider, model, reasoningEffort, toolFilter.
 * Handles provider -> model cascading logic.
 */
import type { DirectorAllowedRoute } from '../bridge-contract.js';
import type { SubagentDirectorKey } from './locales.js';
import { modelsForProvider, providerNames } from './allowed-routes.js';
import type { RoleDraft } from './store-logic.js';
import { ToolSetPicker } from './ToolSetPicker.js';
import {
  fieldLabelStyle,
  rowStyle,
  selectStyle,
  textAreaStyle,
  textInputStyle,
  token,
} from './ui.js';

export interface RoleFormFieldsProps {
  /** Persisted or draft role id. */
  id: string;
  /** Callback when role id changes. */
  onIdChange: (id: string) => void;
  /** Optional id validation error message. */
  idError?: string;
  /** Role draft containing all other fields. */
  draft: RoleDraft;
  /** Callback when draft fields change. */
  onDraftChange: (draft: RoleDraft) => void;
  /** Authorized routes (the only selectable provider/model pairs). */
  routes: readonly DirectorAllowedRoute[];
  /** Distinct model-visible tool names. */
  tools: readonly string[];
  /** Section copy. */
  t: (key: SubagentDirectorKey) => string;
  /** Whether the form inputs are disabled. */
  disabled?: boolean;
  /** Whether the role id field is specifically disabled. */
  idDisabled?: boolean;
}

/**
 * Pure cascading helper: updates provider and resets model if not supported by the new provider.
 */
export function cascadeProviderChange(
  draft: RoleDraft,
  newProvider: string,
  routes: readonly DirectorAllowedRoute[],
): RoleDraft {
  const modelOptions = newProvider ? modelsForProvider(routes, newProvider) : [];
  const modelValid = modelOptions.some((m) => m.model === draft.model);
  return {
    ...draft,
    provider: newProvider,
    model: modelValid ? draft.model : '',
  };
}

export function RoleFormFields({
  id,
  onIdChange,
  idError,
  draft,
  onDraftChange,
  routes,
  tools,
  t,
  disabled = false,
  idDisabled = false,
}: RoleFormFieldsProps): JSX.Element {
  const providers = providerNames(routes);
  const modelOptions = draft.provider ? modelsForProvider(routes, draft.provider) : [];
  const allowList = draft.toolFilter?.allow ?? [];

  const setField = (field: keyof RoleDraft, value: string): void => {
    onDraftChange({ ...draft, [field]: value });
  };

  const handleProviderChange = (newProvider: string): void => {
    onDraftChange(cascadeProviderChange(draft, newProvider, routes));
  };

  return (
    <>
      <div style={rowStyle}>
        <label style={fieldLabelStyle}>{t('roleId')}</label>
        <input
          style={textInputStyle}
          value={id}
          placeholder={t('roleIdPlaceholder')}
          disabled={disabled || idDisabled}
          onChange={(e) => onIdChange(e.target.value)}
        />
        {idError !== undefined ? (
          <div style={{ color: token.danger, fontSize: 12 }}>{idError}</div>
        ) : null}
      </div>
      <div style={rowStyle}>
        <label style={fieldLabelStyle}>{t('roleDisplayName')}</label>
        <input
          style={textInputStyle}
          value={draft.displayName}
          placeholder={t('displayNamePlaceholder')}
          disabled={disabled}
          onChange={(e) => setField('displayName', e.target.value)}
        />
      </div>
      <div style={rowStyle}>
        <label style={fieldLabelStyle}>{t('roleDescription')}</label>
        <textarea
          style={textAreaStyle}
          value={draft.description}
          placeholder={t('descriptionPlaceholder')}
          disabled={disabled}
          onChange={(e) => setField('description', e.target.value)}
        />
      </div>
      <div style={rowStyle}>
        <label style={fieldLabelStyle}>{t('rolePersona')}</label>
        <textarea
          style={textAreaStyle}
          value={draft.persona ?? ''}
          placeholder={t('personaPlaceholder')}
          disabled={disabled}
          onChange={(e) => setField('persona', e.target.value)}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <div style={rowStyle}>
          <label style={fieldLabelStyle}>{t('provider')}</label>
          <select
            style={selectStyle}
            value={draft.provider ?? ''}
            disabled={disabled || providers.length === 0}
            onChange={(e) => handleProviderChange(e.target.value)}
          >
            <option value="">—</option>
            {providers.map((pId) => (
              <option key={pId} value={pId}>{pId}</option>
            ))}
          </select>
        </div>
        <div style={rowStyle}>
          <label style={fieldLabelStyle}>{t('model')}</label>
          <select
            style={selectStyle}
            value={draft.model ?? ''}
            disabled={disabled || modelOptions.length === 0}
            onChange={(e) => setField('model', e.target.value)}
          >
            <option value="">—</option>
            {modelOptions.map((m) => (
              <option key={m.model} value={m.model}>{m.label}</option>
            ))}
          </select>
        </div>
        <div style={rowStyle}>
          <label style={fieldLabelStyle}>{t('reasoningEffort')}</label>
          <input
            style={textInputStyle}
            value={draft.reasoningEffort ?? ''}
            placeholder={t('reasoningEffortAdvisory')}
            disabled={disabled}
            onChange={(e) => setField('reasoningEffort', e.target.value)}
          />
        </div>
      </div>
      <div style={rowStyle}>
        <ToolSetPicker
          tools={tools}
          selected={allowList}
          t={t}
          onChange={(allow) => onDraftChange({ ...draft, toolFilter: { ...draft.toolFilter, allow } })}
        />
      </div>
    </>
  );
}
