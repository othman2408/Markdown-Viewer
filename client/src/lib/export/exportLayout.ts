import {
  PdfExportCancelledError,
  throwIfPdfExportAborted
} from './pdfProgress';

export interface PdfPageConfig {
  a4Height: number;
  a4Width: number;
  contentHeight: number;
  contentWidth: number;
  margin: number;
  scale: number;
  windowWidth: number;
}

export type GraphicElementType =
  | 'blockquote'
  | 'hr'
  | 'img'
  | 'li'
  | 'math'
  | 'pre'
  | 'svg'
  | 'table'
  | 'text';

export interface GraphicElementItem {
  element: HTMLElement;
  type: GraphicElementType;
}

export interface PositionedGraphicElement extends GraphicElementItem {
  bottom: number;
  height: number;
  top: number;
}

export interface SplitGraphicElement extends PositionedGraphicElement {
  overflowAmount: number;
  splitPageIndex: number;
}

export interface PageBoundaryResult {
  boundaries: number[];
  pageHeightPx: number;
}

export interface PageBreakAnalysis {
  pageBoundaries: number[];
  pageCount: number;
  pageHeightPx: number;
  splitElements: SplitGraphicElement[];
  totalElements: number;
}

export interface PageBreakCascadeOptions {
  debug?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
}

export const PDF_PAGE_CONFIG: PdfPageConfig = {
  a4Width: 210,
  a4Height: 297,
  margin: 15,
  contentWidth: 180,
  contentHeight: 267,
  windowWidth: 1000,
  scale: 2
};

export const MIN_GRAPHIC_SCALE_FACTOR = 0.5;

