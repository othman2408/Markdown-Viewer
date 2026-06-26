export interface PreviewLinkClickControllerOptions {
  clearTimeoutFn?: (timerId: unknown) => void;
  editor: HTMLElement | null;
  locationHref: string;
  markdownPreview: HTMLElement | null;
  openExternal: (href: string, target: string, features: string) => void;
  previewPane: HTMLElement | null;
  setProgrammaticScrolling: (isProgrammaticScrolling: boolean) => void;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
  warn?: (...args: unknown[]) => void;
}

export interface PreviewLinkClickController {
  detach(): void;
}

const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'blob:']);
const PROGRAMMATIC_SCROLL_RESET_MS = 1000;

function getEventElement(event: Event): Element | null {
  return event.target instanceof Element ? event.target : null;
}

export function isSafePreviewHref(href: string, locationHref: string): boolean {
  try {
    const parsed = new URL(href, locationHref);
    return SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return !href.trim().toLowerCase().startsWith('javascript:');
  }
}

function getCssEscapedId(id: string): string {
  const cssEscape = globalThis.CSS?.escape;
  if (!cssEscape) {
    throw new Error('CSS.escape unavailable');
  }

  return cssEscape(id);
}

export function findPreviewAnchorTarget(markdownPreview: HTMLElement, targetId: string): HTMLElement | null {
  if (!targetId) return null;

  let targetElement: HTMLElement | null = null;
  try {
    const escaped = getCssEscapedId(targetId);
    targetElement = markdownPreview.querySelector<HTMLElement>(`[id="${escaped}"]`) ||
      markdownPreview.querySelector<HTMLElement>(`[name="${escaped}"]`);
  } catch {
    targetElement = Array.from(markdownPreview.querySelectorAll<HTMLElement>('[id], [name]'))
      .find((element) => element.getAttribute('id') === targetId || element.getAttribute('name') === targetId) ?? null;
  }

  if (targetElement) return targetElement;

  const cleanTargetId = targetId.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanTargetId) return null;

  return Array.from(markdownPreview.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'))
    .find((heading) => (heading.textContent || '').toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTargetId) ?? null;
}

export function scrollPreviewAnchorTarget(input: {
  editor: HTMLElement;
  previewPane: HTMLElement;
  targetElement: HTMLElement;
}): number {
  input.targetElement.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });

  const previewScrollRange = input.previewPane.scrollHeight - input.previewPane.clientHeight;
  const targetRatio = previewScrollRange > 0
    ? Math.min(1, Math.max(0, input.targetElement.offsetTop / previewScrollRange))
    : 0;
  const editorScrollPosition = targetRatio * (input.editor.scrollHeight - input.editor.clientHeight);
  input.editor.scrollTo({
    behavior: 'smooth',
    top: editorScrollPosition
  });
  return editorScrollPosition;
}

export function attachPreviewLinkClickController(
  options: PreviewLinkClickControllerOptions
): PreviewLinkClickController {
  const setTimeoutFn = options.setTimeoutFn ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const clearTimeoutFn = options.clearTimeoutFn ?? ((timerId) => clearTimeout(timerId as ReturnType<typeof setTimeout>));
  let programmaticScrollTimer: unknown = null;

  function resetProgrammaticScrollTimer(): void {
    if (programmaticScrollTimer) {
      clearTimeoutFn(programmaticScrollTimer);
    }

    programmaticScrollTimer = setTimeoutFn(() => {
      programmaticScrollTimer = null;
      options.setProgrammaticScrolling(false);
    }, PROGRAMMATIC_SCROLL_RESET_MS);
  }

  function handleClick(event: MouseEvent): void {
    if (!options.markdownPreview) return;

    const target = getEventElement(event);
    const link = target?.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    if (href.startsWith('#')) {
      const targetId = decodeURIComponent(href.slice(1));
      const targetElement = findPreviewAnchorTarget(options.markdownPreview, targetId);
      if (targetElement && options.previewPane && options.editor) {
        event.preventDefault();
        options.setProgrammaticScrolling(true);
        scrollPreviewAnchorTarget({
          editor: options.editor,
          previewPane: options.previewPane,
          targetElement
        });
        resetProgrammaticScrollTimer();
      }
      return;
    }

    event.preventDefault();
    if (isSafePreviewHref(href, options.locationHref)) {
      options.openExternal(href, '_blank', 'noopener,noreferrer');
    } else {
      options.warn?.('Blocked opening potentially unsafe URL:', href);
    }
  }

  options.markdownPreview?.addEventListener('click', handleClick);

  return {
    detach(): void {
      options.markdownPreview?.removeEventListener('click', handleClick);
      if (programmaticScrollTimer) {
        clearTimeoutFn(programmaticScrollTimer);
        programmaticScrollTimer = null;
      }
    }
  };
}
