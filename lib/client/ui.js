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
    lineHeight: '16px',
};
export const selectStyle = {
    height: 30,
    borderRadius: 6,
    border: '1px solid ' + token.border,
    background: token.bgLayer1,
    color: token.labelPrimary,
    font: 'inherit',
    fontSize: 13,
    padding: '0 8px',
    outline: 'none',
};
export const textInputStyle = {
    height: 30,
    borderRadius: 6,
    border: '1px solid ' + token.border,
    background: token.bgLayer1,
    color: token.labelPrimary,
    font: 'inherit',
    fontSize: 13,
    padding: '0 8px',
    outline: 'none',
};
export const textAreaStyle = {
    borderRadius: 6,
    border: '1px solid ' + token.border,
    background: token.bgLayer1,
    color: token.labelPrimary,
    font: 'inherit',
    fontSize: 13,
    lineHeight: '18px',
    padding: '6px 8px',
    resize: 'vertical',
    minHeight: 56,
    outline: 'none',
};
export const primaryButtonStyle = {
    height: 28,
    borderRadius: 6,
    border: '1px solid ' + token.accent,
    background: token.accent,
    color: '#fff',
    font: 'inherit',
    fontSize: 13,
    cursor: 'pointer',
    padding: '0 12px',
};
export const ghostButtonStyle = {
    height: 28,
    borderRadius: 6,
    border: '1px solid ' + token.border,
    background: 'transparent',
    color: token.labelPrimary,
    font: 'inherit',
    fontSize: 13,
    cursor: 'pointer',
    padding: '0 12px',
};
export const dangerButtonStyle = {
    ...ghostButtonStyle,
    color: token.danger,
    borderColor: token.danger,
};
export const cardStyle = {
    border: '1px solid ' + token.border,
    background: token.bgLayer3,
    borderRadius: 10,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minWidth: 0,
};
export const sectionWidth = {
    width: '100%',
    maxWidth: 760,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    color: token.labelPrimary,
};
//# sourceMappingURL=ui.js.map