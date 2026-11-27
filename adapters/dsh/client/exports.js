/** Export one CoSpace document through the host's file sink. */
import { createDocx, exportFileName } from '../../../packages/review-ui/src/export.js';

/**
 * Read and save one document as a file.
 * @param {object} adapter - host adapter with a request sink and a file sink.
 * @param {string} docId - document to export.
 * @param {'md'|'docx'} format - file format.
 * @returns {Promise<void>} resolves once the host accepted the file.
 */
export async function exportSpaceDocument(adapter, docId, format) {
  if (format !== 'md' && format !== 'docx') throw new Error('Unsupported export format');
  const snapshot = await adapter?.core?.request?.('readDocument', { docId });
  if (!snapshot || typeof snapshot.content !== 'string') throw new Error('Document unavailable');
  const name = exportFileName(snapshot.title, format);
  const file = format === 'md'
    ? { name, type: 'text/markdown;charset=utf-8', bytes: new TextEncoder().encode(snapshot.content) }
    : { name, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: new Uint8Array(await createDocx(snapshot.content).arrayBuffer()) };
  const saved = await adapter?.files?.saveExport?.(file);
  if (saved !== true) throw new Error('Export saving was not accepted');
}
