/**
 * Settings namespace, schema, and write-time validation for Subagent Director
 * (design section 5.2).
 *
 * This module owns the "subagent-director" settings surface. On DSH 0.1.7 the
 * settings model changed: dsh-settings' default export is now `SettingsForms`,
 * plugin settings are declared by the plugin's own Cordis Config schema, and the
 * profile plugin entry's config is the single storage layer (there is no
 * settings.yaml override layer). Accordingly:
 *
 *  - `SettingsFields` is the schemastery field map for the settings surface,
 *    with every field `.volatile()` so a settings write updates the running
 *    plugin in place without a restart. It is spread into the plugin's Config
 *    schema (see ./config.ts) so the entry id `subagent-director` is the ns
 *    `describe()` / `mutate()` address.
 *  - Cross-field / semantic constraints the schema cannot express are still
 *    documented by `validateDirectorSettings`, but the new write path only
 *    enforces what the schema declares (per-field shape). See the export comment.
 *    The one cross-field reference the schema cannot express — a dangling
 *    `defaultRole` — is surfaced at READ time by `readDirectorSettings` /
 *    `settingsWarnings` instead (logs + settingsView), restoring the equivalent
 *    safety without refusing the write.
 *  - `installDirectorSettingsPage` registers the instance page policy
 *    (`auto:false`) because the plugin ships its own Web settings page.
 *
 * The field map stays permissive where it must be (optional strings, a
 * string-keyed role dict) so an absent section resolves cleanly; per-field
 * semantic requirements the old write validator enforced (non-empty
 * displayName/description, non-blank provider, kebab-case role ids) are now
 * declared in the schema itself and therefore enforced by the settings write
 * path (configEditor validates the Config schema on every write).
 */
