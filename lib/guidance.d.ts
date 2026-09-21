/**
 * Main-agent role guidance section (design section 8).
 *
 * Registers a system-prompt section listing the configured Subagent Director
 * role templates so the main agent knows which roles exist, what each does,
 * and how to delegate to one. The section order (117) sits just after
 * dsh-tool-subagent's tool paragraph (116.5) to stay locally associated.
 *
 * Dependency handling: ctx.systemPrompt is optional. When the service is not
 * mounted we skip registration entirely (zero intrusion). When it is mounted
 * but there are no roles, the section text provider renders empty and
 * renderPrompt drops it — the observable AC-6.1 behaviour (no roles, no
 * section) while staying robust to roles appearing at runtime.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SubagentDirectorSettings } from './settings.js';
/** Prompt order: just after dsh-tool-subagent's 116.5 tool section. */
export declare const GUIDANCE_SECTION_ORDER = 117;
/** Stable, unique section name (configuration changes only affect new assemblies). */
export declare const GUIDANCE_SECTION_NAME = "subagent-director:roles";
/**
 * Pure projection of the role settings onto the guidance prose the main agent
 * reads. Returns '' when there are no roles so the assembled section is dropped.
 * @param settings - current resolved settings snapshot.
 * @param toolName - the configured model-facing delegation tool name.
 */
export declare function renderRolesGuidance(settings: SubagentDirectorSettings, toolName: string): string;
/**
 * Register the role guidance section, or no-op when the systemPrompt service
 * is absent. Evalutes roles from the live settings snapshot at each assembly.
 * @param ctx - plugin context.
 * @param getSettings - returns the current settings snapshot.
 * @param toolName - the configured model-facing tool name.
 * @returns the exact section disposer, or undefined when skipped.
 */
export declare function applyGuidance(ctx: Context, getSettings: () => SubagentDirectorSettings, toolName: string): (() => void) | undefined;
//# sourceMappingURL=guidance.d.ts.map