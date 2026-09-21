/**
 * Allowed-route selection model for the alpha.4 client.
 *
 * The alpha.4 client no longer has a full llm model catalog RPC
 * (`connection.api.llm` was removed), and Subagent Director must pick a
 * provider/model ONLY from the routes the user authorized in the official
 * `subagent-model-selection` section (the "Subagent" plugin-config model
 * list). This module turns that route list into the option sets the settings
 * page renders. Pure and framework-free so the rules are unit-testable.
 */
/** One exact provider/model route authorized in the Subagent config list. */
export interface AllowedRoute {
    readonly provider: string;
    readonly model: string;
}
/** One selectable option derived from an allowed route. */
export interface AllowedRouteOption {
    readonly provider: string;
    readonly model: string;
    /** Stable display label for the exact route, e.g. "deepseek/deepseek-v4". */
    readonly label: string;
}
/** One-line display label for an exact route. */
export declare function allowedRouteLabel(route: AllowedRoute): string;
/**
 * Map the authorized route list to selectable options, preserving order and
 * dropping duplicates of the exact same provider/model pair.
 */
export declare function buildRouteOptions(routes: readonly AllowedRoute[]): AllowedRouteOption[];
/** Unique providers in first-seen order, for the provider select. */
export declare function providerNames(routes: readonly AllowedRoute[]): string[];
/** The allowed options available for one exact provider, for the model select. */
export declare function modelsForProvider(routes: readonly AllowedRoute[], provider: string): AllowedRouteOption[];
//# sourceMappingURL=allowed-routes.d.ts.map