import { Context } from '@deepseek-ai/cordis';
import type { Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { RoleTemplate, SubagentDirectorSettings } from './route-resolver.js';
/** Settings namespace for Subagent Director (design section 0 naming resolution). */
export declare const SUBAGENT_DIRECTOR_SETTINGS_NAMESPACE: 'subagent-director';
/**
 * The official dsh-tool-subagent settings entry id (also its profile plugin id):
 * the settings ns carrying the authorized subagent model-selection allowlist.
 */
export declare const SUBAGENT_MODEL_SELECTION_NAMESPACE: 'subagent-model-selection-settings';
export type { RoleTemplate, SubagentDirectorSettings } from './route-resolver.js';
import { type EnforcementConfigInput, resolveEnforcementLevel, resolveLayeredEnforcement, deriveSwitchesFromEnforcement } from './enforcement.js';
export type { OrchestrateEnforcement } from './orchestrate-guard.js';
export { type EnforcementConfigInput, resolveEnforcementLevel, resolveLayeredEnforcement, deriveSwitchesFromEnforcement, };
/** Kebab-case: lowercase alphanumeric segments separated by single hyphens. */
export declare const KEBAB_CASE: RegExp;
/** Schemastery schema for one role template. displayName/description are
 * required and non-blank; provider/agentPreset (when set) must be non-blank. */
export declare const RoleTemplateSchema: z<Schemastery.ObjectS<NoInfer<{
    displayName: z<string, string, "defined">;
    description: z<string, string, "defined">;
    agentPreset: z<string, string, "plain">;
    persona: z<string, string, "plain">;
    provider: z<string, string, "plain">;
    model: z<string, string, "plain">;
    reasoningEffort: z<string, string, "plain">;
    toolFilter: z<Schemastery.ObjectS<NoInfer<{
        allow: z<string[], string[], "plain">;
        deny: z<string[], string[], "plain">;
    }>>, Schemastery.ObjectT<NoInfer<{
        allow: z<string[], string[], "plain">;
        deny: z<string[], string[], "plain">;
    }>>, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    displayName: z<string, string, "defined">;
    description: z<string, string, "defined">;
    agentPreset: z<string, string, "plain">;
    persona: z<string, string, "plain">;
    provider: z<string, string, "plain">;
    model: z<string, string, "plain">;
    reasoningEffort: z<string, string, "plain">;
    toolFilter: z<Schemastery.ObjectS<NoInfer<{
        allow: z<string[], string[], "plain">;
        deny: z<string[], string[], "plain">;
    }>>, Schemastery.ObjectT<NoInfer<{
        allow: z<string[], string[], "plain">;
        deny: z<string[], string[], "plain">;
    }>>, "defined">;
}>>, "plain">;
/**
 * The settings-surface field map. Every field is `.volatile()`: a settings
 * write merges into the profile entry config and the Cordis loader commits the
 * new values into the running references in place (no plugin restart). Role ids
 * are validated as kebab-case by the dict's key schema.
 */
export declare const SettingsFields: {
    defaultProvider: z<string, string, "volatile">;
    defaultModel: z<string, string, "volatile">;
    defaultReasoningEffort: z<string, string, "volatile">;
    defaultRole: z<string, string, "volatile">;
    fallbackOnInvalid: z<boolean, boolean, "volatile-defined">;
    roles: z<NoInfer<import("@deepseek-ai/cosmokit").Dict<{
        displayName?: string | null | undefined;
        description?: string | null | undefined;
        agentPreset?: string | null | undefined;
        persona?: string | null | undefined;
        provider?: string | null | undefined;
        model?: string | null | undefined;
        reasoningEffort?: string | null | undefined;
        toolFilter?: ({
            allow?: string[] | null | undefined;
            deny?: string[] | null | undefined;
        } & import("@deepseek-ai/cosmokit").Dict) | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict, string>>, NoInfer<import("@deepseek-ai/cosmokit").Dict<Schemastery.ObjectT<NoInfer<{
        displayName: z<string, string, "defined">;
        description: z<string, string, "defined">;
        agentPreset: z<string, string, "plain">;
        persona: z<string, string, "plain">;
        provider: z<string, string, "plain">;
        model: z<string, string, "plain">;
        reasoningEffort: z<string, string, "plain">;
        toolFilter: z<Schemastery.ObjectS<NoInfer<{
            allow: z<string[], string[], "plain">;
            deny: z<string[], string[], "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            allow: z<string[], string[], "plain">;
            deny: z<string[], string[], "plain">;
        }>>, "defined">;
    }>>, string>>, "volatile">;
    orchestrateEnforcement: z<"lenient" | "none" | "strict", "lenient" | "none" | "strict", "volatile">;
    orchestrateInterceptTools: z<boolean, boolean, "volatile">;
    orchestrateRoundIntercept: z<boolean, boolean, "volatile">;
};
/**
 * Schemastery schema for the Subagent Director settings surface on its own
 * (settings fields only, no composition fields). The plugin's shipped Config
 * schema is this map spread over the composition fields — see ./config.ts.
 */
export declare const SettingsSchema: z<Schemastery.ObjectS<NoInfer<{
    defaultProvider: z<string, string, "volatile">;
    defaultModel: z<string, string, "volatile">;
    defaultReasoningEffort: z<string, string, "volatile">;
    defaultRole: z<string, string, "volatile">;
    fallbackOnInvalid: z<boolean, boolean, "volatile-defined">;
    roles: z<NoInfer<import("@deepseek-ai/cosmokit").Dict<{
        displayName?: string | null | undefined;
        description?: string | null | undefined;
        agentPreset?: string | null | undefined;
        persona?: string | null | undefined;
        provider?: string | null | undefined;
        model?: string | null | undefined;
        reasoningEffort?: string | null | undefined;
        toolFilter?: ({
            allow?: string[] | null | undefined;
            deny?: string[] | null | undefined;
        } & import("@deepseek-ai/cosmokit").Dict) | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict, string>>, NoInfer<import("@deepseek-ai/cosmokit").Dict<Schemastery.ObjectT<NoInfer<{
        displayName: z<string, string, "defined">;
        description: z<string, string, "defined">;
        agentPreset: z<string, string, "plain">;
        persona: z<string, string, "plain">;
        provider: z<string, string, "plain">;
        model: z<string, string, "plain">;
        reasoningEffort: z<string, string, "plain">;
        toolFilter: z<Schemastery.ObjectS<NoInfer<{
            allow: z<string[], string[], "plain">;
            deny: z<string[], string[], "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            allow: z<string[], string[], "plain">;
            deny: z<string[], string[], "plain">;
        }>>, "defined">;
    }>>, string>>, "volatile">;
    orchestrateEnforcement: z<"lenient" | "none" | "strict", "lenient" | "none" | "strict", "volatile">;
    orchestrateInterceptTools: z<boolean, boolean, "volatile">;
    orchestrateRoundIntercept: z<boolean, boolean, "volatile">;
}>>, Schemastery.ObjectT<NoInfer<{
    defaultProvider: z<string, string, "volatile">;
    defaultModel: z<string, string, "volatile">;
    defaultReasoningEffort: z<string, string, "volatile">;
    defaultRole: z<string, string, "volatile">;
    fallbackOnInvalid: z<boolean, boolean, "volatile-defined">;
    roles: z<NoInfer<import("@deepseek-ai/cosmokit").Dict<{
        displayName?: string | null | undefined;
        description?: string | null | undefined;
        agentPreset?: string | null | undefined;
        persona?: string | null | undefined;
        provider?: string | null | undefined;
        model?: string | null | undefined;
        reasoningEffort?: string | null | undefined;
        toolFilter?: ({
            allow?: string[] | null | undefined;
            deny?: string[] | null | undefined;
        } & import("@deepseek-ai/cosmokit").Dict) | null | undefined;
    } & import("@deepseek-ai/cosmokit").Dict, string>>, NoInfer<import("@deepseek-ai/cosmokit").Dict<Schemastery.ObjectT<NoInfer<{
        displayName: z<string, string, "defined">;
        description: z<string, string, "defined">;
        agentPreset: z<string, string, "plain">;
        persona: z<string, string, "plain">;
        provider: z<string, string, "plain">;
        model: z<string, string, "plain">;
        reasoningEffort: z<string, string, "plain">;
        toolFilter: z<Schemastery.ObjectS<NoInfer<{
            allow: z<string[], string[], "plain">;
            deny: z<string[], string[], "plain">;
        }>>, Schemastery.ObjectT<NoInfer<{
            allow: z<string[], string[], "plain">;
            deny: z<string[], string[], "plain">;
        }>>, "defined">;
    }>>, string>>, "volatile">;
    orchestrateEnforcement: z<"lenient" | "none" | "strict", "lenient" | "none" | "strict", "volatile">;
    orchestrateInterceptTools: z<boolean, boolean, "volatile">;
    orchestrateRoundIntercept: z<boolean, boolean, "volatile">;
}>>, "plain">;
/**
 * The resolved-config handles for the settings fields: each is a stable
 * `Volatile` reference whose `get()` returns the current value. Used as the
 * config parameter type so the plugin reads live values.
 */
export interface DirectorSettingsHandles {
    defaultProvider: Volatile<string | undefined>;
    defaultModel: Volatile<string | undefined>;
    defaultReasoningEffort: Volatile<string | undefined>;
    defaultRole: Volatile<string | undefined>;
    fallbackOnInvalid: Volatile<boolean>;
    roles: Volatile<Record<string, RoleTemplate> | undefined>;
}
/**
 * Project the live Config handles onto the plain settings snapshot consumed by
 * the resolver/guidance. Mirrors the Host schema in src/settings.ts.
 *
 * Read-time hardening: the only cross-field constraint a schemastery schema
 * cannot express — a `defaultRole` that references no defined role — is checked
 * here and reported through the optional `warnings` collector. On 0.1.7 the
 * settings write path admits such a dangling reference (the schema is the write
 * gate and it is per-field only); surfacing it at read time restores the
 * equivalent safety the old write-time validator gave, without refusing the
 * write. The dangling value itself is returned UNCHANGED — the user's stored
 * configuration must stay as written so the mistake remains correctable.
 *
 * @param config - the resolved Cordis config carrying the volatile handles.
 * @param warnings - optional out-collector; when supplied it receives every
 *   read-time warning (see {@link settingsWarnings}). Omitted by callers that
 *   only need the snapshot, keeping the no-arg path byte-identical.
 * @returns a detached settings snapshot (fresh object each call).
 */
export declare function readDirectorSettings(config: DirectorSettingsHandles, warnings?: string[]): SubagentDirectorSettings;
/**
 * Warning for a `defaultRole` that references no defined role, or undefined
 * when the reference is sound (or unset). The cross-field reference the
 * schemastery schema cannot express; pure — reads the snapshot only.
 */
export declare function danglingDefaultRoleWarning(settings: SubagentDirectorSettings): string | undefined;
/**
 * Read-time warnings for a resolved settings snapshot. A list (not a single
 * value) so further read-time checks can be added without changing callers.
 * Today the only entry is a dangling `defaultRole`.
 */
export declare function settingsWarnings(settings: SubagentDirectorSettings): string[];
/**
 * Wrap a warn sink in a deduplicating emitter keyed on the warning-set
 * signature, so a persistent misconfiguration warns once per read rather than
 * on every read: an unchanged set is swallowed, an empty set clears the
 * memory (a fixing write stops the noise), and a changed set re-warns.
 *
 * @param emit - receives each warning string that should be logged.
 * @returns a function to call with the warnings of one settings read.
 */
export declare function createSettingsWarner(emit: (message: string) => void): (warnings: readonly string[]) => void;
/**
 * Semantic validator for a resolved settings section (design 5.2).
 *
 * On DSH ≤ 0.1.6 this was the settings write-time validator (installSection's
 * `validate` hook): it threw to refuse a write. On 0.1.7 the write path has no
 * custom validate hook — the Config schema is the write gate — so the
 * per-field checks it performed (kebab-case role ids, non-empty
 * displayName/description, non-blank provider) are now declared in
 * {@link RoleTemplateSchema} / {@link SettingsFields} instead.
 *
 * The remaining cross-field check — a `defaultRole` that references no defined
 * role — cannot be expressed in a schemastery schema. It is kept here for
 * callers/tests that want to check it explicitly; the runtime route resolver
 * already tolerates a dangling defaultRole by warning and skipping the binding,
 * so no write is refused for it on 0.1.7.
 *
 * @param value - the resolved section, schema-valid by construction.
 * @throws when the cross-field defaultRole reference is dangling.
 */
export declare function validateDirectorSettings(value: SubagentDirectorSettings): void;
/**
 * Register the plugin instance's settings page policy (DSH 0.1.7
 * `SettingsForms.configure`).
 *
 * The plugin ships its own Web configuration page (slot
 * `plugins.bundle.config`, rendered on the plugin's own page in the plugin
 * manager), so `auto:false` disables the Host's auto-generated page for this
 * settings namespace and avoids a duplicate page. The policy is registered into
 * the plugin fiber's effects and removed on unload. `settings` is a required
 * inject for this plugin, so the callback always runs on an active deployment.
 *
 * @param ctx - the plugin fiber's context.
 */
export declare function installDirectorSettingsPage(ctx: Context): void;
/** Structural face of `@deepseek-ai/dsh-settings`' `SettingsForms` used here. */
export interface SettingsFormsLike {
    describe(options?: {
        redactSecrets?: boolean;
    }): readonly {
        ns: string;
        value?: unknown;
    }[];
}
/**
 * Read one namespace's live (redacted) value from the settings seam's
 * `describe()`. On 0.1.7 there is no `settings.get(ns)`; a namespace's live
 * value is the descriptor's `value` projected from the running plugin config.
 *
 * @param settings - the settings service (structural).
 * @param ns - the profile entry id to read.
 * @returns the redacted live value, or undefined when the ns is not active.
 */
export declare function readNamespaceValue(settings: SettingsFormsLike | undefined, ns: string): unknown;
//# sourceMappingURL=settings.d.ts.map