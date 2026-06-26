import type { ModalStateSnapshot, ShareMode } from '../state/modals.svelte';
import { prepareShareModalOpen } from './lifecycle';
import {
  isShareMode,
  prepareShareGenerationError,
  prepareShareGenerationStart,
  prepareShareGenerationSuccess,
  prepareShareGenerationTooLarge,
  prepareShareModalReset,
  prepareShareModeSelection
} from './share';
import { isShareUrlTooLarge } from './shareUrl';

export type ShareGenerationPatch = Partial<ModalStateSnapshot>;
export type ShareGenerationResult = 'error' | 'stale' | 'success' | 'too-large';

export interface RunShareUrlGenerationOptions {
  applyPatch: (patch: ShareGenerationPatch) => void;
  buildShareUrl: (mode: ShareMode) => Promise<string | null>;
  cloudEnabled: boolean;
  consoleRef?: Pick<Console, 'error'>;
  isCurrentRequest: () => boolean;
  mode: ShareMode;
}

export interface OpenShareModalFlowOptions {
  alertRef?: (message: string) => void;
  applyPatch: (patch: ShareGenerationPatch) => void;
  cloudEnabled: boolean;
  consoleRef?: Pick<Console, 'error'>;
  generateShareUrl: (mode: ShareMode) => void | Promise<unknown>;
  hasCompressionCodec: () => boolean;
  loadCompression: () => Promise<unknown>;
  modalId?: string;
}

export interface SelectShareModeFlowOptions {
  applyPatch: (patch: ShareGenerationPatch) => void;
  generateShareUrl: (mode: ShareMode) => void | Promise<unknown>;
  mode: unknown;
}

export async function runShareUrlGeneration(
  options: RunShareUrlGenerationOptions
): Promise<ShareGenerationResult> {
  options.applyPatch(prepareShareGenerationStart(options.mode));

  try {
    const url = await options.buildShareUrl(options.mode);
    if (!options.isCurrentRequest()) return 'stale';

    if (!url) {
      options.applyPatch(prepareShareGenerationError(options.mode));
      return 'error';
    }

    if (isShareUrlTooLarge(url, options.cloudEnabled)) {
      options.applyPatch(prepareShareGenerationTooLarge(options.mode));
      return 'too-large';
    }

    options.applyPatch(prepareShareGenerationSuccess(options.mode, url));
    return 'success';
  } catch (error) {
    options.consoleRef?.error('Share generation failed:', error);
    options.applyPatch(prepareShareGenerationError(options.mode));
    return 'error';
  }
}

export async function openShareModalFlow(options: OpenShareModalFlowOptions): Promise<boolean> {
  if (!options.cloudEnabled && !options.hasCompressionCodec()) {
    try {
      await options.loadCompression();
    } catch (error) {
      options.consoleRef?.error('Failed to load pako:', error);
      options.alertRef?.('Failed to load sharing library. Please check your internet connection.');
      return false;
    }
  }

  const mode: ShareMode = 'view';
  options.applyPatch({
    ...prepareShareModalOpen(options.modalId ?? 'share-modal'),
    ...prepareShareModalReset(mode)
  });
  void options.generateShareUrl(mode);
  return true;
}

export function selectShareModeFlow(options: SelectShareModeFlowOptions): boolean {
  if (!isShareMode(options.mode)) return false;

  options.applyPatch(prepareShareModeSelection(options.mode));
  void options.generateShareUrl(options.mode);
  return true;
}
