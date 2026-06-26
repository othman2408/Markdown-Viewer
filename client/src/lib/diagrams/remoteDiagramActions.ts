export interface RemoteDiagramPngOptions {
  getPngUrl: (svgUrl: string) => string;
  getPngBlob: (imgEl: HTMLImageElement, pngUrl: string) => Promise<Blob>;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  createAnchor?: () => HTMLAnchorElement;
  now?: () => number;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
  error?: (...args: unknown[]) => void;
}

export interface RemoteDiagramCopyOptions extends RemoteDiagramPngOptions {
  writeClipboard?: (items: ClipboardItem[]) => Promise<void>;
  clipboardItemCtor?: typeof ClipboardItem;
}

export interface RemoteDiagramSvgOptions {
  downloadSvg: (
    imgEl: HTMLImageElement,
    filename: string,
    button: HTMLElement,
    originalHtml: string
  ) => Promise<void>;
  now?: () => number;
}

export interface RemoteDiagramZoomOptions {
  modalDiagram: HTMLElement;
  zoomModal: HTMLElement;
  resetTransform: () => void;
  setCurrentElement: (element: HTMLElement) => void;
}

function getImage(container: Element): HTMLImageElement | null {
  return container.querySelector('img');
}

function getNow(options: { now?: () => number }): number {
  return options.now ? options.now() : Date.now();
}

function createAnchor(options: RemoteDiagramPngOptions): HTMLAnchorElement {
  return options.createAnchor ? options.createAnchor() : document.createElement('a');
}

function createObjectUrl(blob: Blob, options: RemoteDiagramPngOptions): string {
  return options.createObjectUrl ? options.createObjectUrl(blob) : URL.createObjectURL(blob);
}

function revokeObjectUrl(url: string, options: RemoteDiagramPngOptions): void {
  if (options.revokeObjectUrl) {
    options.revokeObjectUrl(url);
    return;
  }
  URL.revokeObjectURL(url);
}

function scheduleRestore(button: HTMLElement, originalHtml: string, delayMs: number, options: RemoteDiagramPngOptions): void {
  const setTimeoutFn = options.setTimeoutFn ?? ((callback, delay) => setTimeout(callback, delay));
  setTimeoutFn(() => {
    button.innerHTML = originalHtml;
  }, delayMs);
}

export async function downloadRemoteDiagramPng(
  container: Element,
  button: HTMLElement,
  label: string,
  options: RemoteDiagramPngOptions
): Promise<void> {
  const imgEl = getImage(container);
  if (!imgEl) return;

  const original = button.innerHTML;
  button.innerHTML = '<i class="bi bi-hourglass-split"></i>';

  try {
    const pngUrl = options.getPngUrl(imgEl.src);
    const blob = await options.getPngBlob(imgEl, pngUrl);
    const url = createObjectUrl(blob, options);
    const anchor = createAnchor(options);
    anchor.href = url;
    anchor.download = `diagram-${getNow(options)}.png`;
    anchor.click();
    revokeObjectUrl(url, options);
    button.innerHTML = '<i class="bi bi-check-lg"></i>';
    scheduleRestore(button, original, 1500, options);
  } catch (e) {
    options.error?.(`${label} PNG export failed:`, e);
    button.innerHTML = original;
  }
}

export async function copyRemoteDiagramImage(
  container: Element,
  button: HTMLElement,
  label: string,
  options: RemoteDiagramCopyOptions
): Promise<void> {
  const imgEl = getImage(container);
  if (!imgEl) return;

  const original = button.innerHTML;
  button.innerHTML = '<i class="bi bi-hourglass-split"></i>';

  try {
    const pngUrl = options.getPngUrl(imgEl.src);
    const blob = await options.getPngBlob(imgEl, pngUrl);
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
  } catch (e) {
    options.error?.(`${label} copy failed:`, e);
    button.innerHTML = original;
  }
}

export async function downloadRemoteDiagramSvg(
  container: Element,
  button: HTMLElement,
  options: RemoteDiagramSvgOptions
): Promise<void> {
  const imgEl = getImage(container);
  if (!imgEl) return;

  const original = button.innerHTML;
  button.innerHTML = '<i class="bi bi-hourglass-split"></i>';
  await options.downloadSvg(imgEl, `diagram-${getNow(options)}.svg`, button, original);
}

export function openRemoteImageZoomModal(container: Element, options: RemoteDiagramZoomOptions): void {
  const imgEl = getImage(container);
  if (!imgEl) return;

  options.modalDiagram.textContent = '';
  options.resetTransform();
  const imgClone = imgEl.cloneNode(true) as HTMLImageElement;
  imgClone.removeAttribute('width');
  imgClone.removeAttribute('height');
  imgClone.style.width = 'auto';
  imgClone.style.height = 'auto';
  imgClone.style.maxWidth = '80vw';
  imgClone.style.maxHeight = '60vh';
  imgClone.style.transformOrigin = 'center';
  imgClone.draggable = false;
  imgClone.addEventListener('dragstart', (event) => event.preventDefault());
  options.modalDiagram.appendChild(imgClone);
  options.setCurrentElement(imgClone);
  options.zoomModal.classList.add('active');
}
