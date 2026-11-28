/** Host-independent MCP facade over the shared CoSpace tool specifications. */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createToolSpecs, publicError, TOOL_GUIDANCE } from './handlers.js';

const text = result => ({ content: [{ type: 'text', text: JSON.stringify(result) }], ...(result && typeof result === 'object' && !Array.isArray(result) ? { structuredContent: result } : {}) });

export function createMcpServer(service, collaboration = null, { reviewUrl, documentLinkFor, serverVersion = '0.1.0', versionNotice } = {}) {
  const instructions = [
    `This CoSpace MCP server exposes tools, not MCP resources. ${TOOL_GUIDANCE}`,
    reviewUrl ? `The local review UI is available at ${reviewUrl}. When a tool returns a reviewUrl, include it as a Markdown link. The user reviews and decides every suggestion there.` : '',
    documentLinkFor ? 'When a tool returns documentLink, include it as a Markdown link. It opens that document in the host document sidebar.' : '',
    versionNotice || '',
  ].filter(Boolean).join('\n\n');
  const server = new McpServer({ name: 'CoSpace', version: serverVersion }, { instructions });
  for (const [name, spec] of createToolSpecs(service, collaboration, { reviewUrl, documentLinkFor })) {
    const registration = { description: spec.description, inputSchema: spec.inputSchema };
    if (spec.annotations) registration.annotations = spec.annotations;
    server.registerTool(name, registration, async args => {
      try {
        return text(await spec.execute(args));
      } catch (error) {
        return { isError: true, ...text({ error: publicError(error) }) };
      }
    });
  }
  return server;
}
