// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createExportTempElement,
  removeExportMathJaxArtifacts,
  replaceExportSvgContainersWithImages
} from '../../../lib/export/exportDom';

describe('export DOM helpers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('creates the hidden PDF export element with export styling', () => {
    const enhance = vi.fn((element: HTMLElement) => {
      element.querySelector('div')?.setAttribute('data-enhanced', 'true');
    });

    const element = createExportTempElement({
      enhance,
      html: '<div>PDF content</div>',
      mode: 'pdf'
    });

    expect(element.className).toBe('markdown-body pdf-export');
    expect(element.innerHTML).toBe('<div data-enhanced="true">PDF content</div>');
    expect(enhance).toHaveBeenCalledWith(element);
    expect(element.style.padding).toBe('0px');
    expect(element.style.width).toBe('210mm');
    expect(element.style.margin).toBe('0px auto');
    expect(element.style.fontSize).toBe('14px');
    expect(element.style.position).toBe('fixed');
    expect(element.style.left).toBe('-9999px');
    expect(element.style.top).toBe('0px');
    expect(element.style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(element.style.color).toBe('rgb(36, 41, 46)');
  });

  it('creates the hidden PNG export element with dark theme styling', () => {
    document.documentElement.setAttribute('data-theme', 'dark');

    const element = createExportTempElement({
      html: '<p>PNG content</p>',
      mode: 'png'
    });

    expect(element.style.padding).toBe('40px');
    expect(element.style.width).toBe('1000px');
    expect(element.style.fontSize).toBe('16px');
    expect(element.style.backgroundColor).toBe('rgb(13, 17, 23)');
    expect(element.style.color).toBe('rgb(201, 209, 217)');
  });

  it('lets callers provide a theme getter and document reference', () => {
    const customDocument = document.implementation.createHTMLDocument('export');

    const element = createExportTempElement({
      documentRef: customDocument,
      getTheme: () => 'dark',
      html: '<span>Custom document</span>',
      mode: 'pdf'
    });

    expect(element.ownerDocument).toBe(customDocument);
    expect(element.style.backgroundColor).toBe('rgb(13, 17, 23)');
  });

  it('replaces PDF export SVG containers with sized data images', () => {
    document.body.innerHTML = `
      <div class="mermaid-container">
        <svg id="diagram-1" width="640" height="320"><path d="M0 0h10v10z"></path></svg>
      </div>
    `;

    const replacedCount = replaceExportSvgContainersWithImages(document, {
      containerSelector: '.mermaid-container',
      imageClassName: 'mermaid-img',
      preserveSvgId: true,
      setClonedSvgInlineSize: true,
      setImageMaxWidth: true,
      storeOriginalSize: true,
      useAttributeSizeFallback: true,
      useClientSizeFallback: true
    });
    const img = document.querySelector<HTMLImageElement>('.mermaid-container img');

    expect(replacedCount).toBe(1);
    expect(img?.className).toBe('mermaid-img');
    expect(img?.id).toBe('diagram-1-img');
    expect(img?.src).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(img?.style.width).toBe('640px');
    expect(img?.style.height).toBe('320px');
    expect(img?.style.maxWidth).toBe('100%');
    expect(img?.style.display).toBe('block');
    expect(img?.style.margin).toBe('0px auto');
    expect(img?.dataset.originalWidth).toBe('640');
    expect(img?.dataset.originalHeight).toBe('320');
  });

  it('replaces PNG export SVG containers with the existing minimal image styling', () => {
    document.body.innerHTML = `
      <div class="abc-container">
        <svg><path d="M0 0h10v10z"></path></svg>
      </div>
    `;
    const svg = document.querySelector<SVGSVGElement>('svg');
    svg!.getBoundingClientRect = () => ({
      bottom: 200,
      height: 180,
      left: 0,
      right: 300,
      top: 20,
      width: 300,
      x: 0,
      y: 20,
      toJSON: () => ({})
    });

    const replacedCount = replaceExportSvgContainersWithImages(document, {
      containerSelector: '.abc-container'
    });
    const img = document.querySelector<HTMLImageElement>('.abc-container img');

    expect(replacedCount).toBe(1);
    expect(img?.className).toBe('');
    expect(img?.id).toBe('');
    expect(img?.style.width).toBe('300px');
    expect(img?.style.height).toBe('180px');
    expect(img?.style.maxWidth).toBe('');
    expect(img?.dataset.originalWidth).toBeUndefined();
    expect(img?.dataset.originalHeight).toBeUndefined();
  });

  it('leaves containers without SVG output untouched', () => {
    document.body.innerHTML = '<div class="mermaid-container">Not rendered</div>';

    const replacedCount = replaceExportSvgContainersWithImages(document, {
      containerSelector: '.mermaid-container',
      imageClassName: 'mermaid-img'
    });

    expect(replacedCount).toBe(0);
    expect(document.querySelector('.mermaid-container')?.textContent).toBe('Not rendered');
  });

  it('removes MathJax assistive and source artifacts from export DOM', () => {
    document.body.innerHTML = `
      <div id="export-root">
        <mjx-assistive-mml>hidden math text</mjx-assistive-mml>
        <script type="math/tex">x^2</script>
        <script type="application/x-tex">y^2</script>
        <script type="application/javascript">console.log('keep')</script>
      </div>
    `;
    const root = document.querySelector('#export-root')!;

    const removed = removeExportMathJaxArtifacts(root);

    expect(removed).toEqual({
      assistiveElements: 1,
      scripts: 2
    });
    expect(root.querySelector('mjx-assistive-mml')).toBeNull();
    expect(root.querySelector('script[type*="math"]')).toBeNull();
    expect(root.querySelector('script[type*="tex"]')).toBeNull();
    expect(root.querySelector('script[type="application/javascript"]')).not.toBeNull();
  });
});
