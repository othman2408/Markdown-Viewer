// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PDF_PAGE_CONFIG,
  analyzeGraphicsForPageBreaks,
  applyPageBreaksWithCascade,
  applyGraphicScaling,
  calculateScaleFactor,
  calculateElementPositions,
  calculatePageBoundaries,
  calculateTextElementShift,
  choosePdfCanvasScale,
  detectSplitElements,
  fitExportElementToContent,
  getElementLineHeight,
  identifyGraphicElements,
  markdownLikelyContainsMath,
  mergeSplitTables,
  resetGraphicsStyles,
  splitTables,
  waitForAllImages
} from '../../../lib/export/exportLayout';

function setRect(element: Element, rect: Partial<DOMRect>): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: rect.bottom ?? (rect.top ?? 0) + (rect.height ?? 0),
      height: rect.height ?? 0,
      left: rect.left ?? 0,
      right: rect.right ?? 0,
      top: rect.top ?? 0,
      width: rect.width ?? 0,
      x: rect.left ?? 0,
      y: rect.top ?? 0,
      toJSON: () => ({})
    })
  });
}

function setBoxMetrics(element: HTMLElement, metrics: Partial<Pick<HTMLElement, 'clientHeight' | 'clientWidth' | 'offsetHeight' | 'offsetWidth' | 'scrollHeight' | 'scrollWidth'>>): void {
  for (const [key, value] of Object.entries(metrics)) {
    Object.defineProperty(element, key, {
      configurable: true,
      value
    });
  }
}

