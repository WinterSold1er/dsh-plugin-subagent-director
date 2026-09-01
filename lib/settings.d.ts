/**
 * Settings namespace, schema, and write-time validation for Subagent Director
 * (design section 5.2).
 *
 * This module owns the "subagent-director" settings namespace. It re-exports
 * the role/settings types from ./route-resolver (single source of truth) and
 * registers them with the canonical optional-settings consumer wiring so a
 * deployment without a settings provider keeps working off its composition
 * config (zero intrusion).
 *
 * Layering (design 5.2): the schemastery schema stays coercive/permissive
 * (all fields optional, roles a string-keyed dict) so an absent section
 * resolves cleanly; cross-field / semantic constraints that the schema cannot
 * express are enforced at WRITE time by validate(), which throws to refuse the
 * write exactly as SettingsRegisterOptions.validate / SettingsSectionHooks.validate
 * demand (dsh-settings/lib/types/index.d.ts:24-48, 307-341).
 */
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type SettingsSectionHooks } from '@deepseek-ai/dsh-settings';
import type { SubagentDirectorSettings } from './route-resolver.js';
/** Settings namespace for Subagent Director (design section 0 naming resolution). */
export declare const SUBAGENT_DIRECTOR_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
export type { RoleTemplate, SubagentDirectorSettings } from './route-resolver.js';
/**
 * dsh-settings' `installSettingsSection` calls `setSource` exactly once with a
 * source thunk and fires `onChange` on every settings change (settings.yaml
 * hot reload, settings UI writes). The previous wiring captured the value
 * inside setSource and left onChange empty, so edits were only visible after a
 * restart. This helper keeps the source thunk so onChange can re-read it and
 * the snapshot follows live settings.
 */
export interface SettingsSnapshot<T> {
    /** The dsh-settings consumer hooks to pass to installSettingsSection. */
    hooks: SettingsSectionHooks<T>;
    /** The current resolved snapshot (refreshed by onChange). */
    get(): T;
}
export declare function createSettingsSnapshot<T>(initial: T): SettingsSnapshot<T>;
/** Schemastery schema for one role template. All fields optional so a partial /
 * absent role resolves; semantic requirements are enforced by validate(). */
export declare const RoleTemplateSchema: z<Schemastery.ObjectS<{
    displayName: z<string, string>;
    description: z<string, string>;
    persona: z<string, string>;
    provider: z<string, string>;
    model: z<string, string>;
    reasoningEffort: z<string, string>;
    toolFilter: z<Schemastery.ObjectS<{
        allow: z<string[], string[]>;
        deny: z<string[], string[]>;
    }>, Schemastery.ObjectT<{
        allow: z<string[], string[]>;
        deny: z<string[], string[]>;
    }>>;
}>, Schemastery.ObjectT<{
    displayName: z<string, string>;
    description: z<string, string>;
    persona: z<string, string>;
    provider: z<string, string>;
    model: z<string, string>;
    reasoningEffort: z<string, string>;
    toolFilter: z<Schemastery.ObjectS<{
        allow: z<string[], string[]>;
        deny: z<string[], string[]>;
    }>, Schemastery.ObjectT<{
        allow: z<string[], string[]>;
        deny: z<string[], string[]>;
    }>>;
}>>;
/**
 * Schemastery schema for the Subagent Director settings section. Every field is
 * optional (schemastery object fields are optional by default); roles is a
 * string-keyed dict of RoleTemplateSchema.
 */
export declare const SettingsSchema: Schemastery;
/**
 * Write-time validator for a resolved settings section (design 5.2).
 *
 * Throws to refuse the write that produced value, as the settings seam
 * contract requires. Checks:
 *  - every role key is kebab-case;
 *  - every role's displayName and description are present and non-empty;
 *  - defaultRole, when set, references an existing role key;
 *  - every explicitly-set provider is a non-empty string.
 *
 * @param value - the resolved section, schema-valid by construction.
 */
export declare function validateDirectorSettings(value: SubagentDirectorSettings): void;
/**
 * Install the Subagent Director settings section through the canonical
 * optional-settings consumer wiring.
 *
 * Mirrors dsh-agent-default-model/lib/index.js's optional pattern: the
 * registration rides the scoped fiber, so a deployment with no settings
 * service simply never mounts it. This helper guards that explicitly for
 * readability and logs a debug line when the service is absent so the gradual
 * fall-back to the composition config is observable.
 *
 * @param ctx - consumer plugin context owning the wiring.
 * @param entry - the consumer's composition-layer config, used as the settings
 *   base while a provider is absent.
 * @param hooks - source sink and change notification (plus optional validate).
 */
export declare function installDirectorSettings(ctx: Context, entry: SubagentDirectorSettings, hooks: SettingsSectionHooks<SubagentDirectorSettings>): void;
/** Convenience exported alias used by tests. */
export { SettingsSchema as SubagentDirectorSettingsSchema };
//# sourceMappingURL=settings.d.ts.map