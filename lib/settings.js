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
import { installSettingsSection, settingsNamespace, } from '@deepseek-ai/dsh-settings';
/** Settings namespace for Subagent Director (design section 0 naming resolution). */
export const SUBAGENT_DIRECTOR_SETTINGS_NAMESPACE = settingsNamespace('subagent-director');
export function createSettingsSnapshot(initial) {
    let source;
    let snapshot = initial;
    return {
        hooks: {
            setSource: (current) => {
                source = current;
                snapshot = current();
            },
            onChange: () => {
                if (source !== undefined)
                    snapshot = source();
            },
        },
        get: () => snapshot,
    };
}
/** Kebab-case: lowercase alphanumeric segments separated by single hyphens. */
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Schemastery schema for one role template. All fields optional so a partial /
 * absent role resolves; semantic requirements are enforced by validate(). */
export const RoleTemplateSchema = z.object({
    displayName: z.string(),
    description: z.string(),
    persona: z.string(),
    provider: z.string(),
    model: z.string(),
    reasoningEffort: z.string(),
    // schemastery has no z.optional/z.undefined; an absent object field would
    // otherwise be materialized as { allow: [], deny: [] }, which the route
    // resolver must treat as unconfigured (issue #2). .default(undefined)
    // leaves an absent toolFilter out of the resolved section entirely; an
    // explicitly-set filter still resolves (empty sub-arrays are tolerated by
    // hasToolFilter at resolution time).
    toolFilter: z
        .object({
        allow: z.array(z.string()),
        deny: z.array(z.string()),
    })
        .default(undefined),
});
/**
 * Schemastery schema for the Subagent Director settings section. Every field is
 * optional (schemastery object fields are optional by default); roles is a
 * string-keyed dict of RoleTemplateSchema.
 */
// pnpm portability (TS2883): the inferred object-schema type names cosmokit's
// `Dict` (via z.dict), which is not resolvable from this package's d.ts under
// pnpm's strict layout (cosmokit is a transitive dep). Annotate with the
// schemastery global schema type (defaulted generics) — type-only, zero
// runtime change; callers infer settings types from the entry value, not the
// schema's inferred output.
export const SettingsSchema = z.object({
    defaultProvider: z.string(),
    defaultModel: z.string(),
    defaultReasoningEffort: z.string(),
    defaultRole: z.string(),
    fallbackOnInvalid: z.boolean().default(true),
    roles: z.dict(RoleTemplateSchema),
    // User-setting override of DirectorConfig.orchestrateEnforcement. Deliberately
    // NO .default(): an absent user setting falls through to the mount config
    // default (also 'strict'), so the snapshot carries undefined and the plugin
    // entry resolves strict-at-the-bottom (see index.ts). A default here would
    // mask whether the user ever set it and is unnecessary for the strict
    // baseline. schemastery coerces the string to the allowed union at write time.
    orchestrateEnforcement: z.union(['strict', 'lenient']),
});
function isEmpty(value) {
    return value === undefined || value === null || value.trim().length === 0;
}
/** True when the value is a string made only of whitespace. */
function isBlankString(value) {
    return typeof value === 'string' && value.trim().length === 0;
}
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
export function validateDirectorSettings(value) {
    const roles = value.roles ?? {};
    for (const [id, role] of Object.entries(roles)) {
        if (!KEBAB_CASE.test(id)) {
            throw new Error('subagent-director: role id "' + id + '" is not kebab-case (lowercase letters, digits and single hyphens)');
        }
        if (isEmpty(role?.displayName)) {
            throw new Error('subagent-director: role "' + id + '" must have a non-empty displayName');
        }
        if (isEmpty(role?.description)) {
            throw new Error('subagent-director: role "' + id + '" must have a non-empty description');
        }
        if (isBlankString(role?.provider)) {
            throw new Error('subagent-director: role "' + id + '" provider must be a non-empty string when set');
        }
    }
    if (!isEmpty(value.defaultRole) && roles[value.defaultRole] === undefined) {
        throw new Error('subagent-director: defaultRole "' + value.defaultRole + '" does not reference a defined role');
    }
    if (isBlankString(value.defaultProvider)) {
        throw new Error('subagent-director: defaultProvider must be a non-empty string when set');
    }
}
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
export function installDirectorSettings(ctx, entry, hooks) {
    if (ctx.get('settings') === undefined) {
        ctx.logger.debug('[subagent-director] no settings service mounted; using composition config and skipping settings section registration');
        return;
    }
    installSettingsSection(ctx, SUBAGENT_DIRECTOR_SETTINGS_NAMESPACE, SettingsSchema, entry, hooks);
}
/** Convenience exported alias used by tests. */
export { SettingsSchema as SubagentDirectorSettingsSchema };
//# sourceMappingURL=settings.js.map