describe('export layout helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('detects likely math markdown', () => {
    expect(markdownLikelyContainsMath('plain text')).toBe(false);
    expect(markdownLikelyContainsMath('inline $x + y$ math')).toBe(true);
    expect(markdownLikelyContainsMath('block $$x$$ math')).toBe(true);
    expect(markdownLikelyContainsMath('```math\nx\n```')).toBe(true);
    expect(markdownLikelyContainsMath('escaped \\$x$')).toBe(false);
  });

  it('chooses lower capture scale for large canvases', () => {
    expect(choosePdfCanvasScale({ offsetWidth: 1000, scrollHeight: 7000 }, { scale: 2 })).toBe(2);
    expect(choosePdfCanvasScale({ offsetWidth: 1000, scrollHeight: 9000 }, { scale: 2 })).toBe(1.5);
    expect(choosePdfCanvasScale({ offsetWidth: 2000, scrollHeight: 8000 }, { scale: 2 })).toBe(1.25);
  });

  it('fits export content width when horizontal overflow exists', () => {
    const element = document.createElement('div');
    setBoxMetrics(element, {
      scrollWidth: 500,
      clientWidth: 400
    });
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      boxSizing: 'content-box',
      getPropertyValue: (propertyName: string) => ({
        'padding-left': '20px',
        'padding-right': '10px',
        'border-left-width': '1px',
        'border-right-width': '1px'
      })[propertyName] ?? '0px'
    } as CSSStyleDeclaration);

    expect(fitExportElementToContent(element)).toBe(true);
    expect(element.style.width).toBe('470px');
  });

  it('identifies export graphic elements while skipping nested blockquote/list children', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <p>text</p>
      <blockquote><p>quoted</p></blockquote>
      <ul><li><p>block child</p><pre>code</pre></li><li>simple</li></ul>
      <img>
      <svg></svg>
      <span class="math-block"></span>
    `;

    expect(identifyGraphicElements(container).map((item) => item.type)).toEqual([
      'text',
      'blockquote',
      'li',
      'text',
      'img',
      'svg',
      'math'
    ]);
  });

  it('calculates line-height and text shifts for split elements', () => {
    const paragraph = document.createElement('p');
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      borderBottomWidth: '0px',
      borderTopWidth: '0px',
      fontSize: '20px',
      lineHeight: '1.5',
      paddingBottom: '0px',
      paddingTop: '0px',
      getPropertyValue: () => '0px'
    } as unknown as CSSStyleDeclaration);

    expect(getElementLineHeight(paragraph)).toBe(30);
    expect(calculateTextElementShift({
      bottom: 120,
      element: paragraph,
      height: 120,
      overflowAmount: 20,
      splitPageIndex: 0,
      top: 0,
      type: 'text'
    }, [75])).toBe(19);
  });

  it('calculates positions, page boundaries, and split elements', () => {
    const container = document.createElement('div');
    const first = document.createElement('img');
    const second = document.createElement('table');
    setRect(container, { top: 10, height: 400 });
    setRect(first, { top: 20, height: 100 });
    setRect(second, { top: 160, height: 200 });
    const positioned = calculateElementPositions([
      { element: first, type: 'img' },
      { element: second, type: 'table' }
    ], container);

    expect(positioned).toMatchObject([
      { top: 10, height: 100, bottom: 110 },
      { top: 150, height: 200, bottom: 350 }
    ]);
    expect(calculatePageBoundaries(500, 100, {
      contentHeight: 200,
      contentWidth: 100
    })).toEqual({
      boundaries: [200, 400],
      pageHeightPx: 200
    });
    expect(detectSplitElements(positioned, [200])).toMatchObject([
      { element: second, type: 'table', splitPageIndex: 0, overflowAmount: 150 }
    ]);
  });

  it('analyzes page breaks and returns fallback on non-cancel failures', () => {
    const container = document.createElement('div');
    const image = document.createElement('img');
    const error = vi.fn();
    container.appendChild(image);
    setBoxMetrics(container, { offsetWidth: 100 });
    setRect(container, { top: 0, height: 350 });
    setRect(image, { top: 150, height: 120 });

    expect(analyzeGraphicsForPageBreaks(container, undefined, {
      contentHeight: 200,
      contentWidth: 100
    })).toMatchObject({
      pageBoundaries: [200],
      pageCount: 2,
      pageHeightPx: 200,
      totalElements: 1
    });

    const broken = document.createElement('div');
    Object.defineProperty(broken, 'querySelectorAll', {
      value: () => {
        throw new Error('bad dom');
      }
    });

    expect(analyzeGraphicsForPageBreaks(broken, undefined, PDF_PAGE_CONFIG, { error })).toEqual({
      pageBoundaries: [],
      pageCount: 1,
      pageHeightPx: 0,
      splitElements: [],
      totalElements: 0
    });
    expect(error).toHaveBeenCalledWith('Page-break analysis failed:', expect.any(Error));
  });

  it('resets PDF temporary styles and removes page break spacers', () => {
    const container = document.createElement('div');
    const spacer = document.createElement('div');
    const element = document.createElement('div');
    spacer.className = 'pdf-page-break-spacer';
    element.dataset.pdfOriginalMarginTop = '10px';
    element.dataset.pdfOriginalTransform = 'rotate(1deg)';
    element.dataset.pdfOriginalWidth = '80px';
    element.style.marginTop = '40px';
    element.style.transform = 'scale(.5)';
    element.style.transformOrigin = 'top left';
    element.style.width = '20px';
    container.append(spacer, element);

    resetGraphicsStyles(container);

    expect(container.querySelector('.pdf-page-break-spacer')).toBeNull();
    expect(element.style.marginTop).toBe('10px');
    expect(element.style.transform).toBe('rotate(1deg)');
    expect(element.style.transformOrigin).toBe('');
    expect(element.style.width).toBe('80px');
    expect(element.hasAttribute('data-pdf-original-margin-top')).toBe(false);
  });

  it('calculates and applies graphic scaling for image and block elements', () => {
    const warn = vi.fn();
    expect(calculateScaleFactor(1000, 300, 10, 0.5, warn)).toEqual({
      scaleFactor: 0.5,
      wasClampedToMin: true
    });
    expect(warn).toHaveBeenCalledOnce();

    const image = document.createElement('img');
    setBoxMetrics(image, { clientWidth: 200, clientHeight: 100 });
    applyGraphicScaling(image, 0.75, 'img');
    expect(image.style.width).toBe('150px');
    expect(image.style.height).toBe('75px');
    expect(image.dataset.pdfOriginalClientWidth).toBe('200');

    const block = document.createElement('pre');
    setBoxMetrics(block, { offsetWidth: 200 });
    Object.defineProperty(block, 'offsetHeight', { configurable: true, value: 120 });
    applyGraphicScaling(block, 0.5, 'pre');
    expect(block.style.transform).toBe('scale(0.5)');
    expect(block.style.transformOrigin).toBe('top left');
    expect(block.style.height).toBe('60px');
    expect(block.style.overflow).toBe('hidden');
  });

  it('waits for incomplete images and ignores completed images', async () => {
    const container = document.createElement('div');
    const completeImage = document.createElement('img');
    const pendingImage = document.createElement('img');
    Object.defineProperty(completeImage, 'complete', { configurable: true, value: true });
    Object.defineProperty(pendingImage, 'complete', { configurable: true, value: false });
    container.append(completeImage, pendingImage);

    const done = vi.fn();
    const promise = waitForAllImages(container).then(done);
    pendingImage.dispatchEvent(new Event('load'));
    await promise;

    expect(done).toHaveBeenCalledOnce();
  });

  it('merges previously split tables back into their original table', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <table data-split-group-id="g1"><tbody><tr id="r1"></tr></tbody></table>
      <div data-split-group-id="g1" data-split-spacer="true"></div>
      <table data-split-group-id="g1" data-split-part="true"><tbody><tr id="r2"></tr></tbody></table>
    `;

    mergeSplitTables(container);

    expect(container.querySelectorAll('table')).toHaveLength(1);
    expect(container.querySelector('#r2')?.closest('table')).toBe(container.querySelector('table'));
    expect(container.querySelector('[data-split-spacer="true"]')).toBeNull();
    expect(container.querySelector('table')?.hasAttribute('data-split-group-id')).toBe(false);
  });

  it('splits oversized tables at page boundaries', () => {
    const container = document.createElement('div');
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    const row1 = document.createElement('tr');
    const row2 = document.createElement('tr');
    container.appendChild(table);
    table.appendChild(tbody);
    tbody.append(row1, row2);
    setRect(container, { top: 0, height: 180 });
    setRect(table, { top: 0, height: 120 });
    setRect(row1, { top: 0, bottom: 40, height: 40 });
    setRect(row2, { top: 40, bottom: 110, height: 70 });

    splitTables(container, 80);

    const splitPart = container.querySelector<HTMLTableElement>('table[data-split-part="true"]');
    const spacer = container.querySelector<HTMLElement>('[data-split-spacer="true"]');
    expect(table.dataset.splitGroupId).toBe('table-group-0');
    expect(splitPart).not.toBeNull();
    expect(spacer?.style.height).toBe('40px');
    expect(row2.closest('table')).toBe(splitPart);
  });

  it('applies page-break cascade spacers and logs the final analysis', () => {
    const container = document.createElement('div');
    const heading = document.createElement('h2');
    const debug = vi.fn();
    container.appendChild(heading);
    setBoxMetrics(container, { offsetWidth: 100 });
    setRect(container, { top: 0, height: 160 });
    setRect(heading, { top: 95, height: 20 });

    const analysis = applyPageBreaksWithCascade(container, {
      ...PDF_PAGE_CONFIG,
      contentHeight: 100,
      contentWidth: 100
    }, 2, undefined, { debug });

    expect(container.querySelector<HTMLElement>('.pdf-page-break-spacer')?.style.height).toBe('9px');
    expect(analysis.pageCount).toBe(2);
    expect(debug).toHaveBeenCalledWith('Page-break cascade complete:', {
      iterations: 1,
      finalSplitCount: 1
    });
  });
});
