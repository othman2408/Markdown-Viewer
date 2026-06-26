// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  applyPaneFlex,
  clampPanePercent,
  getEditorPaneFlex,
  getPaneLayoutElements,
  getPanePercentFromClientX,
  getPreviewPaneFlex,
  resetPaneFlex
} from '../../../lib/editor/paneResize';

describe('pane resize helpers', () => {
  it('clamps editor pane percentages to the pane bounds', () => {
    expect(clampPanePercent(-10)).toBe(20);
    expect(clampPanePercent(15)).toBe(20);
    expect(clampPanePercent(50)).toBe(50);
    expect(clampPanePercent(85)).toBe(80);
    expect(clampPanePercent(Number.NaN)).toBe(50);
  });

  it('calculates pane percentages from pointer position', () => {
    expect(getPanePercentFromClientX(500, { left: 100, width: 1000 })).toBe(40);
    expect(getPanePercentFromClientX(-100, { left: 100, width: 1000 })).toBe(20);
    expect(getPanePercentFromClientX(1200, { left: 100, width: 1000 })).toBe(80);
    expect(getPanePercentFromClientX(500, { left: 100, width: 0 })).toBe(50);
  });

  it('builds the same flex expressions as the splitter', () => {
    expect(getEditorPaneFlex(55)).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.55 - 4px)');
    expect(getPreviewPaneFlex(55)).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.45 - 4px)');
  });

  it('resolves pane layout elements from the resize divider', () => {
    document.body.innerHTML = `
      <main class="content-container">
        <section class="editor-pane"></section>
        <div class="resize-divider"></div>
        <section class="preview-pane"></section>
      </main>
    `;
    const divider = document.querySelector('.resize-divider');
    const elements = getPaneLayoutElements(divider);

    expect(elements.container?.classList.contains('content-container')).toBe(true);
    expect(elements.editorPane?.classList.contains('editor-pane')).toBe(true);
    expect(elements.previewPane?.classList.contains('preview-pane')).toBe(true);
  });

  it('applies and resets pane flex styles through a typed layout helper', () => {
    const editorPane = document.createElement('section');
    const previewPane = document.createElement('section');

    expect(applyPaneFlex({ editorPane, previewPane }, 60)).toBe(true);
    expect(editorPane.style.flex).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.6 - 4px)');
    expect(previewPane.style.flex).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.4 - 4px)');

    resetPaneFlex({ editorPane, previewPane });

    expect(editorPane.style.flex).toBe('');
    expect(previewPane.style.flex).toBe('');
  });

  it('does not apply flex styles until both panes are available', () => {
    const editorPane = document.createElement('section');

    expect(applyPaneFlex({ editorPane, previewPane: null }, 60)).toBe(false);
    expect(editorPane.style.flex).toBe('');
  });
});
