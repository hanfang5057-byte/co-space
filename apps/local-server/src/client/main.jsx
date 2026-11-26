import React from 'react';
import { createRoot } from 'react-dom/client';
import { SpaceApp } from '../../../../packages/review-ui/src/SpaceApp.jsx';
import { api } from '../../../../packages/transport-http/client.js';
import { ADAPTER_CONTRACT_VERSION, resolveAdapterCapabilities } from '../../../../packages/adapter-contract/src/index.js';
import '../../../../packages/review-ui/src/space.css';

function saveExport({ name, type, bytes }) {
  if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

const declaration = {
  id: 'local-server',
  version: '0.1.9',
  contractVersion: ADAPTER_CONTRACT_VERSION,
  capabilities: ['files.export.save', 'clipboard.write', 'identity.current.read'],
};
const available = ['identity.current.read'];
if (typeof Blob !== 'undefined' && typeof URL?.createObjectURL === 'function') available.push('files.export.save');
if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') available.push('clipboard.write');

const adapter = {
  core: { request: api },
  prompts: { mcpReady: true },
  files: { saveExport },
  clipboard: { writeText: text => navigator.clipboard.writeText(text) },
  identity: { getCurrentUser: () => api('getUser') },
  capabilities: resolveAdapterCapabilities(declaration, available),
};

createRoot(document.getElementById('root')).render(<SpaceApp adapter={adapter}/>);
