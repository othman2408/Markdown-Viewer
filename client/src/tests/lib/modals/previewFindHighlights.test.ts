// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  clearPreviewFindHighlights,
  createPreviewFindRegex,
  highlightPreviewText,
  scrollPreviewHighlightIntoView,
  updateActivePreviewHighlight,
  updatePreviewFindHighlights
} from '../../../lib/modals/previewFindHighlights';

function setPreviewDom(html: string): HTMLElement {
  document.body.innerHTML = `<div id="preview-pane"><div id="preview">${html}</div></div>`;
  return document.getElementById('preview') as HTMLElement;
}

describe('preview find highlights', () => {
  it('creates literal, regex, case-sensitive, and whole-word regexes', () => {
    expect(createPreviewFindRegex({
      isCaseSensitive: false,
      isRegex: false,
      isWholeWord: false,
      query: 'a.b'
    })?.source).toBe('a\\.b');

    expect(createPreviewFindRegex({
      isCaseSensitive: false,
      isRegex: true,
      isWholeWord: true,
      query: 'cat|dog'
    })?.source).toBe('\\bcat|dog\\b');

    expect(createPreviewFindRegex({
      isCaseSensitive: true,
      isRegex: false,
      isWholeWord: false,
      query: 'Alpha'
    })?.flags).toBe('g');

    expect(createPreviewFindRegex({
      isCaseSensitive: false,
      isRegex: true,
      isWholeWord: false,
      query: '['
    })).toBeNull();
  });

  it('highlights text while skipping scripts, SVG, Mermaid, and MathJax content', () => {
    const preview = setPreviewDom(`
      Alpha beta alpha
      <script>alpha</script>
      <svg><text>alpha</text></svg>
      <span class="mermaid">alpha</span>
      <span class="mjx-container">alpha</span>
      <span class="wrapper"><span>alpha</span></span>
    `);

    highlightPreviewText(preview, /alpha/gi);

    const highlights = Array.from(preview.querySelectorAll('mark.preview-find-highlight'));
    expect(highlights.map((element) => element.textContent)).toEqual(['Alpha', 'alpha', 'alpha']);
    expect(preview.querySelector('script mark')).toBeNull();
    expect(preview.querySelector('svg mark')).toBeNull();
    expect(preview.querySelector('.mermaid mark')).toBeNull();
    expect(preview.querySelector('.mjx-container mark')).toBeNull();
  });

  it('handles zero-length regex matches without adding empty marks', () => {
    const preview = setPreviewDom('alpha');

    highlightPreviewText(preview, /(?=a)/g);

    expect(preview.querySelectorAll('mark.preview-find-highlight')).toHaveLength(0);
    expect(preview.textContent).toContain('alpha');
  });

  it('clears existing preview highlights and normalizes text', () => {
    const preview = setPreviewDom('alpha alpha');
    highlightPreviewText(preview, /alpha/g);
    expect(preview.querySelectorAll('mark.preview-find-highlight')).toHaveLength(2);

    clearPreviewFindHighlights(preview);

    expect(preview.querySelector('mark')).toBeNull();
    expect(preview.textContent).toBe('alpha alpha');
    expect(preview.childNodes).toHaveLength(1);
  });

  it('updates highlights only when find and preview are active', () => {
    const preview = setPreviewDom('alpha beta alpha');
    const previewPane = document.getElementById('preview-pane') as HTMLElement;

    expect(updatePreviewFindHighlights({
      activeFindIndex: 0,
      findMatchCount: 2,
      isCaseSensitive: false,
      isFindModalOpen: true,
      isPreviewVisible: true,
      isRegex: false,
      isWholeWord: false,
      markdownPreview: preview,
      previewPane,
      query: 'alpha'
    })).toMatchObject({
      activeIndex: 0
    });
    expect(preview.querySelectorAll('mark.preview-find-highlight')).toHaveLength(2);
    expect(preview.querySelector('mark.preview-find-highlight')?.classList.contains('active')).toBe(true);

    const inactive = updatePreviewFindHighlights({
      activeFindIndex: 0,
      findMatchCount: 0,
      isCaseSensitive: false,
      isFindModalOpen: false,
      isPreviewVisible: true,
      isRegex: false,
      isWholeWord: false,
      markdownPreview: preview,
      previewPane,
      query: 'alpha'
    });
    expect(inactive).toEqual({
      activeIndex: -1,
      highlights: []
    });
    expect(preview.querySelector('mark')).toBeNull();
  });

  it('maps the active editor match to the nearest preview highlight ratio', () => {
    const preview = setPreviewDom('a a a a a');
    highlightPreviewText(preview, /a/g);
    const highlights = Array.from(preview.querySelectorAll<HTMLElement>('mark.preview-find-highlight'));

    const activeIndex = updateActivePreviewHighlight({
      activeFindIndex: 6,
      findMatchCount: 10,
      highlights,
      previewPane: document.getElementById('preview-pane') as HTMLElement
    });

    expect(activeIndex).toBe(3);
    expect(highlights[3].classList.contains('active')).toBe(true);
    expect(highlights.filter((element) => element.classList.contains('active'))).toHaveLength(1);
  });

  it('scrolls active preview highlights into view', () => {
    const previewPane = document.createElement('div');
    const element = document.createElement('mark');
    previewPane.scrollTop = 20;
    previewPane.getBoundingClientRect = vi.fn(() => ({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({})
    }));
    element.getBoundingClientRect = vi.fn(() => ({
      bottom: 160,
      height: 10,
      left: 0,
      right: 10,
      top: 150,
      width: 10,
      x: 0,
      y: 150,
      toJSON: () => ({})
    }));

    expect(scrollPreviewHighlightIntoView(element, previewPane)).toBe(true);
    expect(previewPane.scrollTop).toBe(125);
  });

  it('does not scroll already visible preview highlights', () => {
    const previewPane = document.createElement('div');
    const element = document.createElement('mark');
    previewPane.scrollTop = 20;
    previewPane.getBoundingClientRect = vi.fn(() => ({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({})
    }));
    element.getBoundingClientRect = vi.fn(() => ({
      bottom: 50,
      height: 10,
      left: 0,
      right: 10,
      top: 45,
      width: 10,
      x: 0,
      y: 45,
      toJSON: () => ({})
    }));

    expect(scrollPreviewHighlightIntoView(element, previewPane)).toBe(false);
    expect(previewPane.scrollTop).toBe(20);
  });
});
