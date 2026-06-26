import {
  PdfExportCancelledError,
  cancelPdfExportState,
  cleanupPdfExportState,
  createPdfProgressState,
  runPdfAbortable,
  setPdfExportTriggersBusy,
  throwIfPdfExportAborted,
  updatePdfProgress,
  waitForPdfFrame,
  type PdfExportTrigger,
  type PdfExportType,
  type PdfProgressState
} from '../export/pdfProgress';
import {
  PDF_PAGE_CONFIG,
  applyPageBreaksWithCascade,
  choosePdfCanvasScale,
  fitExportElementToContent,
  markdownLikelyContainsMath,
  waitForAllImages
} from '../export/exportLayout';
import {
  createExportTempElement,
  removeExportMathJaxArtifacts,
  replaceExportSvgContainersWithImages
} from '../export/exportDom';
import { buildStandaloneHtmlExportDocument } from '../export/htmlExport';
import { renderCanvasToPdfPages } from '../export/pdfPages';
import { saveCanvasAsPng, type SaveAsFn } from '../export/pngExport';
import { createExportSanitizeOptions } from '../export/exportSanitize';
import { extractReferenceDefinitions } from '../markdown/editing';
import { applyReferencePreviewLinks, enhanceGitHubAlerts } from '../markdown/previewPostProcessing';
import { parseFrontmatter, renderFrontmatterTable, type YamlAdapter } from '../markdown/frontmatter';

export interface ExportCdnUrls {
  abcjs: string;
  html2canvas: string;
  jspdf: string;
  mermaid: string;
}

export interface MarkedLike {
  parse(markdown: string): string | Promise<string>;
}

export interface DomPurifyLike {
  sanitize(html: string, options?: unknown): string;
}

export interface MermaidExportRuntime {
  init(config: unknown, nodes: NodeListOf<Element>): unknown;
}

export interface AbcExportRuntime {
  renderAbc(id: string, code: string, options?: Record<string, unknown>): unknown;
}

export interface MathJaxExportRuntime {
  typesetPromise(elements: HTMLElement[]): Promise<unknown>;
}

export interface Html2CanvasExportOptions {
  allowTaint: boolean;
  logging: boolean;
  scale: number;
  useCORS: boolean;
  windowHeight: number;
  windowWidth: number;
}

export type Html2CanvasExportRuntime = (
  element: HTMLElement,
  options: Html2CanvasExportOptions
) => Promise<HTMLCanvasElement>;

