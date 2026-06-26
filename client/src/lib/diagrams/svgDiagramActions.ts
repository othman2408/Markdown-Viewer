import { svgToCanvas } from './svgExport';

export interface SvgDiagramActionOptions {
  clipboardItemCtor?: typeof ClipboardItem;
  createAnchor?: () => HTMLAnchorElement;
  createObjectUrl?: (blob: Blob) => string;
  error?: (...args: unknown[]) => void;
  filenamePrefix: string;
  label: string;
  now?: () => number;
  revokeObjectUrl?: (url: string) => void;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
  svgToCanvasFn?: (svgElement: SVGElement) => Promise<HTMLCanvasElement>;
  writeClipboard?: (items: ClipboardItem[]) => Promise<void>;
}

export interface FetchBlobResponse {
  blob(): Promise<Blob>;
}

export interface ModalDiagramActionOptions {
  clipboardItemCtor?: typeof ClipboardItem;
  createAnchor?: () => HTMLAnchorElement;
  createObjectUrl?: (blob: Blob) => string;
  error?: (...args: unknown[]) => void;
  fetchFn?: (url: string) => Promise<FetchBlobResponse>;
  getPngUrl: (svgUrl: string) => string;
  now?: () => number;
  revokeObjectUrl?: (url: string) => void;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
  svgToCanvasFn?: (svgElement: SVGElement) => Promise<HTMLCanvasElement>;
  writeClipboard?: (items: ClipboardItem[]) => Promise<void>;
}

function getSvg(container: Element): SVGElement | null {
  return container.querySelector('svg');
}

function scheduleRestore(
  button: HTMLElement,
  originalHtml: string,
  delayMs: number,
  options: Pick<SvgDiagramActionOptions, 'setTimeoutFn'>
): void {
  const setTimeoutFn = options.setTimeoutFn ?? ((callback, delay) => setTimeout(callback, delay));
  setTimeoutFn(() => {
    button.innerHTML = originalHtml;
  }, delayMs);
}

function createAnchor(options: Pick<SvgDiagramActionOptions, 'createAnchor'>): HTMLAnchorElement {
  return options.createAnchor ? options.createAnchor() : document.createElement('a');
}

function createObjectUrl(blob: Blob, options: Pick<SvgDiagramActionOptions, 'createObjectUrl'>): string {
  return options.createObjectUrl ? options.createObjectUrl(blob) : URL.createObjectURL(blob);
}

function revokeObjectUrl(url: string, options: Pick<SvgDiagramActionOptions, 'revokeObjectUrl'>): void {
  if (options.revokeObjectUrl) {
    options.revokeObjectUrl(url);
    return;
  }

  URL.revokeObjectURL(url);
}

function getNow(options: Pick<SvgDiagramActionOptions, 'now'>): number {
  return options.now ? options.now() : Date.now();
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

export async function downloadSvgDiagramPng(
  container: Element,
  button: HTMLElement,
  options: SvgDiagramActionOptions
): Promise<void> {
  const svgEl = getSvg(container);
  if (!svgEl) return;

  const original = button.innerHTML;
  button.innerHTML = '<i class="bi bi-hourglass-split"></i>';

  try {
    const renderSvg = options.svgToCanvasFn ?? svgToCanvas;
    const canvas = await renderSvg(svgEl);
    const blob = await canvasToPngBlob(canvas);
    const url = createObjectUrl(blob, options);
    const anchor = createAnchor(options);
    anchor.href = url;
    anchor.download = `${options.filenamePrefix}-${getNow(options)}.png`;
    anchor.click();
    revokeObjectUrl(url, options);
    button.innerHTML = '<i class="bi bi-check-lg"></i>';
    scheduleRestore(button, original, 1500, options);
  } catch (error) {
    options.error?.(`${options.label} PNG export failed:`, error);
    button.innerHTML = original;
  }
}

export async function copySvgDiagramImage(
  container: Element,
  button: HTMLElement,
  options: SvgDiagramActionOptions
): Promise<void> {
  const svgEl = getSvg(container);
  if (!svgEl) return;

  const original = button.innerHTML;
  button.innerHTML = '<i class="bi bi-hourglass-split"></i>';

  try {
    const renderSvg = options.svgToCanvasFn ?? svgToCanvas;
    const canvas = await renderSvg(svgEl);
    const blob = await canvasToPngBlob(canvas);
    try {
      const ClipboardItemCtor = options.clipboardItemCtor ?? ClipboardItem;
      const writeClipboard = options.writeClipboard ?? ((items) => navigator.clipboard.write(items));
      await writeClipboard([
        new ClipboardItemCtor({ 'image/png': blob })
      ]);
      button.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
    } catch (clipErr) {
      options.error?.('Clipboard write failed:', clipErr);
      button.innerHTML = '<i class="bi bi-x-lg"></i>';
    }
    scheduleRestore(button, original, 1800, options);
  } catch (error) {
    options.error?.(`${options.label} copy failed:`, error);
    button.innerHTML = original;
  }
}

export function downloadSvgDiagramSource(
  container: Element,
  button: HTMLElement,
  options: SvgDiagramActionOptions
): void {
  const svgEl = getSvg(container);
  if (!svgEl) return;

  const clone = svgEl.cloneNode(true);
  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: 'image/svg+xml' });
  const url = createObjectUrl(blob, options);
  const anchor = createAnchor(options);
  anchor.href = url;
  anchor.download = `${options.filenamePrefix}-${getNow(options)}.svg`;
  anchor.click();
  revokeObjectUrl(url, options);

  const original = button.innerHTML;
  button.innerHTML = '<i class="bi bi-check-lg"></i>';
  scheduleRestore(button, original, 1500, options);
}

