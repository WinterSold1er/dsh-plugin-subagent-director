function isEmpty(value) {
    return value === undefined || value === '';
}
export function resolveSeamAgentOptions(input) {
    const { agentOptions, settings, isRoutable } = input;
    if (agentOptions !== undefined && (agentOptions.provider !== undefined || agentOptions.model !== undefined)) {
        return undefined;
    }
    const provider = settings.defaultProvider;
    const model = settings.defaultModel;
    if (isEmpty(provider) || isEmpty(model))
        return undefined;
    if (isRoutable !== undefined && !isRoutable(provider))
        return undefined;
    return { provider, model };
}
function makeIsRoutable(ctx) {
    const llm = ctx.get('llm');
    if (llm === undefined)
        return undefined;
    return (provider) => llm.listProviders().some((entry) => entry.id === provider);
}
/**
 * Wrap `ctx.subagents.start` / `startContinuable` so a subagent start without
 * explicit `agentOptions` receives the configured defaults. Returns a disposer
 * that restores the original methods (registered via `ctx.effect` by the
 * caller, so it runs when the plugin fiber unloads).
 */
export function applyDefaultRouteSeam(ctx, getSettings) {
    const subagents = ctx.subagents;
    const originalStart = subagents.start;
    const originalStartContinuable = subagents.startContinuable;
    const isRoutable = makeIsRoutable(ctx);
    const resolve = (request) => resolveSeamAgentOptions({ agentOptions: request.agentOptions, settings: getSettings(), isRoutable });
    subagents.start = (name, request) => {
        const agentOptions = resolve(request);
        if (agentOptions !== undefined) {
            ctx.logger.info(`[subagent-director] default route seam: applying ${agentOptions.provider}/${agentOptions.model} to ${name} subagent`);
            return originalStart.call(subagents, name, { ...request, agentOptions });
        }
        return originalStart.call(subagents, name, request);
    };
    subagents.startContinuable = (spec) => {
        const agentOptions = resolve(spec.request);
        if (agentOptions !== undefined) {
            ctx.logger.info(`[subagent-director] default route seam: applying ${agentOptions.provider}/${agentOptions.model} to continuable subagent`);
            return originalStartContinuable.call(subagents, { ...spec, request: { ...spec.request, agentOptions } });
        }
        return originalStartContinuable.call(subagents, spec);
    };
    return () => {
        subagents.start = originalStart;
        subagents.startContinuable = originalStartContinuable;
    };
}
//# sourceMappingURL=default-route.js.map