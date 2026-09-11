import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoleFormFields, cascadeProviderChange, type RoleFormFieldsProps } from '../src/client/RoleFormFields.js';
import type { DirectorAllowedRoute } from '../src/bridge-contract.js';
import { roleIdFromName, resolveRoleId, type RoleDraft } from '../src/client/store-logic.js';
import { en, zh } from '../src/client/locales.js';

const mockRoutes: readonly DirectorAllowedRoute[] = [
  { provider: 'deepseek-official', model: 'deepseek-chat', label: 'DeepSeek Chat' },
  { provider: 'deepseek-official', model: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
  { provider: 'openai-proxy', model: 'gpt-4o', label: 'GPT-4o' },
];

const mockTools: readonly string[] = ['bash', 'read', 'write'];

const t = (key: keyof typeof en) => en[key] ?? key;

describe('RoleFormFields component rendering', () => {
  const defaultDraft: RoleDraft = {
    displayName: 'Code Reviewer',
    description: 'Reviews code diffs',
    persona: 'You are an adversarial reviewer',
    provider: 'deepseek-official',
    model: 'deepseek-chat',
    reasoningEffort: 'high',
    toolFilter: { allow: ['bash', 'read'] },
  };

  it('renders all 8 fields with appropriate labels and values', () => {
    const html = renderToStaticMarkup(
      React.createElement(RoleFormFields, {
        id: 'reviewer',
        onIdChange: vi.fn(),
        draft: defaultDraft,
        onDraftChange: vi.fn(),
        routes: mockRoutes,
        tools: mockTools,
        t,
      }),
    );

    // 1. Role ID
    expect(html).toContain(t('roleId'));
    expect(html).toContain('value="reviewer"');
    expect(html).toContain(t('roleIdPlaceholder'));

    // 2. Display Name
    expect(html).toContain(t('roleDisplayName'));
    expect(html).toContain('value="Code Reviewer"');
    expect(html).toContain(t('displayNamePlaceholder'));

    // 3. Description
    expect(html).toContain(t('roleDescription'));
    expect(html).toContain('Reviews code diffs');
    expect(html).toContain(t('descriptionPlaceholder'));

    // 4. Persona
    expect(html).toContain(t('rolePersona'));
    expect(html).toContain('You are an adversarial reviewer');
    expect(html).toContain(t('personaPlaceholder'));

    // 5. Provider
    expect(html).toContain(t('provider'));
    expect(html).toContain('deepseek-official');
    expect(html).toContain('openai-proxy');

    // 6. Model (filtered by provider deepseek-official)
    expect(html).toContain(t('model'));
    expect(html).toContain('deepseek-official/deepseek-chat');
    expect(html).toContain('deepseek-official/deepseek-reasoner');
    // gpt-4o should NOT be in model options because provider is deepseek-official
    expect(html).not.toContain('openai-proxy/gpt-4o');

    // 7. Reasoning Effort
    expect(html).toContain(t('reasoningEffort'));
    expect(html).toContain('value="high"');
    expect(html).toContain('(advisory)');

    // 8. Tool Filter
    expect(html).toContain(t('toolFilter'));
  });

  it('renders idError message when provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(RoleFormFields, {
        id: 'Invalid_ID',
        onIdChange: vi.fn(),
        idError: t('invalidRoleId'),
        draft: defaultDraft,
        onDraftChange: vi.fn(),
        routes: mockRoutes,
        tools: mockTools,
        t,
      }),
    );

    expect(html).toContain(t('invalidRoleId'));
  });

  it('renders localized reasoningEffort advisory placeholder in both en and zh', () => {
    const zhT = (key: keyof typeof zh) => (zh as any)[key] ?? key;
    const enHtml = renderToStaticMarkup(
      React.createElement(RoleFormFields, {
        id: 'reviewer',
        onIdChange: vi.fn(),
        draft: defaultDraft,
        onDraftChange: vi.fn(),
        routes: mockRoutes,
        tools: mockTools,
        t,
      }),
    );
    expect(enHtml).toContain('placeholder="(advisory)"');

    const zhHtml = renderToStaticMarkup(
      React.createElement(RoleFormFields, {
        id: 'reviewer',
        onIdChange: vi.fn(),
        draft: defaultDraft,
        onDraftChange: vi.fn(),
        routes: mockRoutes,
        tools: mockTools,
        t: zhT as any,
      }),
    );
    expect(zhHtml).toContain('placeholder="(仅作建议)"');
  });
});

