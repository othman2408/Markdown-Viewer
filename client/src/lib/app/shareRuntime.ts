import type { ShareMode } from '../state/modals.svelte';
import type { ModalStateSnapshot } from '../state/modals.svelte';
import type { ShareResponse } from '../types/cloud';
import {
  decodeMarkdownFromShare as decodeMarkdownSharePayload,
  encodeMarkdownForShare as encodeMarkdownSharePayload,
  getRequiredShareCompressionCodec
} from '../modals/shareCompression';
import {
  buildShareUrl as buildShareUrlFromInputs,
  type BrowserLocationLike,
  getCloudShareTokenFromPathname,
  type LoadedShareDocument,
  prepareCloudShareDocument,
  prepareLocalShareDocument
} from '../modals/shareUrl';
import {
  openShareModalFlow,
  runShareUrlGeneration,
  selectShareModeFlow
} from '../modals/shareGeneration';

type CloudStorageRef = {
  enabled: boolean;
  shareRequestSeq: number;
};

type ShareRuntimeOptions = {
  alertRef?: (message: string) => void;
  applyCloudSharedDocument(document: LoadedShareDocument): void;
  applyLocalSharedDocument(document: LoadedShareDocument): void;
  cloudStorage: CloudStorageRef;
  consoleRef?: Pick<Console, 'error' | 'warn'>;
  createCloudShare(input: { content: string; mode: ShareMode; title: string }): Promise<ShareResponse>;
  fetcher?: typeof fetch;
  getActiveTitle(): string | null;
  getCompressionLib(): unknown;
  getMarkdown(): string;
  isCloudSharePage(): boolean;
  loadCompression(): Promise<void>;
  locationRef?: BrowserLocationLike & Pick<Location, 'hash' | 'search'>;
  syncCloudStateSnapshot(): void;
  syncModalState(patch: Partial<ModalStateSnapshot>): void;
};

export type ShareRuntime = {
  buildShareUrl(mode: ShareMode): Promise<string | null>;
  loadFromCloudShare(): Promise<void>;
  loadFromShareHash(): void;
  openShareModal(): void;
  selectShareMode(mode: ShareMode): void;
};

export function createShareRuntime(options: ShareRuntimeOptions): ShareRuntime {
  const alertRef = options.alertRef ?? alert;
  const consoleRef = options.consoleRef ?? console;
  const locationRef = options.locationRef ?? window.location;
  const fetcher = options.fetcher ?? fetch.bind(globalThis);

  function getCompressionCodec() {
    return getRequiredShareCompressionCodec(options.getCompressionLib());
  }

  function encodeMarkdownForShare(text: string): string {
    return encodeMarkdownSharePayload(text, getCompressionCodec());
  }

  function decodeMarkdownFromShare(encoded: string): string {
    return decodeMarkdownSharePayload(encoded, getCompressionCodec());
  }

  async function buildShareUrl(mode: ShareMode): Promise<string | null> {
    return buildShareUrlFromInputs({
      activeTitle: options.getActiveTitle(),
      cloudEnabled: options.cloudStorage.enabled,
      consoleRef,
      createCloudShare: options.createCloudShare,
      encodeMarkdown: encodeMarkdownForShare,
      locationRef,
      markdown: options.getMarkdown(),
      mode
    });
  }

  async function updateShareUrlField(mode: ShareMode): Promise<void> {
    const requestSeq = ++options.cloudStorage.shareRequestSeq;
    options.syncCloudStateSnapshot();
    await runShareUrlGeneration({
      applyPatch: options.syncModalState,
      buildShareUrl,
      cloudEnabled: options.cloudStorage.enabled,
      consoleRef,
      isCurrentRequest: () => requestSeq === options.cloudStorage.shareRequestSeq,
      mode
    });
  }

  function openShareModal(): void {
    void openShareModalFlow({
      alertRef,
      applyPatch: options.syncModalState,
      cloudEnabled: options.cloudStorage.enabled,
      consoleRef,
      generateShareUrl: updateShareUrlField,
      hasCompressionCodec: () => Boolean(options.getCompressionLib()),
      loadCompression: options.loadCompression,
      modalId: 'share-modal'
    });
  }

  function selectShareMode(mode: ShareMode): void {
    selectShareModeFlow({
      applyPatch: options.syncModalState,
      generateShareUrl: updateShareUrlField,
      mode
    });
  }

  async function loadFromCloudShare(): Promise<void> {
    if (!options.isCloudSharePage()) return;

    const token = getCloudShareTokenFromPathname(locationRef.pathname);
    if (!token) return;

    try {
      const response = await fetcher('/api/shares/' + encodeURIComponent(token), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Share not found');

      const data = await response.json();
      const sharedDocument = prepareCloudShareDocument({
        responseData: data,
        search: locationRef.search
      });
      options.applyCloudSharedDocument(sharedDocument);
    } catch (error) {
      consoleRef.error('Failed to load shared document:', error);
      alertRef('The shared document could not be loaded.');
    }
  }

  function loadFromShareHash(): void {
    if (!options.getCompressionLib()) {
      const hash = locationRef.hash;
      if (!hash.startsWith('#share=')) return;
      options.loadCompression()
        .then(() => {
          loadFromShareHash();
        })
        .catch((error) => {
          consoleRef.error('Failed to load pako for shared URL:', error);
        });
      return;
    }

    try {
      const sharedDocument = prepareLocalShareDocument(locationRef.hash, decodeMarkdownFromShare);
      if (!sharedDocument) return;
      options.applyLocalSharedDocument(sharedDocument);
    } catch (error) {
      consoleRef.error('Failed to load shared content:', error);
      alertRef('The shared URL could not be decoded. It may be corrupted or incomplete.');
    }
  }

  return {
    buildShareUrl,
    loadFromCloudShare,
    loadFromShareHash,
    openShareModal,
    selectShareMode
  };
}
