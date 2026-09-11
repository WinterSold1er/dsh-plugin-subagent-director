import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoleCard } from '../src/client/RoleCard.js';
import * as RoleCardModule from '../src/client/RoleCard.js';
import { RolesBlock } from '../src/client/SubagentOptionsSection.js';
import { validateRoleSubmission, type StoredRole, type RoleDraft } from '../src/client/store-logic.js';
import type { DirectorAllowedRoute } from '../src/bridge-contract.js';
import { en } from '../src/client/locales.js';

const t = (key: keyof typeof en) => en[key] ?? key;

const mockRoutes: readonly DirectorAllowedRoute[] = [
  { provider: 'deepseek-official', model: 'deepseek-chat', label: 'DeepSeek Chat' },
  { provider: 'deepseek-official', model: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
];

const mockTools: readonly string[] = ['bash', 'read', 'write'];

const sampleRole: StoredRole = {
  displayName: 'Code Reviewer',
  description: 'Reviews code diffs',
  persona: 'You review code',
  provider: 'deepseek-official',
  model: 'deepseek-chat',
  reasoningEffort: 'low',
  toolFilter: { allow: ['bash'] },
};

describe('RoleCard component', () => {
  it('renders read-only card with displayName, id, and action buttons', () => {
    const html = renderToStaticMarkup(
      React.createElement(RoleCard, {
        id: 'reviewer',
        role: sampleRole,
        isDefault: true,
        routes: mockRoutes,
        tools: mockTools,
        existingRoleIds: new Set(['reviewer']),
        writable: true,
        t,
        onSave: vi.fn(),
        onDelete: vi.fn(),
        onSetDefault: vi.fn(),
      }),
    );

    expect(html).toContain('Code Reviewer');
    expect(html).toContain('reviewer');
    expect(html).toContain(t('defaultRoleBadge'));
    expect(html).toContain(t('edit'));
    expect(html).toContain(t('setDefaultRole'));
    expect(html).toContain(t('deleteRole'));
  });

  it('disables all action buttons when writable is false', () => {
    const html = renderToStaticMarkup(
      React.createElement(RoleCard, {
        id: 'reviewer',
        role: sampleRole,
        isDefault: false,
        routes: mockRoutes,
        tools: mockTools,
        existingRoleIds: new Set(['reviewer']),
        writable: false,
        t,
        onSave: vi.fn(),
        onDelete: vi.fn(),
        onSetDefault: vi.fn(),
      }),
    );

    // All three buttons (edit, setDefault, delete) must have disabled attribute
    const editMatch = html.match(new RegExp(`<button[^>]*>${t('edit')}<\/button>`));
    expect(editMatch?.[0]).toContain('disabled=""');

    const setDefaultMatch = html.match(new RegExp(`<button[^>]*>${t('setDefaultRole')}<\/button>`));
    expect(setDefaultMatch?.[0]).toContain('disabled=""');

    const deleteMatch = html.match(new RegExp(`<button[^>]*>${t('deleteRole')}<\/button>`));
    expect(deleteMatch?.[0]).toContain('disabled=""');
  });

  it('disables save button and form fields when editing with writable false', () => {
    const html = renderToStaticMarkup(
      React.createElement(RoleCard, {
        id: 'reviewer',
        role: sampleRole,
        isDefault: false,
        routes: mockRoutes,
        tools: mockTools,
        existingRoleIds: new Set(['reviewer']),
        initialEditing: true,
        writable: false,
        t,
        onSave: vi.fn(),
        onDelete: vi.fn(),
        onSetDefault: vi.fn(),
      }),
    );

    const saveMatch = html.match(new RegExp(`<button[^>]*>${t('save')}<\/button>`));
    expect(saveMatch?.[0]).toContain('disabled=""');

    // Inputs should be disabled
    expect(html).toContain('disabled="" value="Code Reviewer"');
  });

  it('renders RoleFormFields with role id when mounted in edit mode with writable true', () => {
    const html = renderToStaticMarkup(
      React.createElement(RoleCard, {
        id: 'reviewer',
        role: sampleRole,
        isDefault: false,
        routes: mockRoutes,
        tools: mockTools,
        existingRoleIds: new Set(['reviewer']),
        initialEditing: true,
        writable: true,
        t,
        onSave: vi.fn(),
        onDelete: vi.fn(),
        onSetDefault: vi.fn(),
      }),
    );

    // All 8 fields rendered
    expect(html).toContain(t('roleId'));
    expect(html).toContain('value="reviewer"');
    expect(html).toContain(t('roleDisplayName'));
    expect(html).toContain('value="Code Reviewer"');
    expect(html).toContain(t('roleDescription'));
    expect(html).toContain('Reviews code diffs');
    expect(html).toContain(t('rolePersona'));
    expect(html).toContain('You review code');
    expect(html).toContain(t('provider'));
    expect(html).toContain(t('model'));
    expect(html).toContain(t('reasoningEffort'));
    expect(html).toContain(t('toolFilter'));
    expect(html).toContain(t('save'));
    expect(html).toContain(t('cancel'));

    const saveMatch = html.match(/<button[^>]*>Save<\/button>/);
    expect(saveMatch?.[0]).not.toContain('disabled=""');
  });
});

describe('Role editing and validation flow', () => {
  const existingRoleIds = new Set(['reviewer', 'coder', 'architect']);

  it('validates edit submission: rejects invalid format with invalidRoleId', () => {
    const res = validateRoleSubmission('Invalid_Reviewer', 'Reviewer', existingRoleIds, 'reviewer');
    expect(res.ok).toBe(false);
    expect(res.errorKey).toBe('invalidRoleId');
  });

  it('validates edit submission: rejects rename to existing role with duplicateRoleId', () => {
    const res = validateRoleSubmission('coder', 'Reviewer', existingRoleIds, 'reviewer');
    expect(res.ok).toBe(false);
    expect(res.errorKey).toBe('duplicateRoleId');
  });

  it('validates edit submission: accepts unchanged ID', () => {
    const res = validateRoleSubmission('reviewer', 'Reviewer', existingRoleIds, 'reviewer');
    expect(res.ok).toBe(true);
    expect(res.id).toBe('reviewer');
  });

  it('validates edit submission: accepts new valid kebab-case unique ID', () => {
    const res = validateRoleSubmission('lead-reviewer', 'Reviewer', existingRoleIds, 'reviewer');
    expect(res.ok).toBe(true);
    expect(res.id).toBe('lead-reviewer');
  });

  it('validates add submission: auto-derives from displayName when customId is empty', () => {
    const res = validateRoleSubmission('', 'Performance Engineer', existingRoleIds);
    expect(res.ok).toBe(true);
    expect(res.id).toBe('performance-engineer');
  });

  it('validates add submission: accepts custom kebab-case ID', () => {
    const res = validateRoleSubmission('perf-eng', 'Performance Engineer', existingRoleIds);
    expect(res.ok).toBe(true);
    expect(res.id).toBe('perf-eng');
  });

  it('validates add submission: rejects duplicate custom ID', () => {
    const res = validateRoleSubmission('coder', 'New Coder', existingRoleIds);
    expect(res.ok).toBe(false);
    expect(res.errorKey).toBe('duplicateRoleId');
  });
});

describe('RolesBlock component real rendering and callback routing', () => {
  it('renders empty roles message and respects writable state on add button', () => {
    const mockController = {
      addRole: vi.fn(),
      renameRole: vi.fn(),
      updateRole: vi.fn(),
      removeRole: vi.fn(),
      setDefaultRole: vi.fn(),
    } as any;

    const readOnlyHtml = renderToStaticMarkup(
      React.createElement(RolesBlock, {
        controller: mockController,
        routes: mockRoutes,
        tools: mockTools,
        writable: false,
        roles: [],
        defaultRole: undefined,
        t,
      }),
    );
    expect(readOnlyHtml).toContain(t('emptyRoles'));
    const readOnlyAdd = readOnlyHtml.match(new RegExp(`<button[^>]*>${t('addRole')}<\/button>`));
    expect(readOnlyAdd?.[0]).toContain('disabled=""');

    const writableHtml = renderToStaticMarkup(
      React.createElement(RolesBlock, {
        controller: mockController,
        routes: mockRoutes,
        tools: mockTools,
        writable: true,
        roles: [],
        defaultRole: undefined,
        t,
      }),
    );
    expect(writableHtml).toContain(t('emptyRoles'));
    const writableAdd = writableHtml.match(new RegExp(`<button[^>]*>${t('addRole')}<\/button>`));
    expect(writableAdd?.[0]).not.toContain('disabled=""');
  });

  it('renders populated roles and threads correct props to RoleCard', () => {
    const mockController = {
      addRole: vi.fn(),
      renameRole: vi.fn(),
      updateRole: vi.fn(),
      removeRole: vi.fn(),
      setDefaultRole: vi.fn(),
    } as any;

    const html = renderToStaticMarkup(
      React.createElement(RolesBlock, {
        controller: mockController,
        routes: mockRoutes,
        tools: mockTools,
        writable: true,
        roles: [['reviewer', sampleRole]],
        defaultRole: 'reviewer',
        t,
      }),
    );

    expect(html).not.toContain(t('emptyRoles'));
    expect(html).toContain('Code Reviewer');
    expect(html).toContain('reviewer');
    expect(html).toContain(t('defaultRoleBadge'));
  });

  it('routes real RoleCard callbacks through RolesBlock to controller methods', async () => {
    const mockRenameRole = vi.fn().mockResolvedValue(undefined);
    const mockUpdateRole = vi.fn().mockResolvedValue(undefined);
    const mockRemoveRole = vi.fn().mockResolvedValue(undefined);
    const mockSetDefaultRole = vi.fn().mockResolvedValue(undefined);
    const mockController = {
      renameRole: mockRenameRole,
      updateRole: mockUpdateRole,
      removeRole: mockRemoveRole,
      setDefaultRole: mockSetDefaultRole,
      addRole: vi.fn(),
    } as any;

    const spy = vi.spyOn(RoleCardModule, 'RoleCard');

    renderToStaticMarkup(
      React.createElement(RolesBlock, {
        controller: mockController,
        routes: mockRoutes,
        tools: mockTools,
        writable: true,
        roles: [['reviewer', sampleRole]],
        defaultRole: 'reviewer',
        t,
      }),
    );

    expect(spy).toHaveBeenCalled();
    const passedProps = spy.mock.calls[0][0];

    expect(passedProps.id).toBe('reviewer');
    expect(passedProps.role).toBe(sampleRole);
    expect(passedProps.isDefault).toBe(true);
    expect(passedProps.writable).toBe(true);
    expect(passedProps.existingRoleIds).toEqual(new Set(['reviewer']));

    const draft: RoleDraft = { displayName: 'New Name', description: 'Desc' };

    // Test rename branch (newId !== id)
    await passedProps.onSave('lead-reviewer', draft);
    expect(mockRenameRole).toHaveBeenCalledWith('reviewer', 'lead-reviewer', sampleRole, draft);
    expect(mockUpdateRole).not.toHaveBeenCalled();

    // Test update branch (newId === id)
    await passedProps.onSave('reviewer', draft);
    expect(mockUpdateRole).toHaveBeenCalledWith('reviewer', sampleRole, draft);

    // Test delete callback
    await passedProps.onDelete();
    expect(mockRemoveRole).toHaveBeenCalledWith('reviewer');

    // Test setDefault callback
    await passedProps.onSetDefault();
    expect(mockSetDefaultRole).toHaveBeenCalledWith('reviewer');

    spy.mockRestore();
  });
});
