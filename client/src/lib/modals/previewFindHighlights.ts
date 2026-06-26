import { escapeRegExp } from '../markdown/editing';

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;
const PREVIEW_HIGHLIGHT_SELECTOR = '.preview-find-highlight';
const SKIPPED_TAGS = new Set(['script', 'style', 'textarea', 'noscript', 'svg']);

export interface CreatePreviewFindRegexOptions {
  isCaseSensitive: boolean;
  isRegex: boolean;
  isWholeWord: boolean;
  query: string;
}

export interface UpdateActivePreviewHighlightOptions {
  activeFindIndex: number;
  findMatchCount: number;
  highlights: HTMLElement[];
  previewPane: HTMLElement | null;
}

export interface UpdatePreviewFindHighlightsOptions extends CreatePreviewFindRegexOptions {
  activeFindIndex: number;
  findMatchCount: number;
  isFindModalOpen: boolean;
  isPreviewVisible: boolean;
  markdownPreview: HTMLElement | null;
  previewPane: HTMLElement | null;
}

export interface PreviewFindHighlightState {
  activeIndex: number;
  highlights: HTMLElement[];
}

export function createPreviewFindRegex(options: CreatePreviewFindRegexOptions): RegExp | null {
  try {
    let pattern = options.isRegex ? options.query : escapeRegExp(options.query);
    if (options.isWholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    const flags = options.isCaseSensitive ? 'g' : 'gi';
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

export function clearPreviewFindHighlights(markdownPreview: HTMLElement | null): void {
  if (!markdownPreview) return;

  const documentRef = markdownPreview.ownerDocument;
  const highlights = markdownPreview.querySelectorAll(PREVIEW_HIGHLIGHT_SELECTOR);
  highlights.forEach((element) => {
    const parent = element.parentNode;
    if (parent) {
      parent.replaceChild(documentRef.createTextNode(element.textContent || ''), element);
    }
  });
  markdownPreview.normalize();
}

export function shouldSkipPreviewHighlightElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  return (
    SKIPPED_TAGS.has(tagName) ||
    element.classList.contains('mermaid') ||
    element.classList.contains('mjx-container') ||
    Boolean(element.closest('.mermaid')) ||
    Boolean(element.closest('.mjx-container'))
  );
}

export function highlightPreviewText(node: Node | null, regex: RegExp): void {
  if (!node) return;

  if (node.nodeType === TEXT_NODE) {
    const value = node.nodeValue;
    if (!value) return;

    regex.lastIndex = 0;
    const matches: Array<{
      end: number;
      start: number;
      text: string;
    }> = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(value)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex += 1;
        continue;
      }
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });
    }

    if (!matches.length) return;

    const parent = node.parentNode;
    if (!parent) return;

    const documentRef = node.ownerDocument;
    if (!documentRef) return;
    const fragment = documentRef.createDocumentFragment();
    let lastIndex = 0;

    for (const matchItem of matches) {
      if (matchItem.start > lastIndex) {
        fragment.appendChild(documentRef.createTextNode(value.slice(lastIndex, matchItem.start)));
      }

      const mark = documentRef.createElement('mark');
      mark.className = 'preview-find-highlight';
      mark.textContent = matchItem.text;
      fragment.appendChild(mark);
      lastIndex = matchItem.end;
    }

    if (lastIndex < value.length) {
      fragment.appendChild(documentRef.createTextNode(value.slice(lastIndex)));
    }

    parent.replaceChild(fragment, node);
    return;
  }

  if (node.nodeType !== ELEMENT_NODE) return;

  const element = node as Element;
  if (shouldSkipPreviewHighlightElement(element)) return;

  for (const child of Array.from(node.childNodes)) {
    highlightPreviewText(child, regex);
  }
}

export function scrollPreviewHighlightIntoView(
  element: HTMLElement | null,
  previewPane: HTMLElement | null
): boolean {
  if (!element || !previewPane) return false;

  const paneRect = previewPane.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const isVisible = (
    elementRect.top >= paneRect.top + 40 &&
    elementRect.bottom <= paneRect.bottom - 40
  );

  if (isVisible) return false;

  previewPane.scrollTop = previewPane.scrollTop +
    (elementRect.top - paneRect.top) -
    (paneRect.height / 2) +
    (elementRect.height / 2);
  return true;
}

export function updateActivePreviewHighlight(
  options: UpdateActivePreviewHighlightOptions
): number {
  for (const element of options.highlights) {
    element.classList.remove('active');
  }

  if (!options.highlights.length) {
    return -1;
  }

  const activeIndex = options.findMatchCount > 0 && options.activeFindIndex >= 0
    ? Math.min(
        options.highlights.length - 1,
        Math.floor((options.activeFindIndex / options.findMatchCount) * options.highlights.length)
      )
    : 0;

  const activeElement = options.highlights[activeIndex];
  activeElement.classList.add('active');
  scrollPreviewHighlightIntoView(activeElement, options.previewPane);
  return activeIndex;
}

export function updatePreviewFindHighlights(
  options: UpdatePreviewFindHighlightsOptions
): PreviewFindHighlightState {
  clearPreviewFindHighlights(options.markdownPreview);

  if (
    !options.markdownPreview ||
    !options.isFindModalOpen ||
    !options.query ||
    !options.isPreviewVisible
  ) {
    return {
      activeIndex: -1,
      highlights: []
    };
  }

  const regex = createPreviewFindRegex(options);
  if (!regex) {
    return {
      activeIndex: -1,
      highlights: []
    };
  }

  highlightPreviewText(options.markdownPreview, regex);
  const highlights = Array.from(
    options.markdownPreview.querySelectorAll<HTMLElement>(PREVIEW_HIGHLIGHT_SELECTOR)
  );
  const activeIndex = updateActivePreviewHighlight({
    activeFindIndex: options.activeFindIndex,
    findMatchCount: options.findMatchCount,
    highlights,
    previewPane: options.previewPane
  });

  return {
    activeIndex,
    highlights
  };
}
