// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultModalState, type ModalStateSnapshot } from '../../../lib/state/modals.svelte';
import { createShareModalController } from '../../../lib/modals/shareController';

function createControllerHarness(initial: Partial<ModalStateSnapshot> = {}) {
  let snapshot: ModalStateSnapshot = {
    ...createDefaultModalState(),
    ...initial
  };
  const state = {
    get shareOpen() {
      return snapshot.shareOpen;
    },
    get shareUrl() {
      return snapshot.shareUrl;
    },
    get shareCopyDisabled() {
      return snapshot.shareCopyDisabled;
    }
  };
  const stateWriter = {
    update(updater: (state: ModalStateSnapshot) => ModalStateSnapshot) {
      snapshot = updater(snapshot);
    }
  };

  return {
    get snapshot() {
      return snapshot;
    },
    state,
    stateWriter
  };
}

describe('share modal controller', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects share mode and dispatches through the share mode callback', () => {
    const harness = createControllerHarness();
    const dispatchModeSelection = vi.fn();
    const controller = createShareModalController({
      state: harness.state,
      stateWriter: harness.stateWriter,
      dispatchModeSelection
    });

    controller.selectShareMode('edit');

    expect(harness.snapshot.shareMode).toBe('edit');
    expect(harness.snapshot.shareCopySucceeded).toBe(false);
    expect(dispatchModeSelection).toHaveBeenCalledWith('edit');
  });

  it('closes from overlay clicks and Escape only when the share modal is open', () => {
    const overlay = document.createElement('div');
    const child = document.createElement('button');
    const harness = createControllerHarness({
      activeModalId: 'share-modal',
      shareOpen: true
    });
    const controller = createShareModalController({
      state: harness.state,
      stateWriter: harness.stateWriter
    });

    controller.handleOverlayClick({ target: child, currentTarget: overlay } as unknown as MouseEvent);
    expect(harness.snapshot.shareOpen).toBe(true);

    controller.handleWindowKeydown({ key: 'Enter' } as KeyboardEvent);
    expect(harness.snapshot.shareOpen).toBe(true);

    controller.handleOverlayClick({ target: overlay, currentTarget: overlay } as unknown as MouseEvent);
    expect(harness.snapshot.shareOpen).toBe(false);
    expect(harness.snapshot.activeModalId).toBeNull();

    harness.stateWriter.update((state) => ({
      ...state,
      activeModalId: 'share-modal',
      shareOpen: true
    }));
    controller.handleWindowKeydown({ key: 'Escape' } as KeyboardEvent);
    expect(harness.snapshot.shareOpen).toBe(false);
  });

  it('copies the share URL and resets copy feedback after the configured delay', async () => {
    vi.useFakeTimers();
    const harness = createControllerHarness({
      shareUrl: 'https://example.com/share/token',
      shareCopyDisabled: false
    });
    const copyText = vi.fn(async () => true);
    const controller = createShareModalController({
      state: harness.state,
      stateWriter: harness.stateWriter,
      copyText
    });

    await controller.copyShareUrl();

    expect(copyText).toHaveBeenCalledWith('https://example.com/share/token');
    expect(harness.snapshot.shareCopySucceeded).toBe(true);

    await vi.advanceTimersByTimeAsync(2000);

    expect(harness.snapshot.shareCopySucceeded).toBe(false);
  });

  it('does not copy empty, disabled, or failed share URLs', async () => {
    const emptyHarness = createControllerHarness({
      shareUrl: '',
      shareCopyDisabled: false
    });
    const disabledHarness = createControllerHarness({
      shareUrl: 'https://example.com/share/token',
      shareCopyDisabled: true
    });
    const failedHarness = createControllerHarness({
      shareUrl: 'https://example.com/share/token',
      shareCopyDisabled: false
    });
    const copyText = vi.fn(async () => true);
    const failedCopyText = vi.fn(async () => false);

    await createShareModalController({
      state: emptyHarness.state,
      stateWriter: emptyHarness.stateWriter,
      copyText
    }).copyShareUrl();
    await createShareModalController({
      state: disabledHarness.state,
      stateWriter: disabledHarness.stateWriter,
      copyText
    }).copyShareUrl();
    await createShareModalController({
      state: failedHarness.state,
      stateWriter: failedHarness.stateWriter,
      copyText: failedCopyText
    }).copyShareUrl();

    expect(copyText).not.toHaveBeenCalled();
    expect(failedCopyText).toHaveBeenCalledOnce();
    expect(failedHarness.snapshot.shareCopySucceeded).toBe(false);
  });
});
