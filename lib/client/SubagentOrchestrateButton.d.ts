import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
export interface SubagentOrchestrateButtonInjected {
    executeCommand: (sessionId: string, commandLine: string) => Promise<string | null>;
}
export declare const NS: 'settings.subagentDirector';
/**
 * Determine the next slash command based on current orchestrate mode.
 * Active ('on') -> '/orchestrate off'
 * Inactive -> '/orchestrate on'
 */
export declare function nextOrchestrateCommand(active: boolean): string;
export type SubagentOrchestrateButtonProps = PropsRuntime<'conversation.input.left'> & Partial<InjectFace<SubagentOrchestrateButtonInjected>> & PropsLocale<typeof NS>;
export interface OrchestrateToggleParams {
    sessionId?: string;
    active: boolean;
    disabled: boolean;
    executeCommand?: (sessionId: string, commandLine: string) => Promise<string | null>;
    isExecutingRef: {
        current: boolean;
    };
    callSeqRef: {
        current: number;
    };
    currentSessionRef: {
        current: string | undefined;
    };
    aliveRef: {
        current: boolean;
    };
    setBusy: (busy: boolean) => void;
    setLastError: (error: string | null) => void;
}
/**
 * Core command execution with synchronous re-entrancy lock and call sequence guard.
 */
export declare function executeOrchestrateToggle(params: OrchestrateToggleParams): Promise<void>;
export declare function SubagentOrchestrateButton(props: SubagentOrchestrateButtonProps): JSX.Element | null;
/**
 * Controller harness for interactive state transitions and race condition testing,
 * avoiding internal React dispatcher monkey-patches.
 */
export declare function createOrchestrateButtonController(initialProps: SubagentOrchestrateButtonProps): {
    isExecutingRef: {
        current: boolean;
    };
    callSeqRef: {
        current: number;
    };
    currentSessionRef: {
        current: import("@deepseek-ai/dsh-session").SessionId;
    };
    aliveRef: {
        current: boolean;
    };
    readonly busy: boolean;
    readonly lastError: string | null;
    getElement: () => {
        props: {
            disabled: boolean;
            title: string;
            'aria-pressed': boolean;
            style: import("react").CSSProperties;
            onClick: () => void;
        };
    } | null;
    click: () => Promise<void>;
    triggerClick: () => void;
    rerender: (newProps: Partial<SubagentOrchestrateButtonProps>) => void;
    unmount: () => void;
};
//# sourceMappingURL=SubagentOrchestrateButton.d.ts.map