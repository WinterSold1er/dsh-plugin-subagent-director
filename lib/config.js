/**
 * Plugin Config for Subagent Director (the Cordis composition-entry layer).
 *
 * This mirrors the field semantics of `@deepseek-ai/dsh-tool-subagent` (see
 * its `lib/types/index.d.ts`) so the two delegation tools stay behaviourally
 * consistent in the ecosystem.
 *
 * Two provider namespaces live side by side here and MUST NOT be confused
 * (design section 14, risk R2):
 *   - `subagentProvider`: the subagent TRANSPORT provider name handed to
 *     `ctx.subagents.start(...)` (e.g. `spawn`, `fork`, `acp`).
 *   - `agentOptions.provider` / `defaultProvider` (settings): the LLM route
 *     provider that actually serves model requests (e.g. `deepseek-official`,
 *     a pi-ai route). They are unrelated name spaces.
 */
import z from '@deepseek-ai/schemastery';
import { ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS } from './orchestrate-guard.js';
/** Schemastery schema for {@link DirectorConfig}. */
export const Config = z.object({
    subagentProvider: z.string().default('spawn'),
    toolName: z.string().default('subagent_role'),
    enableRunInBackground: z.boolean().default(true),
    backgroundMode: z.union(['one-shot', 'continuable']).default('one-shot'),
    maxDepth: z
        .union([z.natural().max(Number.MAX_SAFE_INTEGER), z.const('provider-managed')]),
    applyDefaultRoute: z.boolean().default(true),
    orchestrateReadOnlyTools: z.array(z.string()).default([...ORCHESTRATE_DEFAULT_READ_ONLY_TOOLS]),
    orchestrateEnforcement: z.union(['strict', 'lenient']).default('strict'),
});
//# sourceMappingURL=config.js.map