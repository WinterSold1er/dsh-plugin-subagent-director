/**
 * Tool-set picker shared by the role editor and the add-role form.
 *
 * A compact row that expands into: a search box, select-all / deselect-all
 * (scoped to the CURRENT filter — tools hidden by the search are never
 * touched), a live "selected / total" count, and a checkbox grid of the
 * filtered tools. Collapsed, it shows the label, the count, and a chevron
 * toggle so a large catalog (hundreds of MCP tools) stays compact.
 *
 * Styling uses the shared `sd-*` classes from ui.ts so the picker matches the
 * rest of the settings section in both themes.
 */

import { useId, useMemo, useState } from 'react';
import type { SubagentDirectorKey } from './locales.js';
import {
  addToolNames,
  filterToolNames,
  removeToolNames,
  toggleToolName,
} from './toolset-logic.js';

export interface ToolSetPickerProps {
  /** All model-visible tool names (the catalog). */
  tools: readonly string[];
  /** Currently selected (allow-list) tool names. */
  selected: readonly string[];
  /** Commit the new allow list. */
  onChange: (allow: string[]) => void;
  /** Section copy; may accept interpolation params. */
  t: (key: SubagentDirectorKey, params?: Record<string, string | number>) => string;
  /** Whether this picker is configuring the default role (Main Agent). */
  isDefault?: boolean;
}

/** Render the searchable, select-all capable tool-set picker. */
export function ToolSetPicker({ tools, selected, onChange, t, isDefault = false }: ToolSetPickerProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(true);
  // Stable id for the expandable region so the toggle can advertise its target.
  const panelId = useId();

  const filtered = useMemo(() => filterToolNames(tools, query), [tools, query]);
  const filteredSet = useMemo(() => new Set(filtered), [filtered]);
  const allFilteredSelected = filtered.length > 0 && filtered.every((name) => selected.includes(name));

  if (tools.length === 0) {
    return (
      <div className="sd-toolset">
        <label className="sd-label">{t('toolFilter')}</label>
        <span className="sd-note">{t('toolFilterEmpty')}</span>
      </div>
    );
  }

  return (
    <div className="sd-toolset">
      <div className="sd-toolset-head">
        <label className="sd-label">{t('toolFilter')}</label>
        <span className="sd-toolset-count">
          {t('toolFilterCount', { count: selected.length, total: tools.length })}
        </span>
        <button
          type="button"
          className="sd-btn sd-btn-ghost sd-btn-sm"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? t('toolFilterCollapse') : t('toolFilterExpand')}
        </button>
      </div>
      {open ? (
        <div className="sd-toolset-body" id={panelId}>
          <input
            className="sd-input sd-search"
            value={query}
            placeholder={t('toolFilterSearch')}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="sd-actions">
            <button
              type="button"
              className="sd-btn sd-btn-ghost sd-btn-sm"
              disabled={filtered.length === 0 || allFilteredSelected}
              onClick={() => onChange(addToolNames(selected, filtered))}
            >
              {t('toolFilterSelectAll')}
            </button>
            <button
              type="button"
              className="sd-btn sd-btn-ghost sd-btn-sm"
              disabled={filtered.length === 0 || !filtered.some((name) => selected.includes(name))}
              onClick={() => onChange(removeToolNames(selected, filtered))}
            >
              {t('toolFilterDeselectAll')}
            </button>
          </div>
          {filtered.length === 0 ? (
            <span className="sd-note">{t('toolFilterNoMatch')}</span>
          ) : (
            <div className="sd-toolset-grid">
              {filtered.map((name) => (
                <label key={name} className="sd-tool">
                  <input
                    type="checkbox"
                    checked={selected.includes(name)}
                    onChange={() => onChange(toggleToolName(selected, name))}
                  />
                  <span className="sd-tool-name">{name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ) : null}
      <span className="sd-note">
        {isDefault
          ? (selected.length === 0 ? t('mainAgentToolFilterNone') : t('mainAgentToolFilterHint'))
          : (selected.length === 0 ? t('toolFilterNone') : t('toolFilterHint'))}
      </span>
    </div>
  );
}
