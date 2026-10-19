/** Shared design tokens, injected CSS and layout classes for the Subagent
 * Director client surfaces (the plugin-page configuration section, the composer
 * dock readout and the session-header release action).
 *
 * M2 intentionally does not introduce a CSS Modules pipeline (documented design
 * deviation), so this module owns the one additive `<style>` tag the client half
 * injects plus the `sd-*` class names used by every component. Every colour,
 * radius, shadow and font comes from the official DSH theme tokens
 * (`--dsw-*`), so light and dark themes are correct by construction. */

/** Official DSH theme variables used by the components as inline values. */
export const token = {
  labelPrimary: 'var(--dsw-alias-label-primary)',
  labelSecondary: 'var(--dsw-alias-label-secondary)',
  labelTertiary: 'var(--dsw-alias-label-tertiary)',
  border: 'var(--dsw-alias-border-l2)',
  bgLayer1: 'var(--dsw-alias-bg-layer-1)',
  accent: 'var(--dsw-alias-state-business-primary)',
  success: 'var(--dsw-alias-state-success-primary)',
  danger: 'var(--dsw-alias-state-error-primary)',
  fontMono: 'var(--ds-font-family-code, monospace)',
} as const;

/** Plugin-owned style tag id; the DSH client loader removes tags by data-plugin. */
const STYLE_TAG_ID = 'dsh-plugin-subagent-director/ui.css';