export function markdownLikelyContainsMath(markdown: string): boolean {
  return /(^|[^\\])\$\$|\\\[|\\\(|(^|[^\\])\$[^$\n]+\$/.test(markdown) || /```math\b/.test(markdown);
}

export function choosePdfCanvasScale(
  element: Pick<HTMLElement, 'offsetWidth' | 'scrollHeight'>,
  pageConfig: Pick<PdfPageConfig, 'scale'> = PDF_PAGE_CONFIG
): number {
  const pixelArea = element.offsetWidth * element.scrollHeight;
  if (pixelArea > 14_000_000) return 1.25;
  if (pixelArea > 8_000_000) return 1.5;
  return pageConfig.scale;
}

function readPixelStyle(element: Element, propertyName: string): number {
  const value = window.getComputedStyle(element).getPropertyValue(propertyName);
  return parseFloat(value) || 0;
}

export function fitExportElementToContent(element: HTMLElement | null | undefined): boolean {
  if (!element) return false;

  const overflow = element.scrollWidth - element.clientWidth;
  if (overflow <= 1) return false;

  const paddingLeft = readPixelStyle(element, 'padding-left');
  const paddingRight = readPixelStyle(element, 'padding-right');
  const borderLeft = readPixelStyle(element, 'border-left-width');
  const borderRight = readPixelStyle(element, 'border-right-width');
  const boxSizing = window.getComputedStyle(element).boxSizing;
  const requiredWidth = boxSizing === 'border-box'
    ? Math.ceil(element.scrollWidth + borderLeft + borderRight)
    : Math.ceil(element.scrollWidth - paddingLeft - paddingRight);
  element.style.width = `${requiredWidth}px`;
  return true;
}

function hasBlockChildren(element: Element): boolean {
  return element.querySelector('p, blockquote, pre, table, ul, ol') !== null;
}

export function identifyGraphicElements(container: Element): GraphicElementItem[] {
  const graphics: GraphicElementItem[] = [];

  container.querySelectorAll('img, svg, pre, table, p, li, h1, h2, h3, h4, h5, h6, blockquote, hr, .math-block, mjx-container[display="true"]').forEach((element) => {
    const tag = element.tagName.toLowerCase();

    if (element.parentElement?.closest('blockquote')) {
      return;
    }

    const liAncestor = element.parentElement?.closest('li');
    if (liAncestor && hasBlockChildren(liAncestor)) {
      return;
    }

    let type: GraphicElementType | '' = '';
    if (tag === 'img') type = 'img';
    else if (tag === 'svg') {
      if (!element.closest('mjx-container, .math-block')) {
        type = 'svg';
      }
    } else if (tag === 'pre') type = 'pre';
    else if (tag === 'table') type = 'table';
    else if (tag === 'hr') type = 'hr';
    else if (tag === 'blockquote') type = 'blockquote';
    else if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) type = 'text';
    else if (tag === 'li') type = hasBlockChildren(element) ? 'li' : 'text';
    else if (element.classList.contains('math-block') || tag === 'mjx-container') type = 'math';

    if (type) {
      graphics.push({ element: element as HTMLElement, type });
    }
  });

  return graphics;
}

export function getElementLineHeight(element: HTMLElement): number {
  const style = window.getComputedStyle(element);
  const fontSize = parseFloat(style.fontSize) || 14;
  let lineHeight = parseFloat(style.lineHeight);

  if (Number.isNaN(lineHeight)) {
    const tag = element.tagName.toLowerCase();
    lineHeight = tag.startsWith('h') ? fontSize * 1.25 : fontSize * 1.5;
  } else if (lineHeight < 10) {
    lineHeight *= fontSize;
  }

  return lineHeight;
}

export function calculateTextElementShift(item: SplitGraphicElement, pageBoundaries: number[]): number {
  const boundaryY = pageBoundaries[item.splitPageIndex];
  if (boundaryY === undefined) return 0;

  const element = item.element;
  const style = window.getComputedStyle(element);
  const tag = element.tagName.toLowerCase();
  const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag);
  const safetyBuffer = 4;

  if (isHeading) {
    return (boundaryY - item.top) + safetyBuffer;
  }

  const paddingTop = parseFloat(style.paddingTop) || 0;
  const borderTop = parseFloat(style.borderTopWidth) || 0;
  const paddingBottom = parseFloat(style.paddingBottom) || 0;
  const borderBottom = parseFloat(style.borderBottomWidth) || 0;
  const lineHeight = getElementLineHeight(element);
  const contentTop = item.top + paddingTop + borderTop;
  const contentHeight = item.height - paddingTop - paddingBottom - borderTop - borderBottom;
  if (contentHeight <= 0) return 0;

  const numLines = Math.max(1, Math.round(contentHeight / lineHeight));
  for (let i = 0; i < numLines; i += 1) {
    const lineTop = contentTop + i * lineHeight;
    const lineBottom = contentTop + (i + 1) * lineHeight;
    if (lineTop < boundaryY - 0.5 && lineBottom > boundaryY + 0.5) {
      return (boundaryY - lineTop) + safetyBuffer;
    }
  }

  if (item.height <= lineHeight * 3) {
    return (boundaryY - item.top) + safetyBuffer;
  }

  return 0;
}

export function calculateElementPositions(
  elements: GraphicElementItem[],
  container: Element
): PositionedGraphicElement[] {
  const containerRect = container.getBoundingClientRect();

  return elements.map((item) => {
    const rect = item.element.getBoundingClientRect();
    const top = rect.top - containerRect.top;
    const height = rect.height;
    const bottom = top + height;
    return {
      element: item.element,
      type: item.type,
      top,
      height,
      bottom
    };
  });
}

export function calculatePageBoundaries(
  totalHeight: number,
  elementWidth: number,
  pageConfig: Pick<PdfPageConfig, 'contentHeight' | 'contentWidth'>
): PageBoundaryResult {
  const aspectRatio = pageConfig.contentHeight / pageConfig.contentWidth;
  const pageHeightPx = elementWidth * aspectRatio;
  const boundaries: number[] = [];
  let y = pageHeightPx;

  while (y < totalHeight) {
    boundaries.push(y);
    y += pageHeightPx;
  }

  return { boundaries, pageHeightPx };
}

export function detectSplitElements(
  elements: PositionedGraphicElement[],
  pageBoundaries: number[]
): SplitGraphicElement[] {
  if (!elements.length || !pageBoundaries.length) return [];

  const splitElements: SplitGraphicElement[] = [];
  for (const item of elements) {
    let startPage = 0;
    for (let i = 0; i < pageBoundaries.length; i += 1) {
      if (item.top >= pageBoundaries[i]) startPage = i + 1;
      else break;
    }

    let endPage = 0;
    for (let i = 0; i < pageBoundaries.length; i += 1) {
      if (item.bottom > pageBoundaries[i]) endPage = i + 1;
      else break;
    }

    if (endPage > startPage) {
      const boundaryY = pageBoundaries[startPage] || pageBoundaries[0];
      splitElements.push({
        element: item.element,
        type: item.type,
        top: item.top,
        height: item.height,
        bottom: item.bottom,
        splitPageIndex: startPage,
        overflowAmount: item.bottom - boundaryY
      });
    }
  }

  return splitElements;
}

export function analyzeGraphicsForPageBreaks(
  tempElement: HTMLElement,
  signal: AbortSignal | undefined,
  pageConfig: Pick<PdfPageConfig, 'contentHeight' | 'contentWidth'> = PDF_PAGE_CONFIG,
  options: { error?: (...args: unknown[]) => void } = {}
): PageBreakAnalysis {
  try {
    throwIfPdfExportAborted(signal);
    const graphics = identifyGraphicElements(tempElement);
    const elementsWithPositions = calculateElementPositions(graphics, tempElement);
    throwIfPdfExportAborted(signal);
    const totalHeight = Math.ceil(tempElement.getBoundingClientRect().height);
    const elementWidth = tempElement.offsetWidth;
    const { boundaries: pageBoundaries, pageHeightPx } = calculatePageBoundaries(
      totalHeight,
      elementWidth,
      pageConfig
    );
    const splitElements = detectSplitElements(elementsWithPositions, pageBoundaries);

    return {
      totalElements: graphics.length,
      splitElements,
      pageCount: pageBoundaries.length + 1,
      pageBoundaries,
      pageHeightPx
    };
  } catch (error) {
    if (error instanceof PdfExportCancelledError) throw error;
    options.error?.('Page-break analysis failed:', error);
  }

  return {
    totalElements: 0,
    splitElements: [],
    pageCount: 1,
    pageBoundaries: [],
    pageHeightPx: 0
  };
}

export function resetGraphicsStyles(container: Element): void {
  container.querySelectorAll('.pdf-page-break-spacer').forEach((element) => element.remove());
  container.querySelectorAll<HTMLElement>('[data-pdf-original-margin-top]').forEach((element) => {
    element.style.marginTop = element.dataset.pdfOriginalMarginTop ?? '';
    element.removeAttribute('data-pdf-original-margin-top');
  });
  container.querySelectorAll<HTMLElement>('[data-pdf-original-margin-bottom]').forEach((element) => {
    element.style.marginBottom = element.dataset.pdfOriginalMarginBottom ?? '';
    element.removeAttribute('data-pdf-original-margin-bottom');
  });
  container.querySelectorAll<HTMLElement>('[data-pdf-original-transform]').forEach((element) => {
    element.style.transform = element.dataset.pdfOriginalTransform ?? '';
    element.style.transformOrigin = '';
    element.removeAttribute('data-pdf-original-transform');
  });
  container.querySelectorAll<HTMLElement>('[data-pdf-original-width]').forEach((element) => {
    element.style.width = element.dataset.pdfOriginalWidth ?? '';
    element.removeAttribute('data-pdf-original-width');
  });
  container.querySelectorAll<HTMLElement>('[data-pdf-original-height]').forEach((element) => {
    element.style.height = element.dataset.pdfOriginalHeight ?? '';
    element.removeAttribute('data-pdf-original-height');
  });
  container.querySelectorAll<HTMLElement>('[data-pdf-original-max-width]').forEach((element) => {
    element.style.maxWidth = element.dataset.pdfOriginalMaxWidth ?? '';
    element.removeAttribute('data-pdf-original-max-width');
  });
  container.querySelectorAll<HTMLElement>('[data-pdf-original-font-size]').forEach((element) => {
    element.style.fontSize = element.dataset.pdfOriginalFontSize ?? '';
    element.removeAttribute('data-pdf-original-font-size');
  });
  container.querySelectorAll<HTMLElement>('[data-pdf-original-overflow]').forEach((element) => {
    element.style.overflow = element.dataset.pdfOriginalOverflow ?? '';
    element.removeAttribute('data-pdf-original-overflow');
  });
}

export function calculateScaleFactor(
  elementHeight: number,
  availableHeight: number,
  buffer = 5,
  minScaleFactor = MIN_GRAPHIC_SCALE_FACTOR,
  warn: (...args: unknown[]) => void = console.warn
): { scaleFactor: number; wasClampedToMin: boolean } {
  const targetHeight = availableHeight - buffer;
  let scaleFactor = targetHeight / elementHeight;
  let wasClampedToMin = false;

  if (scaleFactor < minScaleFactor) {
    warn(
      `Warning: Large graphic requires ${(scaleFactor * 100).toFixed(0)}% scaling. ` +
      `Clamping to minimum ${minScaleFactor * 100}%. Content may be cut off.`
    );
    scaleFactor = minScaleFactor;
    wasClampedToMin = true;
  }

  return { scaleFactor, wasClampedToMin };
}

function preserveStyleDataset(element: HTMLElement, dataKey: string, value: string): void {
  if (!Object.prototype.hasOwnProperty.call(element.dataset, dataKey)) {
    element.dataset[dataKey] = value;
  }
}

export function applyGraphicScaling(
  element: HTMLElement,
  scaleFactor: number,
  elementType: GraphicElementType
): void {
  preserveStyleDataset(element, 'pdfOriginalTransform', element.style.transform || '');
  preserveStyleDataset(element, 'pdfOriginalMarginBottom', element.style.marginBottom || '');

  if (elementType === 'svg' || elementType === 'img') {
    preserveStyleDataset(element, 'pdfOriginalWidth', element.style.width || '');
    preserveStyleDataset(element, 'pdfOriginalHeight', element.style.height || '');
    preserveStyleDataset(element, 'pdfOriginalMaxWidth', element.style.maxWidth || '');

    let originalWidth = parseFloat(element.dataset.pdfOriginalClientWidth ?? '');
    let originalHeight = parseFloat(element.dataset.pdfOriginalClientHeight ?? '');
    if (Number.isNaN(originalWidth) || Number.isNaN(originalHeight)) {
      originalWidth = element.clientWidth || element.getBoundingClientRect().width;
      originalHeight = element.clientHeight || element.getBoundingClientRect().height;
      element.dataset.pdfOriginalClientWidth = String(originalWidth);
      element.dataset.pdfOriginalClientHeight = String(originalHeight);
    }

    element.style.width = `${originalWidth * scaleFactor}px`;
    element.style.height = `${originalHeight * scaleFactor}px`;
    if (elementType === 'svg') {
      element.style.maxWidth = 'none';
    }
    return;
  }

  preserveStyleDataset(element, 'pdfOriginalHeight', element.style.height || '');
  preserveStyleDataset(element, 'pdfOriginalOverflow', element.style.overflow || '');
  element.style.transform = `scale(${scaleFactor})`;
  element.style.transformOrigin = 'top left';

  let originalHeight = parseFloat(element.dataset.pdfOriginalClientHeight ?? '');
  if (Number.isNaN(originalHeight)) {
    originalHeight = element.offsetHeight || element.getBoundingClientRect().height;
    element.dataset.pdfOriginalClientHeight = String(originalHeight);
  }

  element.style.height = `${originalHeight * scaleFactor}px`;
  element.style.overflow = 'hidden';
}

export function waitForAllImages(container: Element): Promise<unknown[]> {
  const images = Array.from(container.querySelectorAll('img'));
  const promises = images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  });

  return Promise.all(promises);
}

export function mergeSplitTables(container: Element): void {
  const groupIds = new Set<string>();
  container.querySelectorAll<HTMLTableElement>('table[data-split-group-id]').forEach((table) => {
    if (table.dataset.splitGroupId) {
      groupIds.add(table.dataset.splitGroupId);
    }
  });

  for (const groupId of groupIds) {
    const originalTable = container.querySelector<HTMLTableElement>(`table[data-split-group-id="${groupId}"]:not([data-split-part="true"])`);
    if (!originalTable) continue;

    const parts = Array.from(container.querySelectorAll<HTMLTableElement>(`table[data-split-group-id="${groupId}"][data-split-part="true"]`));
    const tbody = originalTable.tBodies[0] || originalTable.querySelector('tbody') || originalTable;
    for (const part of parts) {
      const partTbody = part.tBodies[0] || part.querySelector('tbody') || part;
      const rows = Array.from(partTbody.children).filter((child) => child.tagName.toLowerCase() === 'tr');
      for (const row of rows) {
        tbody.appendChild(row);
      }
      part.remove();
    }

    const spacers = Array.from(container.querySelectorAll<HTMLElement>(`div[data-split-group-id="${groupId}"][data-split-spacer="true"]`));
    for (const spacer of spacers) {
      spacer.remove();
    }
    originalTable.removeAttribute('data-split-group-id');
  }
}

export function splitTables(container: Element, pageHeightPx: number): void {
  mergeSplitTables(container);
  const tables = Array.from(container.querySelectorAll<HTMLTableElement>('table'));
  let groupCounter = 0;

  for (const table of tables) {
    if (table.dataset.splitPart === 'true') continue;
    const tableRect = table.getBoundingClientRect();
    if (tableRect.height <= pageHeightPx) continue;

    const tbody = table.tBodies[0] || table.querySelector('tbody');
    if (!tbody) continue;

    const rows = Array.from(tbody.children).filter((child) => child.tagName.toLowerCase() === 'tr') as HTMLTableRowElement[];
    if (!rows.length) continue;

    const groupId = `table-group-${groupCounter++}`;
    table.dataset.splitGroupId = groupId;
    const containerRect = container.getBoundingClientRect();
    const rowPositions = rows.map((row) => {
      const rect = row.getBoundingClientRect();
      return {
        row,
        top: rect.top - containerRect.top,
        bottom: rect.bottom - containerRect.top,
        height: rect.height
      };
    });

    let currentTable: HTMLTableElement = table;
    let currentTbody: HTMLTableSectionElement = tbody;
    let accumulatedShift = 0;

    for (const pos of rowPositions) {
      const shiftedTop = pos.top + accumulatedShift;
      const shiftedBottom = pos.bottom + accumulatedShift;
      const currentPageIndex = Math.floor(shiftedTop / pageHeightPx);
      const nextPageBoundary = (currentPageIndex + 1) * pageHeightPx;

      if (shiftedBottom > nextPageBoundary) {
        const spacerHeight = nextPageBoundary - shiftedTop;
        const originalThead = table.querySelector('thead');
        const theadHeight = originalThead ? originalThead.getBoundingClientRect().height : 0;
        accumulatedShift += spacerHeight + theadHeight;

        const nextTable = table.cloneNode(false) as HTMLTableElement;
        nextTable.removeAttribute('id');
        nextTable.dataset.splitGroupId = groupId;
        nextTable.dataset.splitPart = 'true';
        if (originalThead) nextTable.appendChild(originalThead.cloneNode(true));

        const nextTbody = document.createElement('tbody');
        nextTable.appendChild(nextTbody);
        const spacer = document.createElement('div');
        spacer.className = 'table-page-break-spacer';
        spacer.dataset.splitGroupId = groupId;
        spacer.dataset.splitSpacer = 'true';
        spacer.style.height = `${spacerHeight}px`;
        spacer.style.margin = '0';
        spacer.style.padding = '0';
        spacer.style.border = 'none';

        currentTable.parentNode?.insertBefore(spacer, currentTable.nextSibling);
        spacer.parentNode?.insertBefore(nextTable, spacer.nextSibling);
        currentTable = nextTable;
        currentTbody = nextTbody;
      }

      if (currentTable !== table) currentTbody.appendChild(pos.row);
    }
  }
}

function getMarginTargetElement(item: PositionedGraphicElement): HTMLElement {
  let targetElement = item.element;

  if (item.type === 'svg' && item.element.parentElement) {
    targetElement = item.element.parentElement;
  } else if (item.type === 'img' && item.element.parentElement) {
    const parent = item.element.parentElement;
    if (item.element.classList.contains('mermaid-img')) {
      if (parent.parentElement?.classList.contains('mermaid-container')) {
        targetElement = parent.parentElement;
      } else {
        targetElement = parent;
      }
    } else if (['p', 'li', 'blockquote'].includes(parent.tagName.toLowerCase())) {
      targetElement = parent;
    }
  }

  return targetElement;
}

function createPageBreakSpacer(targetMargin: number): HTMLDivElement {
  const spacer = document.createElement('div');
  spacer.className = 'pdf-page-break-spacer';
  spacer.style.height = `${targetMargin}px`;
  spacer.style.margin = '0';
  spacer.style.padding = '0';
  spacer.style.border = 'none';
  spacer.style.display = 'block';
  return spacer;
}

export function applyPageBreaksWithCascade(
  tempElement: HTMLElement,
  pageConfig: PdfPageConfig,
  maxIterations = 10,
  signal?: AbortSignal,
  options: PageBreakCascadeOptions = {}
): PageBreakAnalysis {
  let iteration = 0;
  const elementWidth = tempElement.offsetWidth;
  const aspectRatio = pageConfig.contentHeight / pageConfig.contentWidth;
  const pageHeightPx = elementWidth * aspectRatio;
  const lastAdjustments = new Map<HTMLElement, { margin: number; scale: number }>();
  let analysis: PageBreakAnalysis;

  do {
    throwIfPdfExportAborted(signal);
    resetGraphicsStyles(tempElement);
    splitTables(tempElement, pageHeightPx);

    const graphics = identifyGraphicElements(tempElement);
    const elementsWithPositions = calculateElementPositions(graphics, tempElement);
    const totalHeight = Math.ceil(tempElement.getBoundingClientRect().height);
    const { boundaries: pageBoundaries, pageHeightPx: pageHeightPxFromAnalysis } = calculatePageBoundaries(
      totalHeight,
      elementWidth,
      pageConfig
    );
    let adjustmentsMade = false;
    let accumulatedShift = 0;
    const currentIterationAdjustments = new Map<HTMLElement, { margin: number; scale: number }>();

    for (const item of elementsWithPositions) {
      throwIfPdfExportAborted(signal);
      const currentTop = item.top + accumulatedShift;
      const currentBottom = currentTop + item.height;
      let targetMargin = 0;
      let targetScale = 1.0;

      const tag = item.element.tagName.toLowerCase();
      const isHeading = item.type === 'text' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag);
      if (isHeading) {
        let nextBoundaryY: number | null = null;
        for (const boundary of pageBoundaries) {
          if (currentTop < boundary) {
            nextBoundaryY = boundary;
            break;
          }
        }
        if (nextBoundaryY !== null) {
          const distanceToBoundary = nextBoundaryY - currentTop;
          if (distanceToBoundary < 70) {
            targetMargin = distanceToBoundary + 4;
          }
        }
      }

      if (targetMargin === 0) {
        let splitPageIndex = -1;
        for (let i = 0; i < pageBoundaries.length; i += 1) {
          if (currentTop < pageBoundaries[i] + 12 && currentBottom > pageBoundaries[i]) {
            splitPageIndex = i;
            break;
          }
        }

        if (splitPageIndex !== -1) {
          const boundaryY = pageBoundaries[splitPageIndex];
          const remainingSpace = boundaryY - currentTop;
          if (item.type === 'text') {
            const shiftedItem: SplitGraphicElement = {
              ...item,
              top: currentTop,
              splitPageIndex,
              overflowAmount: currentBottom - boundaryY
            };
            const shift = calculateTextElementShift(shiftedItem, pageBoundaries);
            if (shift > 0.5) {
              targetMargin = shift;
            }
          } else {
            const buffer = 15;
            const scaleNeeded = (remainingSpace - buffer) / item.height;
            const remainingSpacePercent = remainingSpace / pageHeightPxFromAnalysis;
            const isTextContainer = ['blockquote', 'li', 'table', 'pre', 'math'].includes(item.type);
            if (!isTextContainer && remainingSpacePercent >= 0.20 && scaleNeeded >= 0.6) {
              targetScale = Math.min(1.0, scaleNeeded);
            } else {
              const marginNeeded = boundaryY - currentTop + buffer;
              targetMargin = marginNeeded;
              const newTop = currentTop + marginNeeded;
              const newBottom = newTop + item.height;
              const nextBoundaryY = pageBoundaries[splitPageIndex + 1] || (boundaryY + pageHeightPxFromAnalysis);
              if (newBottom > nextBoundaryY) {
                const scaleToFitPage = (pageHeightPxFromAnalysis - 20) / item.height;
                targetScale = Math.max(0.5, Math.min(1.0, scaleToFitPage));
              }
            }
          }
        } else if (item.type !== 'text' && item.height > pageHeightPxFromAnalysis) {
          const scaleToFitPage = (pageHeightPxFromAnalysis - 20) / item.height;
          targetScale = Math.max(0.5, Math.min(1.0, scaleToFitPage));
        }
      }

      const prevAdjustment = lastAdjustments.get(item.element) || { margin: 0, scale: 1.0 };
      if (Math.abs(targetMargin - prevAdjustment.margin) > 0.1 || Math.abs(targetScale - prevAdjustment.scale) > 0.001) {
        adjustmentsMade = true;
      }
      currentIterationAdjustments.set(item.element, { margin: targetMargin, scale: targetScale });

      if (targetMargin > 0) {
        const targetElement = getMarginTargetElement(item);
        if (targetElement.tagName.toLowerCase() === 'li') {
          if (!Object.prototype.hasOwnProperty.call(targetElement.dataset, 'pdfOriginalMarginTop')) {
            targetElement.dataset.pdfOriginalMarginTop = targetElement.style.marginTop || '';
          }
          targetElement.style.marginTop = `${targetMargin}px`;
        } else {
          targetElement.parentNode?.insertBefore(createPageBreakSpacer(targetMargin), targetElement);
        }
        accumulatedShift += targetMargin;
      }

      if (targetScale < 1.0) {
        applyGraphicScaling(item.element, targetScale, item.type);
        accumulatedShift -= item.height * (1.0 - targetScale);
      }
    }

    lastAdjustments.clear();
    for (const [element, adjustment] of currentIterationAdjustments) {
      lastAdjustments.set(element, adjustment);
    }

    if (!adjustmentsMade) {
      break;
    }
    iteration += 1;
  } while (iteration < maxIterations);

  if (iteration >= maxIterations) {
    (options.warn ?? console.warn)('Page-break stabilization reached max iterations:', maxIterations);
  }

  analysis = analyzeGraphicsForPageBreaks(tempElement, signal, pageConfig, {
    error: options.error ?? console.error
  });
  options.debug?.('Page-break cascade complete:', {
    iterations: iteration,
    finalSplitCount: analysis.splitElements.length
  });
  return analysis;
}
