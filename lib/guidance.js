/** Prompt order: just after dsh-tool-subagent's 116.5 tool section. */
export const GUIDANCE_SECTION_ORDER = 117;
/** Stable, unique section name (configuration changes only affect new assemblies). */
export const GUIDANCE_SECTION_NAME = 'subagent-director:roles';
/**
 * Pure projection of the role settings onto the guidance prose the main agent
 * reads. Returns '' when there are no roles so the assembled section is dropped.
 * @param settings - current resolved settings snapshot.
 * @param toolName - the configured model-facing delegation tool name.
 */
export function renderRolesGuidance(settings, toolName) {
    const roles = settings.roles ?? {};
    const entries = Object.entries(roles).filter(([, role]) => role !== undefined);
    if (entries.length === 0)
        return '';
    const lines = [
        'Subagent Director roles — delegate one of these role-bound subagents when the task matches its description. Each role may bind a model; when it does, the subagent runs on that model route.',
        'Reference roles by their id (shown in the Delegate line), never by display name; when the user names a role by its display name, map it to that id.',
    ];
    for (const [id, role] of entries) {
        const bound = role.provider !== undefined && role.provider !== '' ?
            role.model !== undefined && role.model !== '' ? ` (model: ${role.provider}/${role.model})` : ` (provider: ${role.provider})` :
            '';
        lines.push(`- ${role.displayName || id}${bound}: ${role.description}`);
        lines.push(`    Delegate with: ${toolName}({ role: "${id}", prompt: "..." })`);
    }
    return lines.join('\n');
}
/**
 * Register the role guidance section, or no-op when the systemPrompt service
 * is absent. Evalutes roles from the live settings snapshot at each assembly.
 * @param ctx - plugin context.
 * @param getSettings - returns the current settings snapshot.
 * @param toolName - the configured model-facing tool name.
 * @returns the exact section disposer, or undefined when skipped.
 */
export function applyGuidance(ctx, getSettings, toolName) {
    const systemPrompt = ctx.get('systemPrompt');
    if (systemPrompt === undefined)
        return undefined;
    return systemPrompt.section({
        name: GUIDANCE_SECTION_NAME,
        order: GUIDANCE_SECTION_ORDER,
        text: () => renderRolesGuidance(getSettings(), toolName),
    });
}
//# sourceMappingURL=guidance.js.map