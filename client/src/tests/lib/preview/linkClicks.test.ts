// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  attachPreviewLinkClickController,
  findPreviewAnchorTarget,
  isSafePreviewHref,
  scrollPreviewAnchorTarget
} from '../../../lib/preview/linkClicks';

function setPreviewDom(html: string): {
  editor: HTMLElement;
  preview: HTMLElement;
  previewPane: HTMLElement;
} {
  document.body.innerHTML = `
    <textarea id="editor"></textarea>
    <section id="preview-pane">
      <article id="preview">${html}</article>
    </section>
  `;

  const editor = document.getElementById('editor') as HTMLElement;
  const preview = document.getElementById('preview') as HTMLElement;
  const previewPane = document.getElementById('preview-pane') as HTMLElement;
  editor.scrollTo = vi.fn();
  return {
    editor,
    preview,
    previewPane
  };
}

function setDimension(element: HTMLElement, key: 'clientHeight' | 'offsetTop' | 'scrollHeight', value: number): void {
  Object.defineProperty(element, key, {
    configurable: true,
    value
  });
}

describe('preview link click controller', () => {
  it('classifies safe and unsafe preview hrefs', () => {
    expect(isSafePreviewHref('https://example.test', 'https://app.test/doc')).toBe(true);
    expect(isSafePreviewHref('/relative/path', 'https://app.test/doc')).toBe(true);
    expect(isSafePreviewHref('mailto:user@example.test', 'https://app.test/doc')).toBe(true);
    expect(isSafePreviewHref('tel:+123', 'https://app.test/doc')).toBe(true);
    expect(isSafePreviewHref('blob:https://app.test/id', 'https://app.test/doc')).toBe(true);
    expect(isSafePreviewHref('javascript:alert(1)', 'https://app.test/doc')).toBe(false);
    expect(isSafePreviewHref('ftp://example.test/file', 'https://app.test/doc')).toBe(false);
  });

  it('finds anchor targets by id, name, escaped id fallback, and heading text', () => {
    const { preview } = setPreviewDom(`
      <p id="intro">Intro</p>
      <a name="named-target"></a>
      <h2>Section Title!</h2>
      <p id="needs space">Escaped</p>
    `);

    expect(findPreviewAnchorTarget(preview, 'intro')?.id).toBe('intro');
    expect(findPreviewAnchorTarget(preview, 'named-target')?.getAttribute('name')).toBe('named-target');
    expect(findPreviewAnchorTarget(preview, 'Section Title')?.textContent).toBe('Section Title!');
    expect(findPreviewAnchorTarget(preview, 'needs space')?.id).toBe('needs space');
    expect(findPreviewAnchorTarget(preview, 'missing')).toBeNull();
  });

  it('scrolls a preview anchor target and mirrors position to the editor', () => {
    const { editor, previewPane, preview } = setPreviewDom('<h2 id="target">Target</h2>');
    const target = preview.querySelector<HTMLElement>('#target')!;
    target.scrollIntoView = vi.fn();
    setDimension(previewPane, 'scrollHeight', 1000);
    setDimension(previewPane, 'clientHeight', 200);
    setDimension(editor, 'scrollHeight', 2000);
    setDimension(editor, 'clientHeight', 500);
    setDimension(target, 'offsetTop', 400);

    expect(scrollPreviewAnchorTarget({
      editor,
      previewPane,
      targetElement: target
    })).toBe(750);
    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start'
    });
    expect(editor.scrollTo).toHaveBeenCalledWith({
      behavior: 'smooth',
      top: 750
    });
  });

  it('handles in-preview anchor clicks with programmatic scroll timing', () => {
    const { editor, preview, previewPane } = setPreviewDom('<a href="#target">Jump</a><h2 id="target">Target</h2>');
    const target = preview.querySelector<HTMLElement>('#target')!;
    const link = preview.querySelector<HTMLAnchorElement>('a')!;
    const setProgrammaticScrolling = vi.fn();
    const openExternal = vi.fn();
    const clearTimeoutFn = vi.fn();
    const timers: Array<() => void> = [];
    target.scrollIntoView = vi.fn();
    setDimension(previewPane, 'scrollHeight', 1000);
    setDimension(previewPane, 'clientHeight', 200);
    setDimension(editor, 'scrollHeight', 2000);
    setDimension(editor, 'clientHeight', 500);
    setDimension(target, 'offsetTop', 400);

    attachPreviewLinkClickController({
      clearTimeoutFn,
      editor,
      locationHref: 'https://app.test/doc',
      markdownPreview: preview,
      openExternal,
      previewPane,
      setProgrammaticScrolling,
      setTimeoutFn(callback) {
        timers.push(callback);
        return `timer-${timers.length}`;
      }
    });

    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    });
    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(openExternal).not.toHaveBeenCalled();
    expect(setProgrammaticScrolling).toHaveBeenCalledWith(true);
    expect(editor.scrollTo).toHaveBeenCalledWith({
      behavior: 'smooth',
      top: 750
    });

    timers[0]();
    expect(setProgrammaticScrolling).toHaveBeenLastCalledWith(false);

    link.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    }));
    link.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    }));
    expect(clearTimeoutFn).toHaveBeenCalledWith('timer-2');
  });

  it('opens safe external links and blocks unsafe links', () => {
    const { editor, preview, previewPane } = setPreviewDom(`
      <a id="safe" href="https://example.test/page">Safe</a>
      <a id="unsafe" href="javascript:alert(1)">Unsafe</a>
    `);
    const openExternal = vi.fn();
    const warn = vi.fn();
    attachPreviewLinkClickController({
      editor,
      locationHref: 'https://app.test/doc',
      markdownPreview: preview,
      openExternal,
      previewPane,
      setProgrammaticScrolling: vi.fn(),
      warn
    });

    const safeEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    });
    preview.querySelector('#safe')?.dispatchEvent(safeEvent);
    expect(safeEvent.defaultPrevented).toBe(true);
    expect(openExternal).toHaveBeenCalledWith('https://example.test/page', '_blank', 'noopener,noreferrer');

    const unsafeEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    });
    preview.querySelector('#unsafe')?.dispatchEvent(unsafeEvent);
    expect(unsafeEvent.defaultPrevented).toBe(true);
    expect(warn).toHaveBeenCalledWith('Blocked opening potentially unsafe URL:', 'javascript:alert(1)');
  });

  it('ignores missing hrefs and missing anchor targets', () => {
    const { editor, preview, previewPane } = setPreviewDom(`
      <a id="empty">Empty</a>
      <a id="missing" href="#not-there">Missing</a>
    `);
    const openExternal = vi.fn();
    const setProgrammaticScrolling = vi.fn();
    attachPreviewLinkClickController({
      editor,
      locationHref: 'https://app.test/doc',
      markdownPreview: preview,
      openExternal,
      previewPane,
      setProgrammaticScrolling
    });

    const emptyEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    });
    preview.querySelector('#empty')?.dispatchEvent(emptyEvent);
    expect(emptyEvent.defaultPrevented).toBe(false);

    const missingEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    });
    preview.querySelector('#missing')?.dispatchEvent(missingEvent);
    expect(missingEvent.defaultPrevented).toBe(false);
    expect(openExternal).not.toHaveBeenCalled();
    expect(setProgrammaticScrolling).not.toHaveBeenCalled();
  });

  it('detaches the click handler and clears the active timer', () => {
    const { editor, preview, previewPane } = setPreviewDom('<a href="#target">Jump</a><h2 id="target">Target</h2>');
    const target = preview.querySelector<HTMLElement>('#target')!;
    target.scrollIntoView = vi.fn();
    const clearTimeoutFn = vi.fn();
    const controller = attachPreviewLinkClickController({
      clearTimeoutFn,
      editor,
      locationHref: 'https://app.test/doc',
      markdownPreview: preview,
      openExternal: vi.fn(),
      previewPane,
      setProgrammaticScrolling: vi.fn(),
      setTimeoutFn: vi.fn(() => 'timer-1')
    });

    preview.querySelector('a')?.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    }));
    controller.detach();
    expect(clearTimeoutFn).toHaveBeenCalledWith('timer-1');

    preview.querySelector('a')?.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    }));
    expect(target.scrollIntoView).toHaveBeenCalledOnce();
  });
});
