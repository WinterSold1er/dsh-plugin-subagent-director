import { ReasoningEffortId } from '@deepseek-ai/dsh-llm';
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
/**
 * Whether a provider/model route is admitted by an authorized route list.
 * An absent or empty list admits everything (no constraint); with a list a
 * route must be an EXACT listed pair — a partial route cannot be admitted.
 */
export function isRouteAllowed(route, allowedRoutes) {
    if (allowedRoutes === undefined || allowedRoutes.length === 0)
        return true;
    if (route.provider === undefined || route.model === undefined)
        return false;
    return allowedRoutes.some((entry) => entry.provider === route.provider && entry.model === route.model);
}
/** Core pure resolution logic. */
export function resolveRoute(input) {
    const { args = {}, settings, parent, allowedRoutes } = input;
    const warnings = [];
    const routeList = allowedRoutes !== undefined && allowedRoutes.length > 0 ? allowedRoutes : undefined;
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
    // ---- Authorized-list constraint (official subagent-model-selection) --------
    // An EXPLICIT call pair must be an exact listed pair; provider and model are
    // one route and must be supplied together (mirrors dsh-tool-subagent's
    // requestedAgentOptions). A role/default route not on the list is dropped.
    const explicitRoutePair = callProvider !== undefined && callModel !== undefined;
    if (routeList !== undefined) {
        if ((callProvider !== undefined) !== (callModel !== undefined)) {
            throw new Error('subagent-director: provider and model must be supplied together when an authorized model list is configured');
        }
        if (explicitRoutePair && !isRouteAllowed({ provider: callProvider, model: callModel }, routeList)) {
            throw new Error('subagent-director: LLM route ' + callProvider + '/' + callModel +
                ' is not in the authorized model list (subagent-model-selection.allowedModels)');
        }
    }
    // ---- Field-level resolution: highest-priority layer per field --------------
    let provider = callProvider ?? roleProvider ?? defaultProvider;
    let model = callModel ?? roleModel ?? defaultModel;
    // A non-explicit route that is not authorized is dropped entirely (inherit);
    // persona/toolFilter are NOT route fields and survive the drop.
    if (routeList !== undefined &&
        !explicitRoutePair &&
        (provider !== undefined || model !== undefined) &&
        !isRouteAllowed({ provider, model }, routeList)) {
        const described = provider !== undefined && model !== undefined
            ? provider + '/' + model
            : String(provider ?? model ?? '(partial)');
        if (roleProvider !== undefined || roleModel !== undefined) {
            warnings.push('subagent-director: role "' + (resolvedRoleId ?? 'unknown') + '" binds LLM route ' + described +
                ' which is not in the authorized model list; route fields dropped (subagent inherits the parent model)');
        }
        else {
            warnings.push('subagent-director: defaultProvider/defaultModel ' + described +
                ' are not in the authorized model list; skipped (subagent inherits the parent model)');
        }
        provider = undefined;
        model = undefined;
    }
    const reasoningEffort = callEffort ?? roleEffort ?? defaultEffort;
    // alpha.4 AgentOptions carries reasoningEffort. It rides agentOptions only
    // when a route was resolved OR the effort itself was explicit (call layer):
    // route-owned (role/default) effort of a dropped/changed route stays out.
    const routeAdmitted = provider !== undefined || model !== undefined;
    const includeEffort = reasoningEffort !== undefined && (routeAdmitted || callEffort !== undefined);
    // ---- Build the output -------------------------------------------------------
    const agentOptions = routeAdmitted || includeEffort
        ? {
            ...(provider !== undefined ? { provider } : {}),
            ...(model !== undefined ? { model } : {}),
            ...(includeEffort && reasoningEffort !== undefined
                ? { reasoningEffort: ReasoningEffortId(reasoningEffort) }
                : {}),
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
    else if (includeEffort) {
        // effort-only: only an explicit call effort can land here
        layer = 'call';
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