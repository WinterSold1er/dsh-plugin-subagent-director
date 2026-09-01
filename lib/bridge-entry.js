import { installDirectorRemoteBridge } from './remote.js';
/** Cordis plugin name for the bridge entry. */
export const name = 'subagent-director-bridge';
/** Required services: webServer (route owner), settings (data seam), and the
 * agent/subagent services backing the subagentClose endpoint (drain needs the
 * exact live parent Agent). agents/subagents are dsh-base-level services that
 * every profile mounts; headless profiles never activate this entry because
 * webServer is absent. */
export const inject = ['webServer', 'settings', 'agents', 'subagents'];
/** Register the settings bridge route; dispose on unload. */
export function apply(ctx) {
    installDirectorRemoteBridge(ctx);
}
//# sourceMappingURL=bridge-entry.js.map