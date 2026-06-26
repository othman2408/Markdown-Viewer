export interface SvgOriginalDimensions {
  height: number;
  text: string;
  width: number;
}

export interface FetchLikeResponse {
  ok: boolean;
  status: number;
  blob(): Promise<Blob>;
  text(): Promise<string>;
}

export interface DownloadSvgOptions {
  createAnchor?: () => HTMLAnchorElement;
  createObjectUrl?: (blob: Blob) => string;
  fetchFn?: (url: string) => Promise<FetchLikeResponse>;
  revokeObjectUrl?: (url: string) => void;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
}

export interface FetchSvgDimensionsOptions {
  fetchFn?: (url: string) => Promise<Pick<FetchLikeResponse, 'ok' | 'text'>>;
  warn?: (...args: unknown[]) => void;
}

export function getDiagramPngUrlFromSvgUrl(svgUrl: string): string {
  return svgUrl.replace('/svg/', '/png/');
}

export function parseSvgOriginalDimensions(
  text: string,
  parser: DOMParser = new DOMParser()
): SvgOriginalDimensions | null {
  const doc = parser.parseFromString(text, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;

  let width = parseFloat(svg.getAttribute('width') || '');
  let height = parseFloat(svg.getAttribute('height') || '');
  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/\s+/);
    if (parts.length === 4) {
      const viewBoxWidth = parseFloat(parts[2]);
      const viewBoxHeight = parseFloat(parts[3]);
      if (!Number.isNaN(viewBoxWidth) && !Number.isNaN(viewBoxHeight)) {
        width = viewBoxWidth;
        height = viewBoxHeight;
      }
    }
  }

  if (!Number.isNaN(width) && !Number.isNaN(height) && width > 0 && height > 0) {
    return { width, height, text };
  }

  return null;
}

function createAnchor(options: DownloadSvgOptions): HTMLAnchorElement {
  return options.createAnchor ? options.createAnchor() : document.createElement('a');
}

function createObjectUrl(blob: Blob, options: DownloadSvgOptions): string {
  return options.createObjectUrl ? options.createObjectUrl(blob) : URL.createObjectURL(blob);
}

function revokeObjectUrl(url: string, options: DownloadSvgOptions): void {
  if (options.revokeObjectUrl) {
    options.revokeObjectUrl(url);
    return;
  }
  URL.revokeObjectURL(url);
}

function restoreButton(button: HTMLElement, originalHtml: string, options: DownloadSvgOptions): void {
  const setTimeoutFn = options.setTimeoutFn ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  setTimeoutFn(() => {
    button.innerHTML = originalHtml;
  }, 1500);
}

export async function fetchSvgOriginalDimensions(
  url: string,
  options: FetchSvgDimensionsOptions = {}
): Promise<SvgOriginalDimensions | null> {
  try {
    const fetchFn = options.fetchFn ?? fetch;
    const res = await fetchFn(url);
    if (!res.ok) return null;
    const text = await res.text();
    return parseSvgOriginalDimensions(text);
  } catch (e) {
    options.warn?.('Failed to parse SVG dimensions:', e);
  }

  return null;
}

export async function downloadSvgWithFallback(
  imgEl: HTMLImageElement,
  filename: string,
  button: HTMLElement,
  originalHtml: string,
  options: DownloadSvgOptions = {}
): Promise<void> {
  try {
    const fetchFn = options.fetchFn ?? fetch;
    const res = await fetchFn(imgEl.src);
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
    const blob = await res.blob();
    const url = createObjectUrl(blob, options);
    const anchor = createAnchor(options);
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    revokeObjectUrl(url, options);
    button.innerHTML = '<i class="bi bi-check-lg"></i>';
    restoreButton(button, originalHtml, options);
  } catch (e) {
    options.warn?.('SVG fetch download failed, attempting fallback direct link download:', e);
    try {
      const anchor = createAnchor(options);
      anchor.href = imgEl.src;
      anchor.download = filename;
      anchor.target = '_blank';
      anchor.click();
      button.innerHTML = '<i class="bi bi-check-lg"></i>';
    } catch (err) {
      options.error?.('SVG download completely failed:', err);
      button.innerHTML = '<i class="bi bi-x-lg"></i>';
    }
    restoreButton(button, originalHtml, options);
  }
}