/** The additive design-system stylesheet for this plugin. */
export const uiCss = `
.sd-section{box-sizing:border-box;width:100%;max-width:760px;display:flex;flex-direction:column;gap:20px;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);}
.sd-intro{margin:0;color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-13);}
.sd-card{box-sizing:border-box;display:flex;flex-direction:column;gap:12px;min-width:0;padding:16px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);transition:background-color .15s ease,border-color .15s ease;}
.sd-card-inset{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-alias-border-l1);}
.sd-card-error{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 6%, transparent);}
.sd-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.sd-head-main{display:flex;flex-direction:column;gap:2px;min-width:0;}
.sd-title{margin:0;font:var(--dsw-font-s-14);font-weight:600;line-height:22px;color:var(--dsw-alias-label-primary);}
.sd-hint{margin:0;font:var(--dsw-font-xxs-12);line-height:18px;color:var(--dsw-alias-label-secondary);}
.sd-note{margin:0;font:var(--dsw-font-xxxs-11);line-height:16px;color:var(--dsw-alias-label-tertiary);}
.sd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;}
.sd-field{display:flex;flex-direction:column;gap:6px;min-width:0;}
.sd-label{font:var(--dsw-font-xxs-strong-12);line-height:18px;color:var(--dsw-alias-label-primary);}
.sd-input,.sd-select,.sd-textarea{box-sizing:border-box;width:100%;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);transition:border-color .15s ease;}
.sd-input::placeholder,.sd-textarea::placeholder{color:var(--dsw-alias-label-tertiary);}
.sd-input:hover:not(:disabled),.sd-select:hover:not(:disabled),.sd-textarea:hover:not(:disabled){border-color:var(--dsw-alias-border-l3);}
.sd-input:focus,.sd-select:focus,.sd-textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary)) 14%, transparent);}
.sd-input:disabled,.sd-select:disabled,.sd-textarea:disabled{opacity:.55;cursor:not-allowed;}
.sd-textarea{height:auto;min-height:64px;padding:6px 10px;line-height:20px;resize:vertical;}
.sd-select{padding-right:6px;}
.sd-search{height:28px;font:var(--dsw-font-xxs-12);}
.sd-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.sd-actions-end{justify-content:flex-end;}
.sd-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:28px;padding:0 12px;border:1px solid transparent;border-radius:var(--dsw-radius-sm);font:var(--dsw-font-xs-13);font-weight:500;line-height:1;cursor:pointer;white-space:nowrap;transition:background-color .15s ease,border-color .15s ease,color .15s ease,opacity .15s ease;}
.sd-btn:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px;}
.sd-btn:disabled{opacity:.5;cursor:not-allowed;}
.sd-btn-sm{height:24px;padding:0 10px;font:var(--dsw-font-xxs-strong-12);}
.sd-btn-primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);}
.sd-btn-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover);}
.sd-btn-ghost{background:transparent;border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);}
.sd-btn-ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3);}
.sd-btn-danger{background:transparent;border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent);color:var(--dsw-alias-state-error-primary);}
.sd-btn-danger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger);}
.sd-chip{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xxxs-strong-11);line-height:1;white-space:nowrap;}
.sd-chip-accent{border-color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 30%, transparent);background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-state-business-primary);}
.sd-chips{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.sd-role-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.sd-role-sub{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:2px;}
.sd-role-desc{margin:0;font:var(--dsw-font-xs-13);line-height:20px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere;}
.sd-meta{display:flex;flex-wrap:wrap;gap:6px 16px;}
.sd-meta-item{display:inline-flex;align-items:baseline;gap:6px;min-width:0;}
.sd-meta-label{font:var(--dsw-font-xxxs-strong-11);line-height:16px;color:var(--dsw-alias-label-tertiary);}
.sd-meta-value{font:var(--dsw-font-xxs-strong-12);line-height:18px;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;word-break:break-word;}
.sd-mono{font-family:var(--ds-font-family-code, monospace);font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;word-break:break-all;}
.sd-error-text{margin:0;font:var(--dsw-font-xxs-12);line-height:18px;color:var(--dsw-alias-state-error-primary);}
.sd-warn-text{margin:0;font:var(--dsw-font-xxs-12);line-height:18px;color:var(--dsw-alias-state-warn-label);}
.sd-success-text{margin:0;font:var(--dsw-font-xxs-12);line-height:18px;color:var(--dsw-alias-state-success-primary);}
.sd-empty{margin:0;padding:16px;border:1px dashed var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-xs-13);text-align:center;}
.sd-group{display:flex;flex-direction:column;gap:12px;min-width:0;}
.sd-list{display:flex;flex-direction:column;gap:12px;min-width:0;}
.sd-toolset{display:flex;flex-direction:column;gap:8px;min-width:0;}
.sd-toolset-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.sd-toolset-count{font:var(--dsw-font-xxxs-strong-11);line-height:16px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;}
.sd-toolset-grid{display:flex;flex-direction:column;gap:2px;max-height:240px;overflow-y:auto;padding:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-layer-1);scrollbar-color:var(--dsw-alias-scrollbar-bg-l2) transparent;}
.sd-tool{display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:var(--dsw-radius-xs);font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background-color .15s ease,color .15s ease;}
.sd-tool:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}
.sd-tool input{accent-color:var(--dsw-alias-button-primary-fill);margin:0;flex:none;}
.sd-tool input:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px;}
.sd-tool-name{min-width:0;overflow-wrap:anywhere;}
.sd-dock{display:flex;align-items:center;gap:6px;padding:3px 16px;font:var(--dsw-font-xxs-12);line-height:16px;color:var(--dsw-alias-label-tertiary);}
.sd-dock-ref{font-family:var(--ds-font-family-code, monospace);font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;}
.sd-close-wrap{display:inline-flex;align-items:center;gap:8px;}
.sd-close-settled{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);}
.sd-close-error{font:var(--dsw-font-xxs-12);line-height:16px;color:var(--dsw-alias-state-error-primary);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
`;

/** Inject the plugin stylesheet once (idempotent; removes on plugin unload by data-plugin). */
export function ensureUiStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`style[data-plugin-css="${STYLE_TAG_ID}"]`) !== null) return;
  const tag = document.createElement('style');
  tag.dataset.plugin = 'dsh-plugin-subagent-director';
  tag.dataset.pluginCss = STYLE_TAG_ID;
  tag.textContent = uiCss;
  document.head.appendChild(tag);
}
