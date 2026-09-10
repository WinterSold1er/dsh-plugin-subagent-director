/**
 * Subagent Director — "Use Subagents" conversation input action button.
 *
 * Contributes a button to the `conversation.input.left` slot in the conversation input bar.
 * Clicking the button toggles orchestrate mode (/orchestrate on / /orchestrate off),
 * and bi-directionally synchronizes with the current session's orchestrate projection state
 * to show active/inactive visual status.
 */
import { useState, useRef, useEffect } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SubagentDirectorKey } from './locales.js';
import { token } from './ui.js';

export interface SubagentOrchestrateButtonInjected {
  executeCommand: (sessionId: string, commandLine: string) => Promise<string | null>;
}

export const NS = 'settings.subagentDirector' as const;

/**
 * Determine the next slash command based on current orchestrate mode.
 * Active ('on') -> '/orchestrate off'
 * Inactive -> '/orchestrate on'
 */
export function nextOrchestrateCommand(active: boolean): string {
  return active ? '/orchestrate off' : '/orchestrate on';
}

export type SubagentOrchestrateButtonProps = PropsRuntime<'conversation.input.left'> &
  Partial<InjectFace<SubagentOrchestrateButtonInjected>> &
  PropsLocale<typeof NS>;

export interface OrchestrateToggleParams {
  sessionId?: string;
  active: boolean;
  disabled: boolean;
  executeCommand?: (sessionId: string, commandLine: string) => Promise<string | null>;
  isExecutingRef: { current: boolean };
  callSeqRef: { current: number };
  currentSessionRef: { current: string | undefined };
  aliveRef: { current: boolean };
  setBusy: (busy: boolean) => void;
  setLastError: (error: string | null) => void;
}

/**
 * Core command execution with synchronous re-entrancy lock and call sequence guard.
 */
export async function executeOrchestrateToggle(params: OrchestrateToggleParams): Promise<void> {
  const {
    sessionId,
    active,
    disabled,
    executeCommand,
    isExecutingRef,
    callSeqRef,
    currentSessionRef,
    aliveRef,
    setBusy,
    setLastError,
  } = params;

  if (disabled || !executeCommand || !sessionId || isExecutingRef.current) return;
  isExecutingRef.current = true;
  const targetSession = sessionId;
  const seq = ++callSeqRef.current;
  setBusy(true);
  setLastError(null);
  try {
    // Toggle orchestrator mode: on -> off, off -> on
    const nextCmd = nextOrchestrateCommand(active);
    const err = await executeCommand(targetSession, nextCmd);
    if (aliveRef.current && currentSessionRef.current === targetSession && callSeqRef.current === seq) {
      if (err) {
        setLastError(err);
      }
    }
  } catch (e) {
    if (aliveRef.current && currentSessionRef.current === targetSession && callSeqRef.current === seq) {
      setLastError(e instanceof Error ? e.message : String(e));
    }
  } finally {
    if (callSeqRef.current === seq) {
      isExecutingRef.current = false;
      if (aliveRef.current && currentSessionRef.current === targetSession) {
        setBusy(false);
      }
    }
  }
}

export function SubagentOrchestrateButton(props: SubagentOrchestrateButtonProps): JSX.Element | null {
  const { useProjection, sessionId, executeCommand, t } = props;
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const aliveRef = useRef(true);
  const currentSessionRef = useRef<string | undefined>(sessionId);
  const isExecutingRef = useRef(false);
  const callSeqRef = useRef(0);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Bi-directional state synchronization via the session's orchestrate projection.
  // React Rules of Hooks: must call hook unconditionally at the top level.
  const orchestrate = useProjection('orchestrate') as { mode?: 'on' | 'off' } | undefined;
  const active = orchestrate?.mode === 'on';

  // Synchronize currentSessionRef and clear busy/lastError when session changes.
  useEffect(() => {
    currentSessionRef.current = sessionId;
    callSeqRef.current += 1;
    isExecutingRef.current = false;
    setLastError(null);
    setBusy(false);
  }, [sessionId]);

  // Clear stale lastError when orchestrate mode changes externally.
  useEffect(() => {
    setLastError(null);
  }, [orchestrate?.mode]);

  // Early exit only AFTER all hooks have executed unconditionally
  if (!sessionId) return null;

  const isReady = Boolean(executeCommand);
  const disabled = busy || !isReady;

  const toggle = (): Promise<void> =>
    executeOrchestrateToggle({
      sessionId,
      active,
      disabled,
      executeCommand,
      isExecutingRef,
      callSeqRef,
      currentSessionRef,
      aliveRef,
      setBusy,
      setLastError,
    });

  const baseTitle = active ? t('useSubagentsActiveTitle') : t('useSubagentsInactiveTitle');
  const title = lastError ? `${baseTitle} (${lastError})` : baseTitle;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 24,
        padding: '0 8px',
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: lastError
          ? '1px solid #e05252'
          : active
          ? '1px solid ' + token.accent
          : '1px solid ' + token.border,
        background: lastError ? '#fee2e2' : active ? token.accent : 'transparent',
        color: lastError ? '#b91c1c' : active ? '#ffffff' : token.labelPrimary,
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      <svg
        viewBox="0 0 16 16"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="4" cy="4" r="2" />
        <circle cx="12" cy="4" r="2" />
        <circle cx="8" cy="12" r="2" />
        <path d="M4 6v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
        <path d="M8 10v0" />
      </svg>
      <span>{t('useSubagents')}</span>
    </button>
  );
}

