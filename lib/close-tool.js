import { defineTool } from '@deepseek-ai/dsh-tools';
import { SessionId } from '@deepseek-ai/dsh-session';
/** Stable tool name (fixed, mirroring send_message / interrupt_agent). */
export const CLOSE_SUBAGENT_TOOL_NAME = 'close_subagent';
const ERROR_PREFIX = 'subagent-director:';
/** Parameter schema (pure, exposed for tests). */
export function createCloseSubagentParameters() {
    return {
        subagent_id: {
            type: 'string',
            required: true,
            description: 'The durable subagent id returned when the background subagent was started (continuable mode). Releases the resident child so the parent no longer holds its handle.',
        },
    };
}
/** Output schema (pure, exposed for tests). */
export function createCloseSubagentOutputSchema() {
    return {
        type: 'object',
        additionalProperties: false,
        properties: {
            closed: { type: 'boolean', required: true },
        },
    };
}
/** Create the close_subagent ToolDefinition bound to one context. */
export function createCloseSubagentTool(options) {
    const { ctx } = options;
    return defineTool({
        name: CLOSE_SUBAGENT_TOOL_NAME,
        description: 'Close/release one resident continuable subagent by its durable id: the continuation manager stops holding its AgentHandle, freeing memory and session context. The target must be a direct child of the calling agent; a non-resident or already-finished target is an accepted no-op. Pairs with send_message (continue) and interrupt_agent (stop one turn) to complete the lifecycle.',
        parameters: {
            subagent_id: {
                type: 'string',
                required: true,
                description: 'The durable subagent id returned when the background subagent was started (continuable mode). Releases the resident child so the parent no longer holds its handle.',
            },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    closed: { type: 'boolean', required: true },
                },
            },
            render: (args, _value) => [{ type: 'text', text: `closed subagent ${args.subagent_id}` }],
        },
        isConcurrencySafe: () => true,
        async execute(args, exec) {
            const parent = exec.agent;
            if (!parent) {
                throw new Error(`${ERROR_PREFIX} close_subagent requires a calling agent (exec.agent was undefined)`);
            }
            await ctx.subagents.drainContinuableChildren(parent, [SessionId(args.subagent_id)]);
            return { closed: true };
        },
    });
}
//# sourceMappingURL=close-tool.js.map