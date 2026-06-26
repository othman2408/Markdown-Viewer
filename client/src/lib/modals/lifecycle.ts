export interface ModalLifecyclePatch {
  activeModalId: string | null;
}

export interface PrepareModalOpenResult {
  activeModalId: string | null;
  previousActiveModalId: string | null;
  shouldClosePrevious: boolean;
  statePatch: ModalLifecyclePatch;
}

export interface PrepareModalCloseResult {
  activeModalId: string | null;
  closedActiveModal: boolean;
  statePatch: ModalLifecyclePatch | null;
}

export function normalizeModalId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getModalElementId(modal: { id?: string | null } | null | undefined): string | null {
  return normalizeModalId(modal?.id);
}

export function prepareModalOpen(
  currentActiveModalId: string | null,
  targetModalId: string | null
): PrepareModalOpenResult {
  const activeModalId = normalizeModalId(targetModalId);
  const previousActiveModalId = normalizeModalId(currentActiveModalId);

  return {
    activeModalId,
    previousActiveModalId,
    shouldClosePrevious: Boolean(previousActiveModalId && previousActiveModalId !== activeModalId),
    statePatch: {
      activeModalId
    }
  };
}

export function prepareModalClose(
  currentActiveModalId: string | null,
  targetModalId: string | null
): PrepareModalCloseResult {
  const activeModalId = normalizeModalId(currentActiveModalId);
  const normalizedTargetModalId = normalizeModalId(targetModalId);
  const closedActiveModal = Boolean(activeModalId && activeModalId === normalizedTargetModalId);

  return {
    activeModalId: closedActiveModal ? null : activeModalId,
    closedActiveModal,
    statePatch: closedActiveModal
      ? { activeModalId: null }
      : null
  };
}

export function prepareShareModalOpen(targetModalId = 'share-modal'): ModalLifecyclePatch & { shareOpen: true } {
  return {
    activeModalId: normalizeModalId(targetModalId),
    shareOpen: true
  };
}

export function prepareShareModalClose(): ModalLifecyclePatch & { shareOpen: false } {
  return {
    activeModalId: null,
    shareOpen: false
  };
}
