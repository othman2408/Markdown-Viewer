// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PdfExportCancelledError,
  cancelPdfExportState,
  cleanupPdfExportState,
  createPdfProgressState,
  formatPdfExportEta,
  runPdfAbortable,
  setPdfExportTriggersBusy,
  throwIfPdfExportAborted,
  updatePdfProgress,
  waitForPdfFrame,
  type PdfExportTrigger,
  type PdfProgressState
} from '../../../lib/export/pdfProgress';

function createTrigger(html: string): PdfExportTrigger {
  const button = document.createElement('button') as PdfExportTrigger;
  button.innerHTML = html;
  return button;
}

function createState(exportType: 'pdf' | 'png' = 'pdf', onCancel = vi.fn()): PdfProgressState {
  return createPdfProgressState({ exportType, onCancel });
}

describe('PDF export progress helpers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('formats estimated remaining time', () => {
    expect(formatPdfExportEta(0)).toBe('Calculating...');
    expect(formatPdfExportEta(1200)).toBe('2s');
    expect(formatPdfExportEta(61_000)).toBe('1m 1s');
    expect(formatPdfExportEta(120_000)).toBe('2m');
  });

  it('creates PDF and PNG progress overlays with preserved labels', () => {
    const pdfState = createState('pdf');
    const pngState = createState('png');

    expect(pdfState.overlay.querySelector('#pdf-progress-title')?.textContent).toBe('Generating PDF');
    expect(pdfState.progressBar.getAttribute('aria-label')).toBe('PDF generation progress');
    expect(pngState.overlay.querySelector('#pdf-progress-title')?.textContent).toBe('Generating Image');
    expect(pngState.progressBar.getAttribute('aria-label')).toBe('Image generation progress');
  });

  it('updates progress and ignores cleaned up states', () => {
    const state = createState();

    updatePdfProgress(state, 24.4, 'Preparing document');

    expect(state.fill.style.width).toBe('24%');
    expect(state.percentText.textContent).toBe('24%');
    expect(state.progressBar.getAttribute('aria-valuenow')).toBe('24');
    expect(state.stepText.textContent).toBe('Preparing document');

    state.cleanedUp = true;
    updatePdfProgress(state, 80, 'Capturing');
    expect(state.percentText.textContent).toBe('24%');
  });

  it('sets export triggers busy and restores their original content', () => {
    const state = createState('png');
    const pdfTrigger = createTrigger('<i></i> PDF');
    const pngDesktop = createTrigger('<i></i> PNG');
    const pngMobile = createTrigger('<i></i> Image');

    setPdfExportTriggersBusy(state, true, {
      pdf: [pdfTrigger],
      png: [pngDesktop, pngMobile]
    });

    expect(pdfTrigger.classList.contains('pdf-export-loading')).toBe(false);
    expect(pngDesktop.classList.contains('pdf-export-loading')).toBe(true);
    expect(pngDesktop.getAttribute('aria-disabled')).toBe('true');
    expect(pngDesktop.disabled).toBe(true);
    expect(pngMobile.innerHTML).toBe('<i class="bi bi-hourglass-split me-2"></i> Generating Image...');

    setPdfExportTriggersBusy(state, false, {
      pdf: [pdfTrigger],
      png: [pngDesktop, pngMobile]
    });

    expect(pngDesktop.innerHTML).toBe('<i></i> PNG');
    expect(pngMobile.innerHTML).toBe('<i></i> Image');
    expect(pngDesktop.classList.contains('pdf-export-loading')).toBe(false);
    expect(pngDesktop.hasAttribute('aria-disabled')).toBe(false);
    expect(pngDesktop.disabled).toBe(false);
  });

  it('cleans up overlay, temp element, and trigger state once', () => {
    const state = createState();
    const setTriggersBusy = vi.fn();
    const tempElement = document.createElement('div');
    state.tempElement = tempElement;
    document.body.appendChild(state.overlay);
    document.body.appendChild(tempElement);

    cleanupPdfExportState(state, { setTriggersBusy });
    cleanupPdfExportState(state, { setTriggersBusy });

    expect(state.cleanedUp).toBe(true);
    expect(document.body.contains(state.overlay)).toBe(false);
    expect(document.body.contains(tempElement)).toBe(false);
    expect(setTriggersBusy).toHaveBeenCalledOnce();
    expect(setTriggersBusy).toHaveBeenCalledWith(state, false);
  });

  it('wires cancel buttons to the provided cancel callback', () => {
    const onCancel = vi.fn();
    const state = createState('pdf', onCancel);

    state.overlay.querySelector<HTMLButtonElement>('.pdf-progress-cancel')?.click();

    expect(onCancel).toHaveBeenCalledWith(state);
  });

  it('aborts and cleans up through cancel helper', () => {
    const state = createState();
    const cleanup = vi.fn();

    cancelPdfExportState(state, cleanup);
    cancelPdfExportState(state, cleanup);

    expect(state.signal.aborted).toBe(true);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledWith(state);
  });

  it('throws and rejects with the cancellation error type', async () => {
    const state = createState();
    const pending = new Promise<void>(() => {});
    const abortable = runPdfAbortable(state, pending);

    state.abortController.abort();

    expect(() => throwIfPdfExportAborted(state.signal)).toThrow(PdfExportCancelledError);
    await expect(abortable).rejects.toBeInstanceOf(PdfExportCancelledError);
  });

  it('waits for a frame and checks cancellation after the frame', async () => {
    const state = createState();
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      state.abortController.abort();
      callback(0);
      return 1;
    });

    await expect(waitForPdfFrame(state, requestFrame)).rejects.toBeInstanceOf(PdfExportCancelledError);
    expect(requestFrame).toHaveBeenCalledOnce();
  });
});
