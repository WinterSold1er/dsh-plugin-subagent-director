/**
 * Tests for SubagentOrchestrateButton pure logic, static rendering, and interactive behavior.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SubagentOrchestrateButton,
  nextOrchestrateCommand,
  createOrchestrateButtonController,
  type SubagentOrchestrateButtonProps,
} from '../src/client/SubagentOrchestrateButton.js';
import { token } from '../src/client/ui.js';

describe('nextOrchestrateCommand', () => {
  it('returns /orchestrate off when currently active', () => {
    expect(nextOrchestrateCommand(true)).toBe('/orchestrate off');
  });

  it('returns /orchestrate on when currently inactive', () => {
    expect(nextOrchestrateCommand(false)).toBe('/orchestrate on');
  });
});

describe('SubagentOrchestrateButton rendering', () => {
  it('renders nothing when sessionId is absent', () => {
    const html = renderToStaticMarkup(
      React.createElement(SubagentOrchestrateButton, {
        sessionId: undefined as never,
        useProjection: () => undefined,
        executeCommand: vi.fn(),
        t: (k: string) => k,
      } as never)
    );
    expect(html).toBe('');
  });

  it('renders inactive button when projection is off', () => {
    const html = renderToStaticMarkup(
      React.createElement(SubagentOrchestrateButton, {
        sessionId: 'session-1',
        useProjection: () => ({ mode: 'off' }),
        executeCommand: vi.fn(),
        t: (k: string) => k,
      } as never)
    );
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('useSubagents');
  });

  it('renders active button when projection is on', () => {
    const html = renderToStaticMarkup(
      React.createElement(SubagentOrchestrateButton, {
        sessionId: 'session-1',
        useProjection: () => ({ mode: 'on' }),
        executeCommand: vi.fn(),
        t: (k: string) => k,
      } as never)
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('useSubagents');
  });

  it('unconditionally queries orchestrate projection at the top level', () => {
    const useProjectionMock = vi.fn(() => ({ mode: 'off' }));
    renderToStaticMarkup(
      React.createElement(SubagentOrchestrateButton, {
        sessionId: 'session-1',
        useProjection: useProjectionMock,
        executeCommand: vi.fn(),
        t: (k: string) => k,
      } as never)
    );
    expect(useProjectionMock).toHaveBeenCalledWith('orchestrate');
  });

  it('renders button disabled when executeCommand is not ready', () => {
    const html = renderToStaticMarkup(
      React.createElement(SubagentOrchestrateButton, {
        sessionId: 'session-1',
        useProjection: () => ({ mode: 'off' }),
        executeCommand: undefined,
        t: (k: string) => k,
      } as never)
    );
    expect(html).toContain('disabled=""');
  });
});

describe('SubagentOrchestrateButton interactive behavior and state transitions', () => {
  function createHarness(initialProps: SubagentOrchestrateButtonProps) {
    return createOrchestrateButtonController(initialProps);
  }

  it('clicking when inactive dispatches /orchestrate on with the active sessionId', async () => {
    const executeCommandMock = vi.fn().mockResolvedValue(null);
    const harness = createHarness({
      sessionId: 'session-42',
      useProjection: () => ({ mode: 'off' }),
      executeCommand: executeCommandMock,
      t: (k: string) => k,
    } as never);

    await harness.click();
    expect(executeCommandMock).toHaveBeenCalledTimes(1);
    expect(executeCommandMock).toHaveBeenCalledWith('session-42', '/orchestrate on');
    harness.unmount();
  });

  it('clicking when active dispatches /orchestrate off', async () => {
    const executeCommandMock = vi.fn().mockResolvedValue(null);
    const harness = createHarness({
      sessionId: 'session-42',
      useProjection: () => ({ mode: 'on' }),
      executeCommand: executeCommandMock,
      t: (k: string) => k,
    } as never);

    await harness.click();
    expect(executeCommandMock).toHaveBeenCalledTimes(1);
    expect(executeCommandMock).toHaveBeenCalledWith('session-42', '/orchestrate off');
    harness.unmount();
  });

  it('sets lastError and triggers red styling and title update when executeCommand returns an error string', async () => {
    const executeCommandMock = vi.fn().mockResolvedValue('Access denied: mode locked');
    const harness = createHarness({
      sessionId: 'session-1',
      useProjection: () => ({ mode: 'off' }),
      executeCommand: executeCommandMock,
      t: (k: string) => (k === 'useSubagentsInactiveTitle' ? 'Turn on orchestrate mode' : k),
    } as never);

    await harness.click();

    const element = harness.getElement();
    expect(element).not.toBeNull();
    expect(element!.props.style.background).toBe('#fee2e2');
    expect(element!.props.style.border).toBe('1px solid #e05252');
    expect(element!.props.style.color).toBe('#b91c1c');
    expect(element!.props.title).toBe('Turn on orchestrate mode (Access denied: mode locked)');
    harness.unmount();
  });

  it('sets lastError and triggers red styling when executeCommand throws an exception', async () => {
    const executeCommandMock = vi.fn().mockRejectedValue(new Error('Network transport failed'));
    const harness = createHarness({
      sessionId: 'session-1',
      useProjection: () => ({ mode: 'off' }),
      executeCommand: executeCommandMock,
      t: (k: string) => (k === 'useSubagentsInactiveTitle' ? 'Turn on orchestrate mode' : k),
    } as never);

    await harness.click();

    const element = harness.getElement();
    expect(element).not.toBeNull();
    expect(element!.props.style.background).toBe('#fee2e2');
    expect(element!.props.style.color).toBe('#b91c1c');
    expect(element!.props.title).toContain('Network transport failed');
    harness.unmount();
  });

  it('clears lastError automatically when sessionId changes', async () => {
    const executeCommandMock = vi.fn().mockResolvedValue('Temporary failure');
    const harness = createHarness({
      sessionId: 'session-1',
      useProjection: () => ({ mode: 'off' }),
      executeCommand: executeCommandMock,
      t: (k: string) => (k === 'useSubagentsInactiveTitle' ? 'Turn on' : k),
    } as never);

    await harness.click();
    expect(harness.getElement()!.props.style.background).toBe('#fee2e2');

    // Switch session: sessionId change triggers useEffect to clear lastError
    harness.rerender({ sessionId: 'session-2' });

    const updated = harness.getElement();
    expect(updated!.props.style.background).toBe('transparent');
    expect(updated!.props.style.border).toBe('1px solid ' + token.border);
    expect(updated!.props.title).toBe('Turn on');
    harness.unmount();
  });

  it('clears lastError automatically when orchestrate mode changes externally', async () => {
    const executeCommandMock = vi.fn().mockResolvedValue('Command refused');
    const harness = createHarness({
      sessionId: 'session-1',
      useProjection: () => ({ mode: 'off' }),
      executeCommand: executeCommandMock,
      t: (k: string) => (k === 'useSubagentsActiveTitle' ? 'Turn off' : k === 'useSubagentsInactiveTitle' ? 'Turn on' : k),
    } as never);

    await harness.click();
    expect(harness.getElement()!.props.style.background).toBe('#fee2e2');

    // Orchestrate mode changes externally (e.g. from slash command executed elsewhere)
    harness.rerender({ useProjection: () => ({ mode: 'on' }) });

    const updated = harness.getElement();
    expect(updated!.props.style.background).toBe(token.accent);
    expect(updated!.props.style.color).toBe('#ffffff');
    expect(updated!.props.title).toBe('Turn off');
    harness.unmount();
  });

  it('clears busy state immediately when switching to another session while toggle is in flight', () => {
    // Hang the command execution to simulate an in-flight network call
    const executeCommandMock = vi.fn().mockImplementation(() => new Promise(() => {}));
    const harness = createHarness({
      sessionId: 'session-1',
      useProjection: () => ({ mode: 'off' }),
      executeCommand: executeCommandMock,
      t: (k: string) => k,
    } as never);

    // Click in session-1: button becomes busy and disabled
    harness.triggerClick();
    expect(harness.getElement()!.props.disabled).toBe(true);

    // Switch to session-2 while session-1 call is still in flight: busy must reset to false
    harness.rerender({ sessionId: 'session-2' });
    const session2El = harness.getElement();
    expect(session2El!.props.disabled).toBe(false);
    expect(session2El!.props.style.opacity).toBe(1);
    harness.unmount();
  });

  it('discards late error string from previous session when session has changed', async () => {
    let resolveCommand!: (err: string | null) => void;
    const executeCommandMock = vi.fn().mockImplementation(() => new Promise<string | null>((res) => {
      resolveCommand = res;
    }));

    const harness = createHarness({
      sessionId: 'session-1',
      useProjection: () => ({ mode: 'off' }),
      executeCommand: executeCommandMock,
      t: (k: string) => (k === 'useSubagentsInactiveTitle' ? 'Turn on' : k),
    } as never);

    // Trigger click in session-1
    harness.triggerClick();
    expect(harness.getElement()!.props.disabled).toBe(true);

    // Switch to session-2 before command completes
    harness.rerender({ sessionId: 'session-2' });
    expect(harness.getElement()!.props.disabled).toBe(false);

    // session-1's call finishes with an error
    resolveCommand('Session 1 timeout error');
    await new Promise((r) => setTimeout(r, 20));

    // Re-render and assert that session-2 was NOT polluted by session-1's error
    harness.rerender({});
    const session2El = harness.getElement();
    expect(session2El!.props.style.background).toBe('transparent');
    expect(session2El!.props.style.border).toBe('1px solid ' + token.border);
    expect(session2El!.props.title).toBe('Turn on');
    harness.unmount();
  });

  it('discards late exception from previous session when session has changed', async () => {
    let rejectCommand!: (err: Error) => void;
    const executeCommandMock = vi.fn().mockImplementation(() => new Promise((_, rej) => {
      rejectCommand = rej;
    }));

    const harness = createHarness({
      sessionId: 'session-1',
      useProjection: () => ({ mode: 'off' }),
      executeCommand: executeCommandMock,
      t: (k: string) => (k === 'useSubagentsInactiveTitle' ? 'Turn on' : k),
    } as never);

    // Trigger click in session-1
    harness.triggerClick();
    expect(harness.getElement()!.props.disabled).toBe(true);

    // Switch to session-2 before command rejects
    harness.rerender({ sessionId: 'session-2' });
    expect(harness.getElement()!.props.disabled).toBe(false);

    // session-1's call throws / rejects
    rejectCommand(new Error('Fatal connection drop in old session'));
    await new Promise((r) => setTimeout(r, 20));

    // Re-render and assert that session-2 was NOT polluted by session-1's exception
    harness.rerender({});
    const session2El = harness.getElement();
    expect(session2El!.props.style.background).toBe('transparent');
    expect(session2El!.props.style.color).toBe(token.labelPrimary);
    expect(session2El!.props.title).toBe('Turn on');
    harness.unmount();
  });

  it('synchronous lock (isExecutingRef) prevents concurrent command execution on rapid double click', async () => {
    let resolveCommand!: (err: string | null) => void;
    const executeCommandMock = vi.fn().mockImplementation(() => new Promise<string | null>((res) => {
      resolveCommand = res;
    }));
    const harness = createHarness({
      sessionId: 'session-1',
      useProjection: () => ({ mode: 'off' }),
      executeCommand: executeCommandMock,
      t: (k: string) => k,
    } as never);

    // First click triggers command execution
    harness.triggerClick();
    expect(executeCommandMock).toHaveBeenCalledTimes(1);

    // Second rapid click while first is still in flight: isExecutingRef synchronous lock blocks it!
    harness.triggerClick();
    expect(executeCommandMock).toHaveBeenCalledTimes(1);

    // Complete the first in-flight command
    resolveCommand(null);
    await new Promise((r) => setTimeout(r, 20));

    // After completion, isExecutingRef is false, permitting the next toggle
    harness.triggerClick();
    expect(executeCommandMock).toHaveBeenCalledTimes(2);
    harness.unmount();
  });

  it('callSeqRef discards orphan response when switching session A -> B -> A', async () => {
    let resolveSession1Call!: (err: string | null) => void;
    const executeCommandMock = vi.fn().mockImplementation(() => new Promise<string | null>((res) => {
      resolveSession1Call = res;
    }));
    const harness = createHarness({
      sessionId: 'session-A',
      useProjection: () => ({ mode: 'off' }),
      executeCommand: executeCommandMock,
      t: (k: string) => (k === 'useSubagentsInactiveTitle' ? 'Turn on' : k),
    } as never);

    // In session A, click to trigger command
    harness.triggerClick();
    expect(harness.getElement()!.props.disabled).toBe(true);

    // Rapidly switch to session B, then switch back to session A
    harness.rerender({ sessionId: 'session-B' });
    harness.rerender({ sessionId: 'session-A' });

    // Stale call for session A from before the switch now resolves with error
    resolveSession1Call('Stale timeout error from original session-A visit');
    await new Promise((r) => setTimeout(r, 20));

    // Assert: error from stale call is ignored, not displayed on session-A
    const el = harness.getElement();
    expect(el!.props.style.background).toBe('transparent');
    expect(el!.props.style.border).toBe('1px solid ' + token.border);
    expect(el!.props.title).toBe('Turn on');
    harness.unmount();
  });
});
