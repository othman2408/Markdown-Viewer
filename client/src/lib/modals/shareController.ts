import type { ModalStateApi, ModalStateSnapshot, ShareMode } from '../state/modals.svelte';
import { modalState, normalizeModalState } from '../state/modals.svelte';
import { prepareShareModalClose } from './lifecycle';
import { prepareShareCopyIdle, prepareShareCopySucceeded, prepareShareModeSelection } from './share';
import { dispatchShareModeSelection } from './shareBridge';
import { copyTextToClipboard } from './shareClipboard';

type ModalStateWriter = {
  update(updater: (state: ModalStateSnapshot) => ModalStateSnapshot): void;
};

type ShareModalReadableState = Pick<ModalStateApi, 'shareOpen' | 'shareUrl' | 'shareCopyDisabled'>;

export interface ShareModalController {
  selectShareMode(mode: ShareMode): void;
  closeShareModal(): void;
  handleOverlayClick(event: MouseEvent): void;
  handleWindowKeydown(event: KeyboardEvent): void;
  copyShareUrl(): Promise<void>;
  destroy(): void;
}

export interface ShareModalControllerOptions {
  state?: ShareModalReadableState;
  stateWriter?: ModalStateWriter;
  copyText?: (text: string) => Promise<boolean>;
  dispatchModeSelection?: (mode: ShareMode) => void;
  feedbackDelayMs?: number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}

export function createShareModalController(options: ShareModalControllerOptions = {}): ShareModalController {
  const state = options.state ?? modalState;
  const stateWriter = options.stateWriter ?? {
    update(updater: (state: ModalStateSnapshot) => ModalStateSnapshot) {
      modalState.replace(updater(normalizeModalState(modalState.snapshot)));
    }
  };
  const copyText = options.copyText ?? copyTextToClipboard;
  const dispatchModeSelection = options.dispatchModeSelection ?? dispatchShareModeSelection;
  const feedbackDelayMs = options.feedbackDelayMs ?? 2000;
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;

  let shareCopyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  function updateModalState(patch: Partial<ModalStateSnapshot>): void {
    stateWriter.update((current) => ({
      ...current,
      ...patch
    }));
  }

  function clearShareCopyFeedbackTimer(): void {
    if (!shareCopyFeedbackTimer) return;

    clearTimer(shareCopyFeedbackTimer);
    shareCopyFeedbackTimer = null;
  }

  function showShareCopyFeedback(): void {
    clearShareCopyFeedbackTimer();
    updateModalState(prepareShareCopySucceeded());

    shareCopyFeedbackTimer = setTimer(() => {
      updateModalState(prepareShareCopyIdle());
      shareCopyFeedbackTimer = null;
    }, feedbackDelayMs);
  }

  function selectShareMode(mode: ShareMode): void {
    updateModalState(prepareShareModeSelection(mode));
    dispatchModeSelection(mode);
  }

  function closeShareModal(): void {
    updateModalState(prepareShareModalClose());
  }

  function handleOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      closeShareModal();
    }
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (state.shareOpen && event.key === 'Escape') {
      closeShareModal();
    }
  }

  async function copyShareUrl(): Promise<void> {
    const url = state.shareUrl;
    if (!url || state.shareCopyDisabled) return;

    if (await copyText(url)) {
      showShareCopyFeedback();
    }
  }

  function destroy(): void {
    clearShareCopyFeedbackTimer();
  }

  return {
    selectShareMode,
    closeShareModal,
    handleOverlayClick,
    handleWindowKeydown,
    copyShareUrl,
    destroy
  };
}
