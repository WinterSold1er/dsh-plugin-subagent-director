import { assertSubagentMaxDepth } from '@deepseek-ai/dsh-subagent';
import { createDelegationTool } from './delegation-tool.js';
import { CLOSE_SUBAGENT_TOOL_NAME, createCloseSubagentTool } from './close-tool.js';
import { applyGuidance } from './guidance.js';
import { applyOrchestrate } from './orchestrate.js';
import { readDirectorSettings, installDirectorSettingsPage, createSettingsWarner, resolveLayeredEnforcement } from './settings.js';
export { Config } from './config.js';
export { assertDelegationCapabilities, buildSubagentRequest, createDelegationParameters, createDelegationOutputSchema, createDelegationTool, DELEGATION_TOOL_PREFIX, resolveDelegationMode, renderDelegationResult, } from './delegation-tool.js';
export { applyGuidance, renderRolesGuidance, GUIDANCE_SECTION_ORDER, GUIDANCE_SECTION_NAME } from './guidance.js';
export { applyOrchestrate, renderOrchestratorPrompt, renderOrchestratorRoles, renderOrchestratorUnavailableNotice, buildOrchestratorFrame, detectOrchestrateRequest, ORCHESTRATE_SECTION_NAME, ORCHESTRATE_SECTION_ORDER, ORCHESTRATE_PROJECTION_KEY, ORCHESTRATE_EVENT_TYPE, ORCHESTRATE_VALID_MODES, } from './orchestrate.js';
export { CLOSE_SUBAGENT_TOOL_NAME, createCloseSubagentTool } from './close-tool.js';
export { SUBAGENT_DIRECTOR_SETTINGS_NAMESPACE, SettingsSchema, validateDirectorSettings, installDirectorSettingsPage, readDirectorSettings, settingsWarnings, danglingDefaultRoleWarning, createSettingsWarner, } from './settings.js';
export const name = 'subagent-director';
export const inject = ['tools', 'subagents', 'llm', 'settings'];
export function apply(ctx, config) {
    const backgroundMode = config.backgroundMode ?? 'one-shot';
    const toolName = config.toolName ?? 'subagent_role';
    const providerName = config.subagentProvider ?? 'spawn';
    // NOTE: the /subagent-director settings bridge route is installed by the
    // separate `subagent-director-bridge` plugin entry (src/bridge-entry.ts),
    // which injects webServer — tree-external plugins cannot see that service
    // through ctx.get(). The main entry must not touch webServer, or headless
    // profiles would lose the delegation tool.
    // ---- settings (0.1.7: plugin Config schema, volatile = live) ------------
    // 设置声明为插件 Config schema（src/config.ts 的 SettingsFields），读取用
    // `config.<field>.get()`；写入经 configEditor 就地更新引用，插件无需重启即
    // 生效（设置面板改动即时生效）。页面策略 auto:false = 使用插件自建 UI。
    installDirectorSettingsPage(ctx);
    // Single settings-read chokepoint for every consumer (guidance / orchestrate
    // / resolver). Read-time warnings — currently a dangling defaultRole the
    // 0.1.7 write path admits — are logged here, deduped by warning-set signature
    // (persistent misconfiguration warns once, not on every read).
    const warnSettings = createSettingsWarner((message) => ctx.logger.warn('[' + name + '] ' + message));
    const getSettings = () => {
        const warnings = [];
        const settings = readDirectorSettings(config, warnings);
        warnSettings(warnings);
        return settings;
    };
    // ---- role guidance ----------------------------------------------------
    applyGuidance(ctx, getSettings, toolName);
    // ---- orchestrate command + projection + prompt section + tool guard ----
    // Enforcement resolution (layered, strict-at-the-bottom):
    //   1. user setting when toggled in the settings UI;
    //   2. else the plugin mount config (DirectorConfig.orchestrateEnforcement);
    //   3. else 'strict' (the documented fail-closed baseline).
    // Prompt frame and tool guard read this single resolved value so they always
    // agree (no false ENFORCED claim).
    const resolveEnforcement = () => {
        return resolveLayeredEnforcement(config, getSettings());
    };
    applyOrchestrate(ctx, getSettings, toolName, {
        readOnlyTools: config.orchestrateReadOnlyTools,
        getEnforcement: resolveEnforcement,
    });
    // ---- close_subagent tool ----------------------------------------------
    // Provider-independent (drain is a global subagents operation), so it
    // registers at mount time like the control tools; on a deployment without
    // continuable children it is a safe no-op.
    ctx.effect(() => ctx.tools.register(createCloseSubagentTool({ ctx })), 'subagent-director: close_subagent tool');
    // ---- delegation tool registration ------------------------------------
    if (typeof config.maxDepth === 'number')
        assertSubagentMaxDepth(config.maxDepth);
    let disposeTool;
    const mount = (provider) => {
        if (typeof config.maxDepth === 'number' && !provider.capabilities.depthLimit) {
            throw new Error('subagent-director: provider "' + provider.name + '" cannot enforce maxDepth (no depthLimit capability) — set maxDepth: \'provider-managed\'');
        }
        if (backgroundMode === 'continuable' && provider.prepareContinuable === undefined) {
            throw new Error('subagent-director: provider "' + provider.name + '" does not support backgroundMode: continuable — switch the subagent provider or use backgroundMode: "one-shot"');
        }
        ctx.logger.info('[' + name + '] registering ' + toolName + ' on subagent transport ' + '"' + providerName + '"' + ' with backgroundMode ' + '"' + backgroundMode + '"');
        disposeTool = ctx.tools.register(createDelegationTool({ ctx, config, provider, getSettings }));
    };
    ctx.on('subagent/provider-added', (provider) => {
        if (provider.name === providerName && disposeTool === undefined)
            mount(provider);
    });
    ctx.on('subagent/provider-removed', (name2) => {
        if (name2 !== providerName || disposeTool === undefined)
            return;
        disposeTool();
        disposeTool = undefined;
    });
    const present = ctx.subagents.getProvider(providerName);
    if (present !== undefined)
        mount(present);
    else
        ctx.logger.info('[' + name + '] subagent provider ' + '"' + providerName + '" not registered yet; the "' + toolName + '" tool will register when it appears');
}
//# sourceMappingURL=index.js.map