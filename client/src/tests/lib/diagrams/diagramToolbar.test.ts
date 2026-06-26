// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { addRemoteDiagramToolbars } from '../../../lib/diagrams/diagramToolbar';

function createRoot(): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="diagram-container"><img src="diagram.svg" /></div>
    <div class="diagram-container missing-target"></div>
  `;
  document.body.appendChild(root);
  return root;
}

describe('remote diagram toolbar builder', () => {
  it('adds one toolbar per rendered container with stable button order', () => {
    const root = createRoot();

    addRemoteDiagramToolbars(root, {
      containerSelector: '.diagram-container',
      toolbarClassName: 'diagram-toolbar',
      buttonClassName: 'diagram-toolbar-btn',
      onZoom: vi.fn(),
      onCopy: vi.fn(),
      onPng: vi.fn(),
      onSvg: vi.fn()
    });
    addRemoteDiagramToolbars(root, {
      containerSelector: '.diagram-container',
      toolbarClassName: 'diagram-toolbar',
      buttonClassName: 'diagram-toolbar-btn',
      onZoom: vi.fn(),
      onCopy: vi.fn(),
      onPng: vi.fn(),
      onSvg: vi.fn()
    });

    const toolbars = root.querySelectorAll('.diagram-toolbar');
    expect(toolbars).toHaveLength(1);
    expect(root.querySelector('.missing-target .diagram-toolbar')).toBeNull();
    expect(Array.from(toolbars[0].querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))).toEqual([
      'Zoom diagram',
      'Copy image to clipboard',
      'Download PNG',
      'Download SVG'
    ]);
    expect(Array.from(toolbars[0].querySelectorAll('button')).map((button) => button.className)).toEqual([
      'diagram-toolbar-btn',
      'diagram-toolbar-btn',
      'diagram-toolbar-btn',
      'diagram-toolbar-btn'
    ]);
  });

  it('dispatches toolbar button callbacks with the container and button', () => {
    const root = createRoot();
    const onZoom = vi.fn();
    const onCopy = vi.fn();
    const onPng = vi.fn();
    const onSvg = vi.fn();

    addRemoteDiagramToolbars(root, {
      containerSelector: '.diagram-container',
      toolbarClassName: 'diagram-toolbar',
      buttonClassName: 'diagram-toolbar-btn',
      onZoom,
      onCopy,
      onPng,
      onSvg
    });
    const container = root.querySelector('.diagram-container');
    const buttons = root.querySelectorAll('button');
    buttons.forEach((button) => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(onZoom).toHaveBeenCalledWith(container, buttons[0]);
    expect(onCopy).toHaveBeenCalledWith(container, buttons[1]);
    expect(onPng).toHaveBeenCalledWith(container, buttons[2]);
    expect(onSvg).toHaveBeenCalledWith(container, buttons[3]);
  });

  it('supports custom rendered target selectors', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="diagram-container"><svg></svg></div>';

    addRemoteDiagramToolbars(root, {
      containerSelector: '.diagram-container',
      toolbarClassName: 'diagram-toolbar',
      buttonClassName: 'diagram-toolbar-btn',
      renderedTargetSelector: 'svg',
      onZoom: vi.fn(),
      onCopy: vi.fn(),
      onPng: vi.fn(),
      onSvg: vi.fn()
    });

    expect(root.querySelector('.diagram-toolbar')).not.toBeNull();
  });
});
