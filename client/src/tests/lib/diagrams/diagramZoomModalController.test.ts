// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  createDiagramZoomModalController,
  DiagramZoomModalController,
  getDiagramZoomModalElements
} from '../../../lib/diagrams/diagramZoomModalController';
import type { RemoteDiagramZoomOptions } from '../../../lib/diagrams/remoteDiagramActions';

function setZoomModalDom(): void {
  document.body.innerHTML = `
    <div id="mermaid-zoom-modal">
      <button id="mermaid-modal-close">Close</button>
      <div id="mermaid-modal-diagram"></div>
      <button id="mermaid-modal-zoom-in">Zoom in</button>
      <button id="mermaid-modal-zoom-out">Zoom out</button>
      <button id="mermaid-modal-zoom-reset">Reset</button>
      <button id="mermaid-modal-copy">Copy</button>
      <button id="mermaid-modal-download-png">PNG</button>
      <button id="mermaid-modal-download-svg">SVG</button>
    </div>
  `;
}

function createController(): {
  controller: DiagramZoomModalController;
  onCopy: ReturnType<typeof vi.fn>;
  onDownloadPng: ReturnType<typeof vi.fn>;
  onDownloadSvg: ReturnType<typeof vi.fn>;
} {
  const onCopy = vi.fn();
  const onDownloadPng = vi.fn();
  const onDownloadSvg = vi.fn();
  const controller = createDiagramZoomModalController({
    documentRef: document,
    onCopy,
    onDownloadPng,
    onDownloadSvg
  });
  if (!controller) throw new Error('Controller was not created');
  return {
    controller,
    onCopy,
    onDownloadPng,
    onDownloadSvg
  };
}

function createSvgContainer(): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = '<svg width="300" height="200"><g><text>diagram</text></g></svg>';
  document.body.appendChild(container);
  return container;
}

