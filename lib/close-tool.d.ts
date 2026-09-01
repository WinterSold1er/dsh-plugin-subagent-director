/**
 * close_subagent — release one resident continuable subagent (issue #1).
 *
 * Model-facing counterpart of dsh-tool-subagent-control's send_message /
 * interrupt_agent: the calling agent (exec.agent) authorizes release of its
 * OWN direct continuable child through ctx.subagents.drainContinuableChildren,
 * which throws UNAUTHORIZED when the target is not a direct child of the
 * caller and treats absent/non-resident targets as a no-op. The tool is
 * registered unconditionally (like the control tools); on a deployment
 * without continuable children it is a safe no-op.
 */
import type { Context } from '@deepseek-ai/cordis';
import { type ParameterSchemaSpec, type ValueSchemaSpec } from '@deepseek-ai/dsh-tools';
/** Stable tool name (fixed, mirroring send_message / interrupt_agent). */
export declare const CLOSE_SUBAGENT_TOOL_NAME = "close_subagent";
/** Model-facing arguments of close_subagent. */
export interface CloseSubagentArgs {
    /** Durable child id returned by a continuable delegation (subagent_role). */
    subagent_id: string;
}
/** Parameter schema (pure, exposed for tests). */
export declare function createCloseSubagentParameters(): ParameterSchemaSpec;
/** Output schema (pure, exposed for tests). */
export declare function createCloseSubagentOutputSchema(): ValueSchemaSpec;
/** Create the close_subagent ToolDefinition bound to one context. */
export declare function createCloseSubagentTool(options: {
    ctx: Context;
}): import("@deepseek-ai/dsh-tools").ToolDefinition;
//# sourceMappingURL=close-tool.d.ts.map