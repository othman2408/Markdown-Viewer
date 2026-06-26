export type PreviewWorkerContext = {
  disableWorker?: boolean;
};

export type PreviewWorkerDecisionOptions = {
  enabled: boolean;
  workerUnavailable: boolean;
  hasWorkerRuntime: boolean;
  threshold: number;
};

export type PreviewWorkerLibraryUrls = {
  marked: string;
  highlight: string;
  powershell: string;
};

export type PreviewSegmentBlock = {
  hash?: unknown;
  sourceLength?: number;
  htmlLength?: number;
  html?: string;
  id?: string;
};

type PreviewSegmentRendererOptions = {
  sanitizeHtml(html: string): string;
  escapeAttribute(value: string): string;
  reuseLimit: number;
};

function runtimeDocument(): Document | undefined {
  return typeof document === 'undefined' ? undefined : document;
}

function runtimeLocation(): Pick<Location, 'href' | 'origin'> | undefined {
  return typeof window === 'undefined' ? undefined : window.location;
}

export function getLoadedScriptUrl(
  needle: string,
  fallbackUrl: string,
  documentRef: Pick<Document, 'getElementsByTagName'> | undefined = runtimeDocument(),
  locationHref: string = runtimeLocation()?.href || fallbackUrl
): string {
  if (!documentRef) return fallbackUrl;
  const scripts = documentRef.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i += 1) {
    const src = scripts[i].getAttribute('src') || '';
    if (src.includes(needle)) {
      try {
        return new URL(src, locationHref).toString();
      } catch (e) {
        return src;
      }
    }
  }
  return fallbackUrl;
}

export function getPreviewWorkerUrl(origin: string | undefined = runtimeLocation()?.origin): string {
  try {
    return new URL('/preview-worker.js', origin).toString();
  } catch (e) {
    return '/preview-worker.js';
  }
}

export function getPreviewWorkerLibraryUrls(
  documentRef?: Pick<Document, 'getElementsByTagName'>,
  locationHref?: string
): PreviewWorkerLibraryUrls {
  return {
    marked: getLoadedScriptUrl('marked', 'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js', documentRef, locationHref),
    highlight: getLoadedScriptUrl('highlight', 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js', documentRef, locationHref),
    powershell: getLoadedScriptUrl('powershell.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/powershell.min.js', documentRef, locationHref)
  };
}

export function isSegmentedPreviewSafe(markdown: string, threshold: number): boolean {
  if (!markdown || markdown.length < threshold) return false;
  if (/^\s*---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(markdown)) return false;
  if (/^\[[^\]\n]+\]:\s+\S+/m.test(markdown)) return false;
  if (/\[\^[^\]\n]+\]/.test(markdown)) return false;
  if (/\n:[ \t]+/.test(markdown)) return false;
  if (/^\s{0,3}<\/?[a-zA-Z][\w:-]*(?:\s|>|\/>)/m.test(markdown)) return false;
  return true;
}

export function shouldUsePreviewWorker(
  rawVal: string,
  context: PreviewWorkerContext,
  options: PreviewWorkerDecisionOptions
): boolean {
  if (!options.enabled || options.workerUnavailable || context.disableWorker) return false;
  if (!options.hasWorkerRuntime) return false;
  return isSegmentedPreviewSafe(rawVal, options.threshold);
}

export function createPreviewSegmentRenderer(options: PreviewSegmentRendererOptions) {
  const htmlCache = new Map<string, string>();
  let cacheTabId: string | null = null;

  function clear(): void {
    htmlCache.clear();
    cacheTabId = null;
  }

  function resetForDocument(previewDocumentId: string): void {
    if (cacheTabId !== previewDocumentId) {
      htmlCache.clear();
      cacheTabId = previewDocumentId;
    }
  }

  function trim(): void {
    while (htmlCache.size > options.reuseLimit) {
      const firstKey = htmlCache.keys().next().value;
      if (firstKey === undefined) return;
      htmlCache.delete(firstKey);
    }
  }

  function buildHtml(blocks: PreviewSegmentBlock[], previewDocumentId: string): string {
    resetForDocument(previewDocumentId);
    const htmlParts: string[] = [];

    blocks.forEach((block, index) => {
      const hash = String(block.hash || '');
      const cacheKey = `${hash}:${block.sourceLength || 0}:${block.htmlLength || (block.html ? block.html.length : 0)}`;
      let sanitizedBlock = htmlCache.get(cacheKey);
      if (sanitizedBlock === undefined) {
        sanitizedBlock = options.sanitizeHtml(block.html || '');
        htmlCache.set(cacheKey, sanitizedBlock);
      }
      const blockId = block.id || `preview-block-${index}`;
      htmlParts.push(
        `<section class="preview-render-block" style="content-visibility: auto; contain-intrinsic-size: auto 220px;" data-preview-block-id="${options.escapeAttribute(blockId)}" data-preview-block-hash="${options.escapeAttribute(cacheKey)}">${sanitizedBlock}</section>`
      );
    });

    trim();
    return htmlParts.join('');
  }

  return {
    buildHtml,
    clear,
    getCacheSize: () => htmlCache.size
  };
}