describe('cascadeProviderChange logic', () => {
  const baseDraft: RoleDraft = {
    displayName: 'Coder',
    description: 'Writes code',
    provider: 'deepseek-official',
    model: 'deepseek-chat',
  };

  it('preserves model if new provider supports it', () => {
    // mockRoutes has deepseek-chat and deepseek-reasoner under deepseek-official
    const next = cascadeProviderChange(baseDraft, 'deepseek-official', mockRoutes);
    expect(next.provider).toBe('deepseek-official');
    expect(next.model).toBe('deepseek-chat');
  });

  it('resets model to empty string if new provider does not support it', () => {
    // openai-proxy only supports gpt-4o
    const next = cascadeProviderChange(baseDraft, 'openai-proxy', mockRoutes);
    expect(next.provider).toBe('openai-proxy');
    expect(next.model).toBe('');
  });

  it('resets model to empty string when provider is cleared to empty', () => {
    const next = cascadeProviderChange(baseDraft, '', mockRoutes);
    expect(next.provider).toBe('');
    expect(next.model).toBe('');
  });
});

describe('Dynamic externalized routes and tools (Anti-hardcoding QA verification)', () => {
  const testDraft: RoleDraft = {
    displayName: 'Tester',
    description: 'Runs QA suites',
    provider: 'custom-provider',
    model: 'custom-model-x',
  };

  it('safely disables provider and model dropdowns when routes array is empty', () => {
    const html = renderToStaticMarkup(
      React.createElement(RoleFormFields, {
        id: 'qa-tester',
        onIdChange: vi.fn(),
        draft: { displayName: 'Tester', description: 'Runs QA' },
        onDraftChange: vi.fn(),
        routes: [],
        tools: [],
        t,
      }),
    );

    // Both provider and model select must be disabled when routes is empty
    const disabledSelects = html.match(/<select[^>]*disabled=""[^>]*>/g);
    expect(disabledSelects).not.toBeNull();
    expect(disabledSelects?.length).toBe(2);
  });

  it('dynamically adapts dropdown options when routes change without modifying code', () => {
    const dynamicRoutes: readonly DirectorAllowedRoute[] = [
      { provider: 'anthropic-enterprise', model: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet Turbo' },
      { provider: 'anthropic-enterprise', model: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku' },
      { provider: 'local-vllm', model: 'qwen-2.5-coder-32b', label: 'Qwen 2.5 Coder 32B' },
    ];

    const html = renderToStaticMarkup(
      React.createElement(RoleFormFields, {
        id: 'qa-tester',
        onIdChange: vi.fn(),
        draft: {
          displayName: 'Tester',
          description: 'Runs QA',
          provider: 'anthropic-enterprise',
          model: 'claude-3-7-sonnet',
        },
        onDraftChange: vi.fn(),
        routes: dynamicRoutes,
        tools: ['custom_exec', 'custom_query'],
        t,
      }),
    );

    // Verify dynamically provided providers and model options are present
    expect(html).toContain('anthropic-enterprise');
    expect(html).toContain('local-vllm');
    expect(html).toContain('anthropic-enterprise/claude-3-7-sonnet');
    expect(html).toContain('anthropic-enterprise/claude-3-5-haiku');

    // Verify no hardcoded default providers or models leaked in
    expect(html).not.toContain('deepseek-official');
    expect(html).not.toContain('openai-proxy');

    // Verify dynamic tools are rendered
    expect(html).toContain('custom_exec');
    expect(html).toContain('custom_query');
    expect(html).not.toContain('bash');
  });
});

describe('Chinese displayName auto-derivation fallback', () => {
  it('falls back to default prefix role when displayName consists entirely of non-ASCII Chinese chars', () => {
    const existing = new Set<string>();
    const derived = roleIdFromName('测试工程师', existing);
    expect(derived).toBe('role');
  });

  it('generates indexed role-N when prefix collision occurs for Chinese displayName', () => {
    const existing = new Set<string>(['role', 'role-2']);
    const derived = roleIdFromName('架构师', existing);
    expect(derived).toBe('role-3');
  });

  it('prefers custom kebab-case ID over Chinese displayName derivation', () => {
    const existing = new Set<string>();
    const resolved = resolveRoleId('qa-lead', '质量负责人', existing);
    expect(resolved).toBe('qa-lead');
  });
});
