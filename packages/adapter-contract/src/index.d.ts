export type HostCapability =
  | 'conversation.current.read'
  | 'conversation.create'
  | 'conversation.open'
  | 'conversation.send'
  | 'conversation.references.insert'
  | 'conversation.references.render'
  | 'workspace.list'
  | 'workspace.select'
  | 'identity.current.read'
  | 'navigation.document.open'
  | 'navigation.deepLink.register'
  | 'files.export.save'
  | 'files.import.choose'
  | 'clipboard.write'
  | 'clipboard.read'
  | 'notifications.show'
  | 'application.lifecycle.observe'
  | 'application.window.open'
  | 'application.shortcuts.register'
  | 'updates.subscribe'
  | 'runtime.localService.manage'
  | 'runtime.localStorage.choose';

export interface AdapterDeclaration {
  id: string;
  version: string;
  contractVersion: 1;
  capabilities: HostCapability[];
}

export interface ResolvedAdapterCapabilities {
  readonly id: string;
  readonly version: string;
  readonly contractVersion: 1;
  readonly declared: readonly HostCapability[];
  readonly available: readonly HostCapability[];
}

export interface CoreApi {
  request<T = unknown>(method: string, args?: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<T>;
}

export interface ConversationBridge {
  current?: { id: string; title?: string } | null;
  getCurrent?(): Promise<{ id: string; title?: string } | null>;
  create?(options?: Record<string, unknown>): Promise<{ id: string }>;
  open?(id: string): Promise<void> | void;
  send?(request: {
    intent: 'process-comments';
    documentId: string;
    commentIds: string[];
    conversationId?: string;
    createConversation?: boolean;
    excludeConversationId?: string;
    requestId: string;
  }): Promise<{ requestId: string; status: string; conversationId?: string; createdConversation?: boolean }>;
  getConversationLabel?(id: string): string | null;
  getWorkspaceLabel?(sessionId: string): string | null;
  canCreate?: boolean;
  insertReferences?(items: Array<{ documentId: string; label?: string }>): Promise<boolean> | boolean;
}

export interface AdapterBridge {
  capabilities: ResolvedAdapterCapabilities;
  core: CoreApi;
  conversation?: ConversationBridge;
  workspace?: {
    list?(): Promise<Array<{ id: string; title: string }>>;
    select?(id: string): Promise<void> | void;
  };
  identity?: {
    getCurrentUser?(): Promise<{ signedIn: boolean; name?: string; avatarUrl?: string } | null>;
  };
  navigation?: {
    openDocument?(documentId: string): Promise<void> | void;
    createDocumentLink?(documentId: string): string | null;
    parseDocumentLink?(address: string): string | null;
    registerDeepLink?(listener: (url: string) => void): () => void;
  };
  files?: {
    chooseImport?(options?: { accept?: string[] }): Promise<{ name: string; type: string; bytes: Uint8Array } | null>;
    saveExport?(file: { name: string; type: string; bytes: Uint8Array }): Promise<boolean>;
  };
  clipboard?: { writeText?(text: string): Promise<void> };
  notifications?: { show?(message: { title?: string; body: string }): Promise<void> | void };
  updates?: { subscribe?(listener: () => void): () => void };
  lifecycle?: { subscribe?(listener: (state: 'active' | 'inactive' | 'stopping') => void): () => void };
  application?: {
    openWindow?(url: string): Promise<void> | void;
    registerShortcut?(shortcut: string, listener: () => void): () => void;
  };
  runtime?: {
    manageLocalService?(action: 'start' | 'stop' | 'status'): Promise<{ state: 'running' | 'stopped' | 'unavailable'; url?: string }>;
    chooseStorageLocation?(): Promise<string | null>;
  };
}

export const ADAPTER_CONTRACT_VERSION: 1;
export const HOST_CAPABILITIES: readonly HostCapability[];
export function resolveAdapterCapabilities(
  declaration: AdapterDeclaration,
  availableNow?: HostCapability[],
): ResolvedAdapterCapabilities;
export function supportsCapability(
  resolved: Pick<ResolvedAdapterCapabilities, 'available'> | null | undefined,
  capability: HostCapability,
): boolean;
