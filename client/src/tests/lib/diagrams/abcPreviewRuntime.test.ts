// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  decorateAbcSvg,
  finalizeAbcRender,
  parseAbcHeaders
} from '../../../lib/diagrams/abcPreviewRuntime';

describe('ABC preview runtime helpers', () => {
  it('parses ABC headers with defaults', () => {
    expect(parseAbcHeaders('T: Song\nC: Ada\nM: 3/4\nK: D')).toEqual({
      title: 'Song',
      composer: 'Ada',
      meter: '3/4',
      key: 'D'
    });
    expect(parseAbcHeaders('X: 1')).toEqual({
      title: 'Music notation block',
      composer: 'Traditional',
      meter: '4/4',
      key: 'C'
    });
  });

  it('decorates rendered ABC SVG with accessible title and description', () => {
    const node = document.createElement('div');
    node.id = 'abc-1';
    node.innerHTML = '<svg><g></g></svg>';

    decorateAbcSvg(node, 'T: Tune\nC: Composer\nM: 6/8\nK: G');
    const svg = node.querySelector('svg') as SVGElement;

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-labelledby')).toBe('abc-title-abc-1 abc-desc-abc-1');
    expect(svg.getAttribute('aria-describedby')).toBe('abc-source-abc-1');
    expect(svg.querySelector('title')?.textContent).toBe('Sheet music for: Tune');
    expect(svg.querySelector('desc')?.textContent).toBe('Score in G, 6/8 meter, composed by Composer.');
    expect(svg.firstElementChild?.tagName.toLowerCase()).toBe('title');
  });

  it('finalizes ABC render with toolbar, source text, and callbacks', () => {
    const container = document.createElement('div');
    container.className = 'abc-container is-loading';
    container.innerHTML = `
      <div class="abc-toolbar"></div>
      <pre class="abc-raw-code"></pre>
      <div class="abc-sr-only"></div>
      <div id="abc-node"><svg></svg></div>
    `;
    const node = container.querySelector('#abc-node') as HTMLElement;
    const visualObj = [{ id: 1 }];
    const actions = {
      onListen: vi.fn(),
      onCopy: vi.fn(),
      onPng: vi.fn(),
      onSvg: vi.fn()
    };

    finalizeAbcRender({
      code: 'T: Song\nK: C',
      container,
      node,
      visualObj,
      actions
    });

    expect(container.classList.contains('is-loading')).toBe(false);
    expect(container.querySelectorAll('.abc-toolbar')).toHaveLength(1);
    expect(container.querySelector('.abc-raw-code')).toBeNull();
    expect(container.querySelector('.abc-sr-only')?.textContent).toBe('T: Song\nK: C');
    expect(container.querySelector('.abc-sr-only')?.id).toBe('abc-source-abc-node');

    const labels = Array.from(container.querySelectorAll('.abc-toolbar button')).map((button) => button.getAttribute('aria-label'));
    expect(labels).toEqual([
      'Listen to score',
      'Copy image to clipboard',
      'Download PNG',
      'Download SVG'
    ]);

    const buttons = container.querySelectorAll('.abc-toolbar button');
    buttons.forEach((button) => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(actions.onListen).toHaveBeenCalledWith(visualObj, buttons[0], container);
    expect(actions.onCopy).toHaveBeenCalledWith(container, buttons[1]);
    expect(actions.onPng).toHaveBeenCalledWith(container, buttons[2]);
    expect(actions.onSvg).toHaveBeenCalledWith(container, buttons[3]);
  });

  it('handles missing container by only decorating the SVG', () => {
    const node = document.createElement('div');
    node.id = 'abc-node';
    node.innerHTML = '<svg></svg>';

    finalizeAbcRender({
      code: 'T: Solo',
      container: null,
      node,
      visualObj: null,
      actions: {
        onListen: vi.fn(),
        onCopy: vi.fn(),
        onPng: vi.fn(),
        onSvg: vi.fn()
      }
    });

    expect(node.querySelector('svg')?.getAttribute('role')).toBe('img');
  });
});
