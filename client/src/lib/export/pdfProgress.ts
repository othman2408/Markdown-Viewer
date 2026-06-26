export type PdfExportType = 'pdf' | 'png';

export type PdfExportTrigger = HTMLElement & {
  disabled?: boolean;
};

export interface PdfProgressState {
  abortController: AbortController;
  cancelButtons: NodeListOf<Element>;
  cleanedUp: boolean;
  etaText: Element;
  exportType: PdfExportType;
  fill: HTMLElement;
  overlay: HTMLElement;
  percentText: Element;
  progressBar: Element;
  signal: AbortSignal;
  startedAt: number;
  stepText: Element;
  tempElement: HTMLElement | null;
  triggerHtml: Map<PdfExportTrigger, string>;
}

export interface CreatePdfProgressStateOptions {
  documentRef?: Document;
  exportType?: PdfExportType;
  onCancel: (state: PdfProgressState) => void;
}

export interface PdfExportTriggers {
  pdf: Array<PdfExportTrigger | null | undefined>;
  png: Array<PdfExportTrigger | null | undefined>;
}

export interface CleanupPdfExportStateOptions {
  setTriggersBusy: (state: PdfProgressState, busy: boolean) => void;
}

export class PdfExportCancelledError extends Error {
  constructor() {
    super('PDF generation cancelled.');
    this.name = 'PdfExportCancelledError';
  }
}

export function throwIfPdfExportAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new PdfExportCancelledError();
  }
}

export function runPdfAbortable<T>(state: PdfProgressState, promise: PromiseLike<T>): Promise<T> {
  throwIfPdfExportAborted(state.signal);

  return new Promise((resolve, reject) => {
    const handleAbort = () => reject(new PdfExportCancelledError());
    state.signal.addEventListener('abort', handleAbort, { once: true });
    Promise.resolve(promise)
      .then(resolve, reject)
      .finally(() => {
        state.signal.removeEventListener('abort', handleAbort);
      });
  });
}

export function formatPdfExportEta(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'Calculating...';
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export function createPdfProgressState(
  options: CreatePdfProgressStateOptions
): PdfProgressState {
  const exportType = options.exportType ?? 'pdf';
  const documentRef = options.documentRef ?? document;
  const abortController = new AbortController();
  const overlay = documentRef.createElement('div');
  overlay.className = 'pdf-progress-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'pdf-progress-title');

  const isPng = exportType === 'png';
  const titleText = isPng ? 'Generating Image' : 'Generating PDF';
  const cancelLabelText = isPng ? 'Cancel Image generation' : 'Cancel PDF generation';
  const progressLabelText = isPng ? 'Image generation progress' : 'PDF generation progress';
  overlay.innerHTML = `
      <div class="pdf-progress-modal">
        <div class="pdf-progress-header">
          <p class="pdf-progress-title" id="pdf-progress-title">${titleText}</p>
          <button type="button" class="modal-close-btn pdf-progress-cancel-icon" aria-label="${cancelLabelText}" title="${cancelLabelText}">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="pdf-progress-percent">0%</div>
        <div class="pdf-progress-track"
             role="progressbar"
             aria-label="${progressLabelText}"
             aria-valuemin="0"
             aria-valuemax="100"
             aria-valuenow="0">
          <div class="pdf-progress-fill"></div>
        </div>
        <div class="pdf-progress-details">
          <div class="pdf-progress-detail">
            <span>Current Step</span>
            <strong class="pdf-progress-step">Preparing</strong>
          </div>
          <div class="pdf-progress-detail">
            <span>Estimated remaining</span>
            <strong class="pdf-progress-eta">Calculating...</strong>
          </div>
        </div>
        <div class="pdf-progress-actions">
          <button type="button" class="reset-modal-btn reset-modal-cancel pdf-progress-cancel">Cancel</button>
        </div>
      </div>`;

  const state: PdfProgressState = {
    exportType,
    abortController,
    signal: abortController.signal,
    startedAt: performance.now(),
    overlay,
    fill: overlay.querySelector('.pdf-progress-fill') as HTMLElement,
    percentText: overlay.querySelector('.pdf-progress-percent') as Element,
    progressBar: overlay.querySelector('.pdf-progress-track') as Element,
    stepText: overlay.querySelector('.pdf-progress-step') as Element,
    etaText: overlay.querySelector('.pdf-progress-eta') as Element,
    cancelButtons: overlay.querySelectorAll('.pdf-progress-cancel, .pdf-progress-cancel-icon'),
    triggerHtml: new Map(),
    tempElement: null,
    cleanedUp: false
  };

  state.cancelButtons.forEach((button) => {
    button.addEventListener('click', () => options.onCancel(state));
  });

  return state;
}

export function updatePdfProgress(state: PdfProgressState | null | undefined, percent: number, step: string): void {
  if (!state || state.cleanedUp) return;

  const nextPercent = Math.max(0, Math.min(100, Math.round(percent)));
  state.fill.style.width = `${nextPercent}%`;
  state.percentText.textContent = `${nextPercent}%`;
  state.progressBar.setAttribute('aria-valuenow', String(nextPercent));
  state.stepText.textContent = step;
  const elapsed = performance.now() - state.startedAt;
  const eta = nextPercent > 5 && nextPercent < 100
    ? (elapsed / nextPercent) * (100 - nextPercent)
    : 0;
  state.etaText.textContent = nextPercent >= 100 ? 'Complete' : formatPdfExportEta(eta);
}

export function setPdfExportTriggersBusy(
  state: PdfProgressState,
  busy: boolean,
  triggers: PdfExportTriggers
): void {
  const isPng = state.exportType === 'png';
  const triggerList = (isPng ? triggers.png : triggers.pdf).filter(Boolean) as PdfExportTrigger[];

  triggerList.forEach((trigger, index) => {
    if (busy) {
      state.triggerHtml.set(trigger, trigger.innerHTML);
      const generatingLabel = isPng ? 'Generating Image...' : 'Generating PDF...';
      trigger.innerHTML = index === 0
        ? '<i class="bi bi-hourglass-split"></i> Generating...'
        : `<i class="bi bi-hourglass-split me-2"></i> ${generatingLabel}`;
      trigger.classList.add('pdf-export-loading');
      trigger.setAttribute('aria-disabled', 'true');
      trigger.disabled = true;
    } else {
      if (state.triggerHtml.has(trigger)) {
        trigger.innerHTML = state.triggerHtml.get(trigger) || '';
      }
      trigger.classList.remove('pdf-export-loading');
      trigger.removeAttribute('aria-disabled');
      trigger.disabled = false;
    }
  });
}

export function cleanupPdfExportState(
  state: PdfProgressState | null | undefined,
  options: CleanupPdfExportStateOptions
): void {
  if (!state || state.cleanedUp) return;

  state.cleanedUp = true;
  state.tempElement?.parentNode?.removeChild(state.tempElement);
  state.overlay.parentNode?.removeChild(state.overlay);
  options.setTriggersBusy(state, false);
}

export function cancelPdfExportState(
  state: PdfProgressState | null | undefined,
  cleanup: (state: PdfProgressState) => void
): void {
  if (!state || state.signal.aborted) return;

  state.abortController.abort();
  cleanup(state);
}

export async function waitForPdfFrame(
  state: PdfProgressState,
  requestFrame: typeof requestAnimationFrame = requestAnimationFrame
): Promise<void> {
  throwIfPdfExportAborted(state.signal);
  await new Promise<void>((resolve) => requestFrame(() => resolve()));
  throwIfPdfExportAborted(state.signal);
}