/**
 * Controller harness for interactive state transitions and race condition testing,
 * avoiding internal React dispatcher monkey-patches.
 */
export function createOrchestrateButtonController(initialProps: SubagentOrchestrateButtonProps) {
  let props = { ...initialProps };
  let busy = false;
  let lastError: string | null = null;
  const isExecutingRef = { current: false };
  const callSeqRef = { current: 0 };
  const currentSessionRef = { current: props.sessionId };
  const aliveRef = { current: true };

  const getActive = () => {
    const orchestrate = props.useProjection('orchestrate') as { mode?: 'on' | 'off' } | undefined;
    return orchestrate?.mode === 'on';
  };

  const getElementProps = () => {
    if (!props.sessionId) return null;
    const active = getActive();
    const isReady = Boolean(props.executeCommand);
    const disabled = busy || !isReady;
    const baseTitle = active ? props.t('useSubagentsActiveTitle') : props.t('useSubagentsInactiveTitle');
    const title = lastError ? `${baseTitle} (${lastError})` : baseTitle;
    const style: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      height: 24,
      padding: '0 8px',
      fontSize: 12,
      fontWeight: 500,
      borderRadius: 6,
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: lastError
        ? '1px solid #e05252'
        : active
        ? '1px solid ' + token.accent
        : '1px solid ' + token.border,
      background: lastError ? '#fee2e2' : active ? token.accent : 'transparent',
      color: lastError ? '#b91c1c' : active ? '#ffffff' : token.labelPrimary,
      opacity: disabled ? 0.6 : 1,
      transition: 'all 0.15s ease',
    };
    return {
      disabled,
      title,
      'aria-pressed': active,
      style,
      onClick: () => {
        void toggle();
      },
    };
  };

  async function toggle(): Promise<void> {
    const active = getActive();
    const isReady = Boolean(props.executeCommand);
    const disabled = busy || !isReady;
    await executeOrchestrateToggle({
      sessionId: props.sessionId,
      active,
      disabled,
      executeCommand: props.executeCommand,
      isExecutingRef,
      callSeqRef,
      currentSessionRef,
      aliveRef,
      setBusy: (b) => {
        busy = b;
      },
      setLastError: (e) => {
        lastError = e;
      },
    });
  }

  return {
    isExecutingRef,
    callSeqRef,
    currentSessionRef,
    aliveRef,
    get busy() {
      return busy;
    },
    get lastError() {
      return lastError;
    },
    getElement: () => {
      const p = getElementProps();
      if (!p) return null;
      return { props: p };
    },
    click: async () => {
      await toggle();
      await new Promise((r) => setTimeout(r, 10));
    },
    triggerClick: () => {
      void toggle();
    },
    rerender: (newProps: Partial<SubagentOrchestrateButtonProps>) => {
      const oldSession = props.sessionId;
      const oldMode = getActive();
      props = { ...props, ...newProps };
      if (newProps.sessionId !== undefined && newProps.sessionId !== oldSession) {
        currentSessionRef.current = newProps.sessionId;
        callSeqRef.current += 1;
        isExecutingRef.current = false;
        lastError = null;
        busy = false;
      }
      const newMode = getActive();
      if (newMode !== oldMode) {
        lastError = null;
      }
    },
    unmount: () => {
      aliveRef.current = false;
    },
  };
}
