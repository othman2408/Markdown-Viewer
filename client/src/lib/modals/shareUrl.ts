import type { ShareMode } from '../state/modals.svelte';
import type { ShareResponse } from '../types/cloud';

export const MAX_SHARE_URL_LENGTH = 32000;
export const DEFAULT_SHARE_TITLE = 'Shared document';

export interface BrowserLocationLike {
  href: string;
  origin: string;
  pathname: string;
}

export interface BuildShareUrlInput {
  activeTitle?: string | null;
  cloudEnabled: boolean;
  consoleRef?: Pick<Console, 'error'>;
  createCloudShare?: (input: { content: string; mode: ShareMode; title: string }) => Promise<ShareResponse>;
  encodeMarkdown?: (markdown: string) => string;
  locationRef: BrowserLocationLike;
  markdown: string;
  mode: ShareMode;
}

export interface ParsedShareHash {
  encoded: string;
  mode: ShareMode;
}

export interface CloudShareModeInput {
  responseMode?: unknown;
  search?: string;
}

export interface LoadedShareDocument {
  content: string;
  title?: string;
  viewMode: 'preview' | 'split';
}

export interface CloudShareDocumentInput {
  responseData: {
    content?: unknown;
    mode?: unknown;
    title?: unknown;
  };
  search?: string;
}

export function getShareDocumentTitle(title: unknown): string {
  return typeof title === 'string' && title ? title : DEFAULT_SHARE_TITLE;
}

export function getShareBaseUrl(locationRef: BrowserLocationLike): string {
  return locationRef.origin && locationRef.origin !== 'null'
    ? locationRef.origin + locationRef.pathname
    : locationRef.href.split('#')[0];
}

export function isShareUrlTooLarge(url: string, cloudEnabled: boolean): boolean {
  return !cloudEnabled && url.length > MAX_SHARE_URL_LENGTH;
}

export function parseShareHash(hash: string): ParsedShareHash | null {
  if (!hash.startsWith('#share=')) return null;

  const rest = hash.slice('#share='.length);
  const ampIndex = rest.indexOf('&');
  const encoded = ampIndex === -1 ? rest : rest.slice(0, ampIndex);
  const params = ampIndex === -1 ? '' : rest.slice(ampIndex + 1);

  if (!encoded) return null;

  return {
    encoded,
    mode: params.split('&').includes('edit=1') ? 'edit' : 'view'
  };
}

export function getCloudShareTokenFromPathname(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);

  return parts[0] === 'share' && parts[1] ? parts[1] : null;
}

export function getCloudShareMode(input: CloudShareModeInput): ShareMode {
  const editRequested = new URLSearchParams(input.search ?? '').get('edit') === '1';

  return input.responseMode === 'edit' || editRequested ? 'edit' : 'view';
}

export function getShareViewMode(mode: ShareMode): LoadedShareDocument['viewMode'] {
  return mode === 'edit' ? 'split' : 'preview';
}

export function prepareCloudShareDocument(input: CloudShareDocumentInput): LoadedShareDocument {
  const shareMode = getCloudShareMode({
    responseMode: input.responseData.mode,
    search: input.search
  });

  return {
    content: typeof input.responseData.content === 'string' ? input.responseData.content : '',
    title: getShareDocumentTitle(input.responseData.title),
    viewMode: getShareViewMode(shareMode)
  };
}

export function prepareLocalShareDocument(
  hash: string,
  decodeMarkdown: (encoded: string) => string
): LoadedShareDocument | null {
  const shareHash = parseShareHash(hash);
  if (!shareHash) return null;

  return {
    content: decodeMarkdown(shareHash.encoded),
    viewMode: getShareViewMode(shareHash.mode)
  };
}

export async function buildShareUrl(input: BuildShareUrlInput): Promise<string | null> {
  if (input.cloudEnabled) {
    const result = await input.createCloudShare?.({
      content: input.markdown,
      mode: input.mode,
      title: getShareDocumentTitle(input.activeTitle)
    });
    return result?.url || null;
  }

  try {
    const encoded = input.encodeMarkdown?.(input.markdown);
    if (!encoded) return null;

    const base = `${getShareBaseUrl(input.locationRef)}#share=${encoded}`;
    return input.mode === 'edit' ? `${base}&edit=1` : base;
  } catch (error) {
    input.consoleRef?.error('Share encoding failed:', error);
    return null;
  }
}
