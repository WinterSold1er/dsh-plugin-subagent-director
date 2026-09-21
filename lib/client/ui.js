export const token = {
    labelPrimary: 'var(--dsw-alias-label-primary)',
    labelSecondary: 'var(--dsw-alias-label-secondary)',
    labelTertiary: 'var(--dsw-alias-label-tertiary)',
    border: 'var(--dsw-alias-border-l2)',
    bgLayer1: 'var(--dsw-alias-bg-layer-1)',
    bgLayer3: 'var(--dsw-alias-bg-layer-3)',
    accent: 'var(--dsw-alias-state-business-primary)',
    danger: 'var(--dsw-alias-state-error-primary)',
    shadow: 'var(--dsw-shadow-lv1)',
};
export const rowStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
};
export const fieldLabelStyle = {
    color: token.labelSecondary,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '16px',
};
export const selectStyle = {
    height: 32,
    borderRadius: 8,
    border: '1px solid ' + token.border,
    background: token.bgLayer1,
    color: token.labelPrimary,
    font: 'inherit',
    fontSize: 13,
    padding: '0 10px',
    outline: 'none',
    boxSizing: 'border-box',
};
export const textInputStyle = {
    height: 32,
    borderRadius: 8,
    border: '1px solid ' + token.border,
    background: token.bgLayer1,
    color: token.labelPrimary,
    font: 'inherit',
    fontSize: 13,
    padding: '0 10px',
    outline: 'none',
    boxSizing: 'border-box',
};
export const textAreaStyle = {
    borderRadius: 8,
    border: '1px solid ' + token.border,
    background: token.bgLayer1,
    color: token.labelPrimary,
    font: 'inherit',
    fontSize: 13,
    lineHeight: '20px',
    padding: '8px 10px',
    resize: 'vertical',
    minHeight: 64,
    outline: 'none',
    boxSizing: 'border-box',
};
export const primaryButtonStyle = {
    height: 30,
    borderRadius: 8,
    border: '1px solid ' + token.accent,
    background: token.accent,
    color: '#fff',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    padding: '0 14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
};
export const ghostButtonStyle = {
    height: 30,
    borderRadius: 8,
    border: '1px solid ' + token.border,
    background: 'transparent',
    color: token.labelPrimary,
    font: 'inherit',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    padding: '0 12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
};
export const dangerButtonStyle = {
    ...ghostButtonStyle,
    color: token.danger,
    borderColor: token.danger,
};
export const cardStyle = {
    border: '1px solid ' + token.border,
    background: token.bgLayer3,
    borderRadius: 12,
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minWidth: 0,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
};
export const roleCardStyle = {
    border: '1px solid ' + token.border,
    background: token.bgLayer1,
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minWidth: 0,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
};
export const roleCardDefaultStyle = {
    ...roleCardStyle,
    border: '1px solid ' + token.accent,
    boxShadow: '0 0 0 1px ' + token.accent + '33, 0 2px 6px rgba(0, 0, 0, 0.04)',
};
export const mainAgentBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '2px 9px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
    lineHeight: '16px',
    letterSpacing: '0.01em',
    color: token.accent,
    background: token.bgLayer1,
    border: '1px solid ' + token.accent,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
};
export const badgeDotStyle = {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'currentColor',
    display: 'inline-block',
    flexShrink: 0,
};
export const calloutBannerStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 8,
    background: token.bgLayer1,
    border: '1px solid ' + token.border,
    borderLeft: '3px solid ' + token.accent,
};
export const metaChipStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 6,
    background: token.bgLayer3,
    border: '1px solid ' + token.border,
    fontSize: 12,
    lineHeight: '16px',
    color: token.labelSecondary,
};
export const idBadgeStyle = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 11,
    padding: '1px 6px',
    borderRadius: 4,
    background: token.bgLayer1,
    border: '1px solid ' + token.border,
    color: token.labelTertiary,
};
export const sectionWidth = {
    width: '100%',
    maxWidth: 800,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    color: token.labelPrimary,
};
//# sourceMappingURL=ui.js.map