/**
 * Adapt the host-neutral CoSpace tool specifications to DSH's native tool
 * registry. A tool keeps one contract: the model-facing schema comes from the
 * same zod source the MCP facade uses, success values render as one JSON text
 * block (the same payload the client tool cards parse), and a failure throws
 * the public error text.
 * @module
 */
import { z } from 'zod';
import { publicErrorMessage } from '../../../packages/transport-mcp/handlers.js';

/**
 * Convert one shared tool spec into a DSH ToolDefinition.
 * @param {string} name - model-facing tool name, e.g. `space_document_read`.
 * @param {object} spec - entry from `createToolSpecs`.
 * @returns {object} ToolDefinition for `ctx.tools.register`.
 */
export function toToolDefinition(name, spec) {
  return {
    name,
    description: spec.description,
    parameters: z.toJSONSchema(z.object(spec.inputSchema)),
    output: {
      schema: { type: 'object' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args) {
      try {
        return await spec.execute(args ?? {});
      } catch (error) {
        throw new Error(publicErrorMessage(error));
      }
    },
  };
}