function isImageElement(element: Element): element is HTMLImageElement {
  return element.tagName.toLowerCase() === 'img';
}

async function getModalPngBlob(
  element: Element,
  options: ModalDiagramActionOptions
): Promise<Blob> {
  if (isImageElement(element)) {
    const fetchFn = options.fetchFn ?? fetch;
    const response = await fetchFn(options.getPngUrl(element.src));
    return response.blob();
  }

  const renderSvg = options.svgToCanvasFn ?? svgToCanvas;
  const canvas = await renderSvg(element as SVGElement);
  return canvasToPngBlob(canvas);
}

export async function downloadModalDiagramPng(
  element: Element,
  button: HTMLElement,
  options: ModalDiagramActionOptions
): Promise<void> {
  const original = button.innerHTML;
  button.innerHTML = '<i class="bi bi-hourglass-split"></i>';

  try {
    const blob = await getModalPngBlob(element, options);
    const url = createObjectUrl(blob, options);
    const anchor = createAnchor(options);
    anchor.href = url;
    anchor.download = `diagram-${getNow(options)}.png`;
    anchor.click();
    revokeObjectUrl(url, options);
    button.innerHTML = '<i class="bi bi-check-lg"></i>';
    scheduleRestore(button, original, 1500, options);
  } catch (error) {
    options.error?.('Modal PNG export failed:', error);
    button.innerHTML = original;
  }
}

export async function copyModalDiagramImage(
  element: Element,
  button: HTMLElement,
  options: ModalDiagramActionOptions
): Promise<void> {
  const original = button.innerHTML;
  button.innerHTML = '<i class="bi bi-hourglass-split"></i>';

  try {
    const blob = await getModalPngBlob(element, options);
    try {
      const ClipboardItemCtor = options.clipboardItemCtor ?? ClipboardItem;
      const writeClipboard = options.writeClipboard ?? ((items) => navigator.clipboard.write(items));
      await writeClipboard([
        new ClipboardItemCtor({ 'image/png': blob })
      ]);
      button.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
    } catch (clipErr) {
      options.error?.('Clipboard write failed:', clipErr);
      button.innerHTML = '<i class="bi bi-x-lg"></i>';
    }
    scheduleRestore(button, original, 1800, options);
  } catch (error) {
    options.error?.('Modal copy failed:', error);
    button.innerHTML = original;
  }
}

export async function downloadModalDiagramSvg(
  element: Element,
  options: Omit<ModalDiagramActionOptions, 'getPngUrl'>
): Promise<void> {
  try {
    let blob: Blob;
    if (isImageElement(element)) {
      const fetchFn = options.fetchFn ?? fetch;
      const response = await fetchFn(element.src);
      blob = await response.blob();
    } else {
      const serialized = new XMLSerializer().serializeToString(element);
      blob = new Blob([serialized], { type: 'image/svg+xml' });
    }

    const url = createObjectUrl(blob, options);
    const anchor = createAnchor(options);
    anchor.href = url;
    anchor.download = `diagram-${getNow(options)}.svg`;
    anchor.click();
    revokeObjectUrl(url, options);
  } catch (error) {
    options.error?.('Modal SVG download failed:', error);
  }
}