describe('diagram zoom modal controller', () => {
  it('returns null when required modal controls are missing', () => {
    document.body.innerHTML = '<div id="mermaid-zoom-modal"></div>';

    expect(getDiagramZoomModalElements(document)).toBeNull();
    expect(createDiagramZoomModalController({
      documentRef: document,
      onCopy: vi.fn(),
      onDownloadPng: vi.fn(),
      onDownloadSvg: vi.fn()
    })).toBeNull();
  });

  it('opens an SVG clone with modal sizing styles and active state', () => {
    setZoomModalDom();
    const { controller } = createController();
    const container = createSvgContainer();

    expect(controller.openSvgFromContainer(container)).toBe(true);

    const zoomModal = document.getElementById('mermaid-zoom-modal') as HTMLElement;
    const modalDiagram = document.getElementById('mermaid-modal-diagram') as HTMLElement;
    const clone = modalDiagram.querySelector<SVGElement>('svg');
    expect(zoomModal.classList.contains('active')).toBe(true);
    expect(clone).not.toBeNull();
    expect(clone?.hasAttribute('width')).toBe(false);
    expect(clone?.hasAttribute('height')).toBe(false);
    expect(clone?.style.width).toBe('auto');
    expect(clone?.style.maxWidth).toBe('80vw');
    expect(clone?.style.transformOrigin).toBe('center');
    expect(controller.getCurrentElement()).toBe(clone);
  });

  it('returns false when opening a container without SVG', () => {
    setZoomModalDom();
    const { controller } = createController();
    const container = document.createElement('div');

    expect(controller.openSvgFromContainer(container)).toBe(false);
    expect(document.getElementById('mermaid-zoom-modal')?.classList.contains('active')).toBe(false);
  });

  it('closes from close button and backdrop, clearing modal content and current element', () => {
    setZoomModalDom();
    const { controller } = createController();
    const container = createSvgContainer();
    const zoomModal = document.getElementById('mermaid-zoom-modal') as HTMLElement;
    const modalDiagram = document.getElementById('mermaid-modal-diagram') as HTMLElement;

    controller.openSvgFromContainer(container);
    document.getElementById('mermaid-modal-close')?.click();
    expect(zoomModal.classList.contains('active')).toBe(false);
    expect(modalDiagram.textContent).toBe('');
    expect(controller.getCurrentElement()).toBeNull();

    controller.openSvgFromContainer(container);
    zoomModal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(zoomModal.classList.contains('active')).toBe(false);
  });

  it('zooms with buttons, wheel, and reset', () => {
    setZoomModalDom();
    const { controller } = createController();
    const container = createSvgContainer();
    controller.openSvgFromContainer(container);
    const current = controller.getCurrentElement() as SVGElement;

    document.getElementById('mermaid-modal-zoom-in')?.click();
    expect(current.style.transform).toBe('translate(0px, 0px) scale(1.25)');

    document.getElementById('mermaid-modal-zoom-out')?.click();
    expect(current.style.transform).toBe('translate(0px, 0px) scale(1)');

    document.getElementById('mermaid-modal-diagram')?.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: -1
    }));
    expect(current.style.transform).toBe('translate(0px, 0px) scale(1.15)');

    document.getElementById('mermaid-modal-zoom-reset')?.click();
    expect(current.style.transform).toBe('translate(0px, 0px) scale(1)');
  });

  it('pans while dragging inside the modal diagram', () => {
    setZoomModalDom();
    const { controller } = createController();
    const container = createSvgContainer();
    controller.openSvgFromContainer(container);
    const current = controller.getCurrentElement() as SVGElement;
    const modalDiagram = document.getElementById('mermaid-modal-diagram') as HTMLElement;

    modalDiagram.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      clientX: 10,
      clientY: 20
    }));
    expect(modalDiagram.classList.contains('dragging')).toBe(true);

    document.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 35,
      clientY: 55
    }));
    expect(current.style.transform).toBe('translate(25px, 35px) scale(1)');

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(modalDiagram.classList.contains('dragging')).toBe(false);
  });

  it('runs modal export callbacks with the current element and clicked button', async () => {
    setZoomModalDom();
    const {
      controller,
      onCopy,
      onDownloadPng,
      onDownloadSvg
    } = createController();
    const container = createSvgContainer();
    controller.openSvgFromContainer(container);
    const current = controller.getCurrentElement();
    const pngButton = document.getElementById('mermaid-modal-download-png') as HTMLElement;
    const copyButton = document.getElementById('mermaid-modal-copy') as HTMLElement;
    const svgButton = document.getElementById('mermaid-modal-download-svg') as HTMLElement;

    pngButton.click();
    copyButton.click();
    svgButton.click();
    await Promise.resolve();

    expect(onDownloadPng).toHaveBeenCalledWith(current, pngButton);
    expect(onCopy).toHaveBeenCalledWith(current, copyButton);
    expect(onDownloadSvg).toHaveBeenCalledWith(current, svgButton);
  });

  it('does not run modal export callbacks without a current element', async () => {
    setZoomModalDom();
    const {
      onCopy,
      onDownloadPng,
      onDownloadSvg
    } = createController();

    document.getElementById('mermaid-modal-download-png')?.click();
    document.getElementById('mermaid-modal-copy')?.click();
    document.getElementById('mermaid-modal-download-svg')?.click();
    await Promise.resolve();

    expect(onDownloadPng).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();
    expect(onDownloadSvg).not.toHaveBeenCalled();
  });

  it('delegates remote image opening with shared modal elements and state callbacks', () => {
    setZoomModalDom();
    const { controller } = createController();
    const container = document.createElement('div');
    const image = document.createElement('img');
    image.src = 'https://example.test/diagram.svg';
    container.appendChild(image);
    document.body.appendChild(container);
    const openRemoteImageZoom = vi.fn((target: Element, options: RemoteDiagramZoomOptions) => {
      expect(target).toBe(container);
      expect(options.modalDiagram).toBe(document.getElementById('mermaid-modal-diagram'));
      expect(options.zoomModal).toBe(document.getElementById('mermaid-zoom-modal'));
      options.resetTransform();
      const clone = image.cloneNode(true) as HTMLImageElement;
      options.modalDiagram.appendChild(clone);
      options.setCurrentElement(clone);
      options.zoomModal.classList.add('active');
    });

    controller.openSvgFromContainer(createSvgContainer());
    document.getElementById('mermaid-modal-zoom-in')?.click();
    controller.openRemoteImageFromContainer(container, openRemoteImageZoom);

    const current = controller.getCurrentElement() as HTMLImageElement;
    expect(openRemoteImageZoom).toHaveBeenCalledOnce();
    expect(current.tagName.toLowerCase()).toBe('img');
    expect(current.style.transform).toBe('');
    expect(document.getElementById('mermaid-zoom-modal')?.classList.contains('active')).toBe(true);
  });
});
