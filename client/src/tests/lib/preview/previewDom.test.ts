// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  canReusePreviewNode,
  capturePreviewScroll,
  getPreviewPostProcessRoots,
  markPreviewRootsReady,
  patchPreviewDom,
  previewContainsSkeleton,
  queryPreviewRoots,
  restorePreviewScroll,
  showPreviewSkeleton
} from '../../../lib/preview/previewDom';

describe('preview DOM adapter', () => {
  it('shows and detects the preview skeleton without duplicating it', () => {
    const container = document.createElement('div');

    showPreviewSkeleton(container);
    showPreviewSkeleton(container);

    expect(container.getAttribute('aria-busy')).toBe('true');
    expect(container.dataset.renderState).toBe('loading');
    expect(previewContainsSkeleton(container)).toBe(true);
    expect(container.querySelectorAll('#markdown-preview-skeleton')).toHaveLength(1);
  });

  it('captures and restores preview pane scroll on the next frame', () => {
    const pane = document.createElement('div');
    Object.defineProperty(pane, 'scrollHeight', { value: 400, configurable: true });
    Object.defineProperty(pane, 'clientHeight', { value: 120, configurable: true });
    pane.scrollTop = 180;
    pane.scrollLeft = 16;
    const snapshot = capturePreviewScroll(pane);
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    pane.scrollTop = 0;
    pane.scrollLeft = 0;
    restorePreviewScroll(pane, snapshot, requestFrame);

    expect(requestFrame).toHaveBeenCalledOnce();
    expect(pane.scrollTop).toBe(180);
    expect(pane.scrollLeft).toBe(16);
  });

  it('full-replaces the first render and records the container as updated', () => {
    const container = document.createElement('div');

    const result = patchPreviewDom(container, '<p>First</p>', { hasCommittedRender: false });

    expect(result.fullReplace).toBe(true);
    expect(result.updatedNodes).toEqual([container]);
    expect(container.innerHTML).toBe('<p>First</p>');
  });

  it('patches changed nodes while preserving reusable nodes', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p id="keep">Same</p><p id="change">Old</p>';
    const keep = container.querySelector('#keep');

    const result = patchPreviewDom(container, '<p id="keep">Same</p><p id="change">New</p>', {
      hasCommittedRender: true
    });

    expect(result.fullReplace).toBe(false);
    expect(container.querySelector('#keep')).toBe(keep);
    expect(container.querySelector('#change')?.textContent).toBe('New');
    expect(result.updatedNodes.map((node) => (node as Element).id)).toEqual(['change']);
  });

  it('keeps segmented preview blocks when their hashes match', () => {
    const current = document.createElement('section');
    current.dataset.previewBlockHash = 'hash-1';
    current.innerHTML = '<p>Already rendered</p>';
    const next = document.createElement('section');
    next.dataset.previewBlockHash = 'hash-1';
    next.innerHTML = '<p>New sanitized block with same hash</p>';

    expect(canReusePreviewNode(current, next, { reusePreviewBlocks: true })).toBe(true);
    expect(current.innerHTML).toBe('<p>Already rendered</p>');
  });

  it('preserves open details state when replacing a details node', () => {
    const current = document.createElement('details');
    current.open = true;
    current.innerHTML = '<summary>Old</summary>';
    const next = document.createElement('details');
    next.innerHTML = '<summary>New</summary>';

    expect(canReusePreviewNode(current, next)).toBe(false);
    expect(next.hasAttribute('open')).toBe(true);
  });

  it('selects post-process roots from updated nodes with a fallback root', () => {
    const fallback = document.createElement('div');
    const changed = document.createElement('section');
    const text = document.createTextNode('changed');
    changed.appendChild(text);

    expect(getPreviewPostProcessRoots({ fullReplace: true, updatedNodes: [changed] }, fallback)).toEqual([fallback]);
    expect(getPreviewPostProcessRoots({ fullReplace: false, updatedNodes: [text] }, fallback)).toEqual([changed]);
  });

  it('queries unique roots and marks loading diagram roots ready', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div class="mermaid-container is-loading"><div class="mermaid"></div></div>
      <div class="abc-container is-loading"><div class="abc-notation"></div></div>
    `;
    const mermaidContainer = root.querySelector('.mermaid-container');

    expect(queryPreviewRoots([root, mermaidContainer], '.mermaid-container')).toHaveLength(1);
    markPreviewRootsReady([root]);

    expect(root.querySelector('.mermaid-container')?.classList.contains('is-loading')).toBe(false);
    expect(root.querySelector('.abc-container')?.classList.contains('is-loading')).toBe(false);
  });
});
