// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExportRuntime, type CreateExportRuntimeOptions } from '../../../lib/app/exportRuntime';

function createRuntime(overrides: Partial<CreateExportRuntimeOptions> = {}) {
  const editor = { value: '# Hello' } as Pick<HTMLTextAreaElement, 'value'>;
  const pdfButton = document.createElement('button');
  const pngButton = document.createElement('button');
  pdfButton.innerHTML = '<i></i> PDF';
  pngButton.innerHTML = '<i></i> PNG';
  const saveAs = vi.fn();
  const loadScript = vi.fn().mockResolvedValue(undefined);

  const runtime = createExportRuntime({
    alertRef: vi.fn(),
    cdn: {
      abcjs: '/abc.js',
      html2canvas: '/html2canvas.js',
      jspdf: '/jspdf.js',
      mermaid: '/mermaid.js'
    },
    consoleRef: {
      error: vi.fn(),
      info: vi.fn(),
      log: vi.fn(),
      warn: vi.fn()
    },
    documentRef: document,
    editor,
    exportButtons: {
      pdf: pdfButton,
      png: pngButton
    },
    getABCJS: () => undefined,
    getDomPurify: () => ({ sanitize: (html) => html }),
    getExportFilename: (extension, fallback) => extension === 'html' ? `export.${extension}` : fallback,
    getHtml2Canvas: () => undefined,
    getJsPdf: () => undefined,
    getMarked: () => ({ parse: (markdown) => markdown.startsWith('#') ? '<h1>Hello</h1>' : markdown }),
    getMathJax: () => undefined,
    getMermaid: () => undefined,
    initMermaid: vi.fn(),
    jsYaml: {
      dump: (value: unknown) => JSON.stringify(value),
      load: () => ({ title: 'Doc' })
    },
    loadScript,
    saveAs,
    ...overrides
  });

  return {
    editor,
    loadScript,
    pdfButton,
    pngButton,
    runtime,
    saveAs
  };
}

describe('export runtime', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    vi.unstubAllGlobals();
  });

  it('exports standalone HTML with frontmatter and the current theme', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const { editor, runtime, saveAs } = createRuntime();
    editor.value = '---\ntitle: Doc\n---\n# Hello';

    await runtime.handleExportHtml();

    expect(saveAs).toHaveBeenCalledOnce();
    const [blob, filename] = saveAs.mock.calls[0];
    expect(filename).toBe('export.html');
    expect(blob).toBeInstanceOf(Blob);
    await expect((blob as Blob).text()).resolves.toContain('github-markdown-dark.min.css');
    await expect((blob as Blob).text()).resolves.toContain('frontmatter-table');
  });

  it('exports PNG, restores trigger state, and removes progress DOM', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 8;
    canvas.toBlob = (callback: BlobCallback) => {
      callback(new Blob(['png'], { type: 'image/png' }));
    };
    const html2canvas = vi.fn().mockResolvedValue(canvas);
    const saveAs = vi.fn();
    const { pngButton, runtime } = createRuntime({
      getExportFilename: () => 'document.png',
      getHtml2Canvas: () => html2canvas,
      saveAs
    });

    await runtime.handleExportPng();

    expect(html2canvas).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
      scale: 2,
      useCORS: true
    }));
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'document.png');
    expect(pngButton.disabled).toBe(false);
    expect(pngButton.innerHTML).toBe('<i></i> PNG');
    expect(document.body.querySelector('.pdf-progress-overlay')).toBeNull();
    expect(document.body.querySelector('.pdf-export')).toBeNull();
  });
});
