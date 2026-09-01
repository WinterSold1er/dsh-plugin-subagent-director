function isEmpty(value) {
    return value === undefined || value === '';
}
/**
 * Whether a tool filter actually restricts anything. dsh-settings materializes
 * an absent `toolFilter` as `{ allow: [], deny: [] }` (issue #2), so a filter
 * whose allow/deny are both empty is treated as unconfigured — writing it into
 * a SubagentStartRequest would make the core restrict all tools (tools=0).
 */
export function hasToolFilter(filter) {
    return filter !== undefined && ((filter.allow?.length ?? 0) > 0 || (filter.deny?.length ?? 0) > 0);
}
/** Core pure resolution logic. */
export function resolveRoute(input) {
    const { args = {}, settings, parent } = input;
    const warnings = [];
    // ---- Layer 1: per-call explicit arguments -------------------------------
    const callProvider = isEmpty(args.provider) ? undefined : args.provider;
    const callModel = isEmpty(args.model) ? undefined : args.model;
    const callEffort = isEmpty(args.reasoningEffort) ? undefined : args.reasoningEffort;
    // ---- Layer 2: role template ----------------------------------------------
    const roles = settings.roles ?? {};
    const explicitRole = isEmpty(args.role) ? undefined : args.role;
    const roleIdRaw = explicitRole ?? settings.defaultRole;
    let role;
    let resolvedRoleId;
    if (roleIdRaw !== undefined) {
        const bound = roles[roleIdRaw];
        if (bound !== undefined) {
            role = bound;
            resolvedRoleId = roleIdRaw;
        }
        else {
            const byDisplay = Object.entries(roles).find(([, candidate]) => candidate?.displayName === roleIdRaw);
            if (byDisplay !== undefined) {
                role = byDisplay[1];
                resolvedRoleId = byDisplay[0];
                warnings.push('subagent-director: role "' + roleIdRaw + '" is not an id; resolved by displayName to id "' + resolvedRoleId + '" — prefer passing the id directly');
                const dupes = Object.entries(roles).filter(([id, candidate]) => id !== resolvedRoleId && candidate?.displayName === roleIdRaw);
                if (dupes.length > 0) {
                    warnings.push('subagent-director: multiple roles share displayName "' + roleIdRaw + '"; using id "' + resolvedRoleId + '"');
                }
            }
            else {
                warnings.push('subagent-director: role "' + roleIdRaw + '" does not exist; its binding (persona/provider/model) is skipped');
            }
        }
    }
    const roleProvider = role === undefined || isEmpty(role.provider) ? undefined : role.provider;
    const roleModel = role === undefined || isEmpty(role.model) ? undefined : role.model;
    const roleEffort = role === undefined || isEmpty(role.reasoningEffort) ? undefined : role.reasoningEffort;
    // ---- Layer 3: plugin defaults ----------------------------------------------
    const defaultProvider = isEmpty(settings.defaultProvider) ? undefined : settings.defaultProvider;
    const defaultModel = isEmpty(settings.defaultModel) ? undefined : settings.defaultModel;
    const defaultEffort = isEmpty(settings.defaultReasoningEffort)
        ? undefined
        : settings.defaultReasoningEffort;
    // ---- Field-level resolution: highest-priority layer per field --------------
    const provider = callProvider ?? roleProvider ?? defaultProvider;
    const model = callModel ?? roleModel ?? defaultModel;
    const reasoningEffort = callEffort ?? roleEffort ?? defaultEffort;
    // ---- Build the output -------------------------------------------------------
    const agentOptions = provider !== undefined || model !== undefined
        ? {
            ...(provider !== undefined ? { provider } : {}),
            ...(model !== undefined ? { model } : {}),
        }
        : undefined;
    // Determine the dominant (highest-priority) contributing layer for agentOptions.
    let layer = 'inherit';
    if (provider !== undefined || model !== undefined) {
        if (callProvider !== undefined || callModel !== undefined) {
            layer = 'call';
        }
        else if (roleProvider !== undefined || roleModel !== undefined) {
            layer = 'role';
        }
        else {
            layer = 'default';
        }
    }
    return {
        layer,
        ...(agentOptions !== undefined ? { agentOptions } : {}),
        ...(reasoningEffort !== undefined ? { reasoningEffort } : {}),
        ...(resolvedRoleId !== undefined ? { roleId: resolvedRoleId } : {}),
        ...(role !== undefined && !isEmpty(role.persona) ? { persona: role.persona } : {}),
        ...(role !== undefined && hasToolFilter(role.toolFilter) ? { toolFilter: role.toolFilter } : {}),
        warnings,
    };
}
//# sourceMappingURL=route-resolver.js.map