export interface JsPdfDocument {
  addImage(
    imageData: string,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void;
  addPage(): void;
  internal: {
    pageSize: {
      getHeight(): number;
      getWidth(): number;
    };
  };
  save(filename: string): void;
}

export interface JsPdfExportRuntime {
  jsPDF: new (options: Record<string, unknown>) => JsPdfDocument;
}

export interface CreateExportRuntimeOptions {
  alertRef?: (message?: unknown) => void;
  cdn: ExportCdnUrls;
  consoleRef?: Pick<Console, 'error' | 'info' | 'log' | 'warn'>;
  documentRef?: Document;
  editor: Pick<HTMLTextAreaElement, 'value'>;
  exportButtons: {
    mobilePdf?: PdfExportTrigger | null;
    mobilePng?: PdfExportTrigger | null;
    pdf?: PdfExportTrigger | null;
    png?: PdfExportTrigger | null;
  };
  getABCJS(): AbcExportRuntime | undefined;
  getDomPurify(): DomPurifyLike;
  getExportFilename(extension: string, fallback: string): string;
  getHtml2Canvas(): Html2CanvasExportRuntime | undefined;
  getJsPdf(): JsPdfExportRuntime | undefined;
  getMarked(): MarkedLike;
  getMathJax(): MathJaxExportRuntime | undefined;
  getMermaid(): MermaidExportRuntime | undefined;
  initMermaid(forceReinit?: boolean): void;
  jsYaml: YamlAdapter;
  loadScript(url: string): Promise<unknown>;
  saveAs: SaveAsFn;
}

export interface ExportRuntime {
  handleExportHtml(event?: Event | null): Promise<void>;
  handleExportPdf(event?: Event | null): Promise<void>;
  handleExportPng(event?: Event | null): Promise<void>;
}

function preventDefault(event?: Event | null): void {
  event?.preventDefault();
}

function createErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function parseMarkdown(markedRef: MarkedLike, markdown: string): Promise<string> {
  return await markedRef.parse(markdown);
}

function markLoadingContainersComplete(root: ParentNode, selector: string): void {
  root.querySelectorAll(selector).forEach((container) => {
    container.classList.remove('is-loading');
  });
}

export function createExportRuntime(options: CreateExportRuntimeOptions): ExportRuntime {
  const documentRef = options.documentRef ?? document;
  const consoleRef = options.consoleRef ?? console;
  const alertRef = options.alertRef ?? alert;
  const pdfPageConfig = PDF_PAGE_CONFIG;
  const pdfExportDebug = false;
  let activePdfExport: PdfProgressState | null = null;

  function logPdfExportDebug(...args: unknown[]): void {
    if (pdfExportDebug) consoleRef.log(...args);
  }

  function createProgressState(exportType: PdfExportType = 'pdf'): PdfProgressState {
    return createPdfProgressState({
      documentRef,
      exportType,
      onCancel: cancelPdfExport
    });
  }

  function setTriggersBusy(state: PdfProgressState, busy: boolean): void {
    setPdfExportTriggersBusy(state, busy, {
      pdf: [options.exportButtons.pdf, options.exportButtons.mobilePdf],
      png: [options.exportButtons.png, options.exportButtons.mobilePng]
    });
  }

  function cleanupPdfExport(state: PdfProgressState): void {
    cleanupPdfExportState(state, { setTriggersBusy });
    if (activePdfExport === state) {
      activePdfExport = null;
    }
  }

  function cancelPdfExport(state: PdfProgressState): void {
    cancelPdfExportState(state, cleanupPdfExport);
  }

  async function createSanitizedExportHtml(markdown: string, mode: 'canvas' | 'standalone-html'): Promise<string> {
    const html = await parseMarkdown(options.getMarked(), markdown);
    return options.getDomPurify().sanitize(html, createExportSanitizeOptions(mode));
  }

  function createCanvasExportElement(
    sanitizedHtml: string,
    progressState: PdfProgressState,
    mode: 'pdf' | 'png'
  ): HTMLElement {
    const tempElement = createExportTempElement({
      documentRef,
      enhance: enhanceGitHubAlerts,
      html: sanitizedHtml,
      mode
    });
    progressState.tempElement = tempElement;
    documentRef.body.appendChild(tempElement);
    return tempElement;
  }

  async function renderMermaidForPdf(tempElement: HTMLElement, progressState: PdfProgressState): Promise<void> {
    const mermaidNodes = tempElement.querySelectorAll('.mermaid');
    if (mermaidNodes.length === 0) return;

    updatePdfProgress(progressState, 34, 'Rendering diagrams');
    try {
      if (!options.getMermaid()) {
        await runPdfAbortable(progressState, options.loadScript(options.cdn.mermaid));
      }
      throwIfPdfExportAborted(progressState.signal);
      const mermaid = options.getMermaid();
      if (!mermaid) throw new Error('Mermaid is not available.');
      options.initMermaid(true);
      await runPdfAbortable(progressState, Promise.resolve(mermaid.init(undefined, mermaidNodes)));
      markLoadingContainersComplete(tempElement, '.mermaid-container.is-loading');
      replaceExportSvgContainersWithImages(tempElement, {
        containerSelector: '.mermaid-container',
        imageClassName: 'mermaid-img',
        preserveSvgId: true,
        setClonedSvgInlineSize: true,
        setImageMaxWidth: true,
        storeOriginalSize: true,
        useAttributeSizeFallback: true,
        useClientSizeFallback: true
      });
    } catch (error) {
      if (error instanceof PdfExportCancelledError) throw error;
      consoleRef.warn('Mermaid rendering issue:', error);
      markLoadingContainersComplete(tempElement, '.mermaid-container.is-loading');
    }
    throwIfPdfExportAborted(progressState.signal);
    await waitForPdfFrame(progressState);
  }

  async function renderMermaidForPng(tempElement: HTMLElement, progressState: PdfProgressState): Promise<void> {
    const mermaidNodes = tempElement.querySelectorAll('.mermaid');
    if (mermaidNodes.length === 0) return;

    updatePdfProgress(progressState, 50, 'Rendering diagrams');
    try {
      if (!options.getMermaid()) {
        await runPdfAbortable(progressState, options.loadScript(options.cdn.mermaid));
      }
      throwIfPdfExportAborted(progressState.signal);
      const mermaid = options.getMermaid();
      if (!mermaid) throw new Error('Mermaid is not available.');
      options.initMermaid(true);
      await runPdfAbortable(progressState, Promise.resolve(mermaid.init(undefined, mermaidNodes)));
      markLoadingContainersComplete(tempElement, '.mermaid-container.is-loading');
      replaceExportSvgContainersWithImages(tempElement, {
        containerSelector: '.mermaid-container',
        imageClassName: 'mermaid-img'
      });
    } catch (error) {
      if (error instanceof PdfExportCancelledError) throw error;
      consoleRef.warn('Mermaid issue:', error);
    }
    throwIfPdfExportAborted(progressState.signal);
    await waitForPdfFrame(progressState);
  }

  async function renderAbcForPdf(tempElement: HTMLElement, progressState: PdfProgressState): Promise<void> {
    const abcNodes = tempElement.querySelectorAll('.abc-notation');
    if (abcNodes.length === 0) return;

    updatePdfProgress(progressState, 40, 'Rendering music notation');
    try {
      if (!options.getABCJS()) {
        await runPdfAbortable(progressState, options.loadScript(options.cdn.abcjs));
      }
      throwIfPdfExportAborted(progressState.signal);
      const abc = options.getABCJS();
      if (!abc) throw new Error('ABCJS is not available.');
      abcNodes.forEach((node) => {
        const abcCode = decodeURIComponent(node.getAttribute('data-original-code') || '');
        if (abcCode) {
          abc.renderAbc((node as HTMLElement).id, abcCode, { responsive: 'resize' });
        }
      });
      markLoadingContainersComplete(tempElement, '.abc-container.is-loading');
      replaceExportSvgContainersWithImages(tempElement, {
        containerSelector: '.abc-container',
        imageClassName: 'abc-img',
        setClonedSvgInlineSize: true,
        setImageMaxWidth: true,
        storeOriginalSize: true,
        useAttributeSizeFallback: true,
        useClientSizeFallback: true
      });
    } catch (error) {
      if (error instanceof PdfExportCancelledError) throw error;
      consoleRef.warn('ABC rendering issue:', error);
      markLoadingContainersComplete(tempElement, '.abc-container.is-loading');
    }
    throwIfPdfExportAborted(progressState.signal);
    await waitForPdfFrame(progressState);
  }

  async function renderAbcForPng(tempElement: HTMLElement, progressState: PdfProgressState): Promise<void> {
    const abcNodes = tempElement.querySelectorAll('.abc-notation');
    if (abcNodes.length === 0) return;

    updatePdfProgress(progressState, 60, 'Rendering music notation');
    try {
      if (!options.getABCJS()) {
        await runPdfAbortable(progressState, options.loadScript(options.cdn.abcjs));
      }
      throwIfPdfExportAborted(progressState.signal);
      const abc = options.getABCJS();
      if (!abc) throw new Error('ABCJS is not available.');
      abcNodes.forEach((node) => {
        const abcCode = decodeURIComponent(node.getAttribute('data-original-code') || '');
        if (abcCode) {
          abc.renderAbc((node as HTMLElement).id, abcCode, { responsive: 'resize' });
        }
      });
      markLoadingContainersComplete(tempElement, '.abc-container.is-loading');
      replaceExportSvgContainersWithImages(tempElement, {
        containerSelector: '.abc-container'
      });
    } catch (error) {
      if (error instanceof PdfExportCancelledError) throw error;
      consoleRef.warn('ABC rendering issue:', error);
    }
    throwIfPdfExportAborted(progressState.signal);
    await waitForPdfFrame(progressState);
  }

  async function renderMathForExport(
    markdown: string,
    tempElement: HTMLElement,
    progressState: PdfProgressState,
    percent: number,
    warnMessage?: string
  ): Promise<void> {
    const mathJax = options.getMathJax();
    if (!mathJax || !markdownLikelyContainsMath(markdown)) return;

    updatePdfProgress(progressState, percent, 'Rendering math');
    try {
      await runPdfAbortable(progressState, mathJax.typesetPromise([tempElement]));
    } catch (error) {
      if (error instanceof PdfExportCancelledError) throw error;
      if (warnMessage) consoleRef.warn(warnMessage, error);
    }
    throwIfPdfExportAborted(progressState.signal);
    removeExportMathJaxArtifacts(tempElement);
  }

  async function waitForExportAssets(tempElement: HTMLElement, progressState: PdfProgressState, percent: number): Promise<void> {
    await waitForPdfFrame(progressState);
    fitExportElementToContent(tempElement);
    await waitForPdfFrame(progressState);
    updatePdfProgress(progressState, percent, 'Loading document assets');
    await runPdfAbortable(progressState, Promise.all([
      waitForAllImages(tempElement),
      documentRef.fonts ? documentRef.fonts.ready : Promise.resolve()
    ]));
    throwIfPdfExportAborted(progressState.signal);
    await waitForPdfFrame(progressState);
  }

  async function handleExportHtml(event?: Event | null): Promise<void> {
    preventDefault(event);
    try {
      const { frontmatter, body } = parseFrontmatter(options.editor.value, options.jsYaml);
      const tableHtml = frontmatter ? renderFrontmatterTable(frontmatter, options.jsYaml) : '';
      const referenceData = extractReferenceDefinitions(body);
      const html = tableHtml + await parseMarkdown(options.getMarked(), referenceData.cleanedMarkdown);
      const sanitizedHtml = options.getDomPurify().sanitize(html, createExportSanitizeOptions('standalone-html'));
      const tempContainer = documentRef.createElement('div');
      tempContainer.innerHTML = sanitizedHtml;
      applyReferencePreviewLinks(tempContainer, referenceData.definitions);
      enhanceGitHubAlerts(tempContainer);
      const enhancedHtml = tempContainer.innerHTML;
      const fullHtml = buildStandaloneHtmlExportDocument({
        bodyHtml: enhancedHtml,
        darkTheme: documentRef.documentElement.getAttribute('data-theme') === 'dark'
      });
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      options.saveAs(blob, options.getExportFilename('html', 'document.html'));
    } catch (error) {
      consoleRef.error('HTML export failed:', error);
      alertRef(`HTML export failed: ${createErrorMessage(error)}`);
    }
  }

  async function handleExportPdf(event?: Event | null): Promise<void> {
    preventDefault(event);
    logPdfExportDebug('PDF export button clicked!');
    if (activePdfExport) {
      logPdfExportDebug('PDF export already active, ignoring click');
      return;
    }

    const progressState = createProgressState();
    activePdfExport = progressState;
    setTriggersBusy(progressState, true);
    documentRef.body.appendChild(progressState.overlay);
    updatePdfProgress(progressState, 3, 'Starting');
    progressState.overlay.querySelector<HTMLElement>('.pdf-progress-cancel')?.focus();

    try {
      logPdfExportDebug('PDF export try block entered. typeof jspdf:', typeof options.getJsPdf(), 'typeof html2canvas:', typeof options.getHtml2Canvas());
      if (!options.getJsPdf() || !options.getHtml2Canvas()) {
        logPdfExportDebug('Lazy loading PDF libraries started...');
        updatePdfProgress(progressState, 8, 'Loading PDF libraries');
        await runPdfAbortable(progressState, Promise.all([
          options.loadScript(options.cdn.jspdf).then(() => logPdfExportDebug('jspdf load callback fired')),
          options.loadScript(options.cdn.html2canvas).then(() => logPdfExportDebug('html2canvas load callback fired'))
        ]));
        logPdfExportDebug('Lazy loading PDF libraries resolved.');
        throwIfPdfExportAborted(progressState.signal);
      }

      logPdfExportDebug('Parsing markdown...');
      updatePdfProgress(progressState, 15, 'Parsing markdown');
      await waitForPdfFrame(progressState);
      const markdown = options.editor.value;
      const sanitizedHtml = await createSanitizedExportHtml(markdown, 'canvas');
      throwIfPdfExportAborted(progressState.signal);
      updatePdfProgress(progressState, 24, 'Preparing document');
      await waitForPdfFrame(progressState);
      const tempElement = createCanvasExportElement(sanitizedHtml, progressState, 'pdf');
      await waitForPdfFrame(progressState);
      await renderMermaidForPdf(tempElement, progressState);
      await renderAbcForPdf(tempElement, progressState);
      await renderMathForExport(markdown, tempElement, progressState, 44, 'MathJax rendering issue:');
      await waitForExportAssets(tempElement, progressState, 50);

      updatePdfProgress(progressState, 55, 'Optimizing page breaks');
      applyPageBreaksWithCascade(tempElement, pdfPageConfig, 10, progressState.signal, {
        debug: logPdfExportDebug
      });
      throwIfPdfExportAborted(progressState.signal);
      await waitForPdfFrame(progressState);

      const pdfRuntime = options.getJsPdf();
      const html2canvasRuntime = options.getHtml2Canvas();
      if (!pdfRuntime || !html2canvasRuntime) {
        throw new Error('PDF export libraries are not available.');
      }
      const pdf = new pdfRuntime.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        hotfixes: ['px_scaling']
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      const captureScale = choosePdfCanvasScale(tempElement);
      updatePdfProgress(progressState, 65, 'Capturing document');
      const canvas = await runPdfAbortable(progressState, html2canvasRuntime(tempElement, {
        scale: captureScale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        windowWidth: Math.max(pdfPageConfig.windowWidth, Math.ceil(tempElement.getBoundingClientRect().width)),
        windowHeight: Math.ceil(tempElement.getBoundingClientRect().height)
      }));
      await waitForPdfFrame(progressState);
      throwIfPdfExportAborted(progressState.signal);
      logPdfExportDebug(`[PDF DEBUG] canvas.width = ${canvas.width}, canvas.height = ${canvas.height}`);
      logPdfExportDebug(`[PDF DEBUG] tempElement.offsetWidth = ${tempElement.offsetWidth}, rect.width = ${tempElement.getBoundingClientRect().width}`);
      const scaleFactor = canvas.width / contentWidth;
      logPdfExportDebug(`[PDF DEBUG] scaleFactor = ${scaleFactor}, PAGE_CONFIG.scale = ${pdfPageConfig.scale}, captureScale = ${captureScale}`);
      const imgHeight = canvas.height / scaleFactor;
      logPdfExportDebug(`[PDF DEBUG] imgHeight = ${imgHeight}, contentHeight = ${pageHeight - margin * 2}`);
      const pagesCount = Math.ceil((imgHeight - 0.5) / (pageHeight - margin * 2));
      logPdfExportDebug(`[PDF DEBUG] pagesCount = ${pagesCount}`);
      updatePdfProgress(progressState, 76, 'Rendering pages');
      await renderCanvasToPdfPages(canvas, pdf, {
        contentWidth,
        documentRef,
        margin,
        pageHeight,
        throwIfAborted: () => throwIfPdfExportAborted(progressState.signal),
        updateProgress: (percent, step) => updatePdfProgress(progressState, percent, step),
        waitForPage: () => waitForPdfFrame(progressState)
      });
      throwIfPdfExportAborted(progressState.signal);
      updatePdfProgress(progressState, 98, 'Preparing download');
      pdf.save(options.getExportFilename('pdf', 'document.pdf'));
      updatePdfProgress(progressState, 100, 'Complete');
    } catch (error) {
      if (error instanceof PdfExportCancelledError || progressState.signal.aborted) {
        consoleRef.info('PDF export cancelled');
      } else {
        consoleRef.error('PDF export failed:', error);
        alertRef(`PDF export failed: ${createErrorMessage(error)}`);
      }
    } finally {
      cleanupPdfExport(progressState);
    }
  }

  async function handleExportPng(event?: Event | null): Promise<void> {
    preventDefault(event);
    logPdfExportDebug('PNG export button clicked!');
    if (activePdfExport) {
      logPdfExportDebug('Export already active, ignoring click');
      return;
    }

    const progressState = createProgressState('png');
    activePdfExport = progressState;
    setTriggersBusy(progressState, true);
    documentRef.body.appendChild(progressState.overlay);
    updatePdfProgress(progressState, 5, 'Starting PNG Export');
    progressState.overlay.querySelector<HTMLElement>('.pdf-progress-cancel')?.focus();

    try {
      if (!options.getHtml2Canvas()) {
        updatePdfProgress(progressState, 15, 'Loading image renderer');
        await runPdfAbortable(progressState, options.loadScript(options.cdn.html2canvas));
        throwIfPdfExportAborted(progressState.signal);
      }

      updatePdfProgress(progressState, 25, 'Parsing markdown');
      await waitForPdfFrame(progressState);
      const markdown = options.editor.value;
      const sanitizedHtml = await createSanitizedExportHtml(markdown, 'canvas');
      throwIfPdfExportAborted(progressState.signal);
      updatePdfProgress(progressState, 40, 'Preparing document');
      await waitForPdfFrame(progressState);
      const tempElement = createCanvasExportElement(sanitizedHtml, progressState, 'png');
      await waitForPdfFrame(progressState);
      await renderMermaidForPng(tempElement, progressState);
      await renderAbcForPng(tempElement, progressState);
      await renderMathForExport(markdown, tempElement, progressState, 70);
      await waitForExportAssets(tempElement, progressState, 80);

      const html2canvasRuntime = options.getHtml2Canvas();
      if (!html2canvasRuntime) {
        throw new Error('Image export library is not available.');
      }
      updatePdfProgress(progressState, 90, 'Capturing image');
      const canvas = await runPdfAbortable(progressState, html2canvasRuntime(tempElement, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        windowWidth: Math.max(1000, Math.ceil(tempElement.getBoundingClientRect().width)),
        windowHeight: Math.ceil(tempElement.getBoundingClientRect().height)
      }));
      await waitForPdfFrame(progressState);
      throwIfPdfExportAborted(progressState.signal);
      updatePdfProgress(progressState, 95, 'Saving image');
      await runPdfAbortable(progressState, saveCanvasAsPng(canvas, options.getExportFilename('png', 'document.png'), {
        saveAsFn: options.saveAs
      }));
      updatePdfProgress(progressState, 100, 'Complete');
    } catch (error) {
      if (error instanceof PdfExportCancelledError || progressState.signal.aborted) {
        consoleRef.info('PNG export cancelled');
      } else {
        consoleRef.error('PNG export failed:', error);
        alertRef(`PNG export failed: ${createErrorMessage(error)}`);
      }
    } finally {
      cleanupPdfExport(progressState);
    }
  }

  return {
    handleExportHtml,
    handleExportPdf,
    handleExportPng
  };
}
