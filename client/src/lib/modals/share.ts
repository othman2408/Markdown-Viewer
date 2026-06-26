import type { ModalStateSnapshot, ShareMode } from '../state/modals.svelte';
import { normalizeShareMode } from '../state/modals.svelte';

export const SHARE_GENERATING_MESSAGE = 'Generating link...';
export const SHARE_ERROR_MESSAGE = 'Error generating link.';
export const SHARE_TOO_LARGE_MESSAGE = 'Document too large to share via URL.';

export type ShareModalPatch = Pick<
  ModalStateSnapshot,
  'shareMode' | 'shareUrl' | 'shareCopyDisabled' | 'shareCopySucceeded'
>;

export function prepareShareModalReset(mode: unknown = 'view'): ShareModalPatch {
  return {
    shareMode: normalizeShareMode(mode),
    shareUrl: '',
    shareCopyDisabled: true,
    shareCopySucceeded: false
  };
}

export function prepareShareModeSelection(mode: unknown): Pick<ShareModalPatch, 'shareMode' | 'shareCopySucceeded'> {
  return {
    shareMode: normalizeShareMode(mode),
    shareCopySucceeded: false
  };
}

export function prepareShareGenerationStart(mode: unknown): ShareModalPatch {
  return {
    shareMode: normalizeShareMode(mode),
    shareUrl: SHARE_GENERATING_MESSAGE,
    shareCopyDisabled: true,
    shareCopySucceeded: false
  };
}

export function prepareShareGenerationSuccess(mode: unknown, url: unknown): ShareModalPatch {
  return {
    shareMode: normalizeShareMode(mode),
    shareUrl: typeof url === 'string' ? url : '',
    shareCopyDisabled: typeof url !== 'string' || url.length === 0,
    shareCopySucceeded: false
  };
}

export function prepareShareGenerationError(mode: unknown): ShareModalPatch {
  return {
    shareMode: normalizeShareMode(mode),
    shareUrl: SHARE_ERROR_MESSAGE,
    shareCopyDisabled: true,
    shareCopySucceeded: false
  };
}

export function prepareShareGenerationTooLarge(mode: unknown): ShareModalPatch {
  return {
    shareMode: normalizeShareMode(mode),
    shareUrl: SHARE_TOO_LARGE_MESSAGE,
    shareCopyDisabled: true,
    shareCopySucceeded: false
  };
}

export function prepareShareCopySucceeded(): Pick<ModalStateSnapshot, 'shareCopySucceeded'> {
  return {
    shareCopySucceeded: true
  };
}

export function prepareShareCopyIdle(): Pick<ModalStateSnapshot, 'shareCopySucceeded'> {
  return {
    shareCopySucceeded: false
  };
}

export function isShareMode(value: unknown): value is ShareMode {
  return value === 'view' || value === 'edit';
}
