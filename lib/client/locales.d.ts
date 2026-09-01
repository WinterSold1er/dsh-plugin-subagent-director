/**
 * Bilingual dictionaries for the Subagent Director settings namespace.
 * The key union (SubagentDirectorKey) is the compile-time contract: both
 * locales must carry every key, so a one-sided edit is a type error before it
 * ever reaches the runtime's bilingual balance check.
 */
/** Keys for the settings.subagentDirector namespace (bilingual, enforced). */
export type SubagentDirectorKey = 'nav' | 'sectionIntro' | 'defaultsHeading' | 'defaultsHint' | 'defaultProvider' | 'defaultModel' | 'defaultReasoningEffort' | 'restoreDefaults' | 'provider' | 'model' | 'reasoningEffort' | 'persona' | 'rolesHeading' | 'rolesHint' | 'addRole' | 'emptyRoles' | 'roleId' | 'roleDisplayName' | 'roleDescription' | 'rolePersona' | 'setDefaultRole' | 'defaultRoleBadge' | 'deleteRole' | 'confirmDeleteRole' | 'removeRoleDone' | 'addedRole' | 'roleUpdated' | 'conflict' | 'rejected' | 'fatal' | 'loadError' | 'readonly' | 'save' | 'cancel' | 'edit' | 'retry' | 'fallbackOnInvalid' | 'roleIdPlaceholder' | 'displayNamePlaceholder' | 'descriptionPlaceholder' | 'personaPlaceholder' | 'modelOptional' | 'providerMissing' | 'toolFilter' | 'toolFilterHint' | 'toolFilterNone' | 'toolFilterEmpty' | 'toolFilterSearch' | 'toolFilterSelectAll' | 'toolFilterDeselectAll' | 'toolFilterCount' | 'toolFilterExpand' | 'toolFilterCollapse' | 'toolFilterNoMatch' | 'restoreDone' | 'invalidRoleId' | 'bridgeUnavailable' | 'modelRanOn' | 'modelNotRecorded' | 'modelQueryFailed' | 'modelRanOnTitle' | 'closeContinuable' | 'closeContinuableTitle' | 'closingContinuable' | 'closedSubagent' | 'confirmCloseContinuable' | 'closeFailed' | 'enforcementHeading' | 'enforcementHint' | 'enforcementStrict' | 'enforcementLenient' | 'enforcementStrictDesc' | 'enforcementLenientDesc';
/** English dictionary ($subagentDirector). */
export declare const en: Record<SubagentDirectorKey, string>;
/** Chinese dictionary. */
export declare const zh: Record<SubagentDirectorKey, string>;
//# sourceMappingURL=locales.d.ts.map