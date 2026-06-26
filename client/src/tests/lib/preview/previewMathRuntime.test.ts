// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  createPreviewMathJaxConfig,
  processPreviewMath,
  type PreviewMathWindow
} from '../../../lib/preview/previewMathRuntime';

describe('preview MathJax runtime', () => {
  it('does nothing when markdown does not contain math', () => {
    const loadScript = vi.fn(() => Promise.resolve());
    const typesetPromise = vi.fn(() => Promise.resolve());
    const windowRef: PreviewMathWindow = { MathJax: { typesetPromise } };

    processPreviewMath({
      rawMarkdown: 'plain text',
      roots: [document.createElement('div')],
      renderId: 1,
      isCurrentRender: () => true,
      loadScript,
      mathjaxUrl: '/mathjax.js',
      windowRef
    });

    expect(loadScript).not.toHaveBeenCalled();
    expect(typesetPromise).not.toHaveBeenCalled();
  });

  it('typesets existing MathJax targets and removes focus tab stops', async () => {
    const root = document.createElement('div');
    root.textContent = 'inline $x$ math';
    const mjx = document.createElement('mjx-container');
    mjx.setAttribute('tabindex', '0');
    root.appendChild(mjx);
    const typesetPromise = vi.fn(() => Promise.resolve());
    const windowRef: PreviewMathWindow = { MathJax: { typesetPromise } };

    processPreviewMath({
      rawMarkdown: 'inline $x$ math',
      roots: [root],
      renderId: 2,
      isCurrentRender: (renderId) => renderId === 2,
      loadScript: vi.fn(() => Promise.resolve()),
      mathjaxUrl: '/mathjax.js',
      windowRef
    });
    await Promise.resolve();

    expect(typesetPromise).toHaveBeenCalledWith([root]);
    expect(mjx.hasAttribute('tabindex')).toBe(false);
  });

  it('configures and loads MathJax when it is missing', async () => {
    const root = document.createElement('div');
    root.textContent = '$$x$$';
    const typesetPromise = vi.fn(() => Promise.resolve());
    const windowRef: PreviewMathWindow = {};
    let configuredBeforeLoad: PreviewMathWindow['MathJax'];
    const loadScript = vi.fn(() => {
      configuredBeforeLoad = windowRef.MathJax;
      windowRef.MathJax = { typesetPromise };
      return Promise.resolve();
    });

    processPreviewMath({
      rawMarkdown: '$$x$$',
      roots: [root],
      renderId: 3,
      isCurrentRender: (renderId) => renderId === 3,
      loadScript,
      mathjaxUrl: '/mathjax.js',
      windowRef
    });

    expect(configuredBeforeLoad).toEqual(createPreviewMathJaxConfig());
    await Promise.resolve();
    await Promise.resolve();

    expect(loadScript).toHaveBeenCalledWith('/mathjax.js');
    expect(typesetPromise).toHaveBeenCalledWith([root]);
  });

  it('does not typeset loaded MathJax for stale renders', async () => {
    const root = document.createElement('div');
    root.textContent = '$x$';
    const typesetPromise = vi.fn(() => Promise.resolve());
    const windowRef: PreviewMathWindow = {};
    const loadScript = vi.fn(() => {
      windowRef.MathJax = { typesetPromise };
      return Promise.resolve();
    });

    processPreviewMath({
      rawMarkdown: '$x$',
      roots: [root],
      renderId: 4,
      isCurrentRender: () => false,
      loadScript,
      mathjaxUrl: '/mathjax.js',
      windowRef
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(typesetPromise).not.toHaveBeenCalled();
  });

  it('warns on MathJax load failures', async () => {
    const warn = vi.fn();
    const error = new Error('offline');

    processPreviewMath({
      rawMarkdown: '$x$',
      roots: [document.createElement('div')],
      renderId: 5,
      isCurrentRender: () => true,
      loadScript: vi.fn(() => Promise.reject(error)),
      mathjaxUrl: '/mathjax.js',
      windowRef: {},
      warn
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith('Failed to load MathJax:', error);
  });
});
