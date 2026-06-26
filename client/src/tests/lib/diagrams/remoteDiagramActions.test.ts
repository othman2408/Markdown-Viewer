// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  copyRemoteDiagramImage,
  downloadRemoteDiagramPng,
  downloadRemoteDiagramSvg,
  openRemoteImageZoomModal
} from '../../../lib/diagrams/remoteDiagramActions';

function createContainer(): { container: HTMLElement; img: HTMLImageElement; button: HTMLButtonElement } {
  const container = document.createElement('div');
  const img = document.createElement('img');
  const button = document.createElement('button');
  img.src = 'https://example.test/diagram.svg';
  button.innerHTML = 'Original';
  container.appendChild(img);
  document.body.appendChild(container);
  return { container, img, button };
}

describe('remote diagram actions', () => {
  it('downloads a PNG and restores button feedback', async () => {
    const { container, button } = createContainer();
    const click = vi.fn();
    const anchor = document.createElement('a');
    anchor.click = click;
    const setTimeoutFn = vi.fn((callback: () => void) => {
      callback();
      return 1;
    });

    await downloadRemoteDiagramPng(container, button, 'Diagram', {
      getPngUrl: (url) => url.replace('/svg/', '/png/'),
      getPngBlob: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))),
      createObjectUrl: () => 'blob:diagram',
      revokeObjectUrl: vi.fn(),
      createAnchor: () => anchor,
      now: () => 123,
      setTimeoutFn
    });

    expect(anchor.href).toBe('blob:diagram');
    expect(anchor.download).toBe('diagram-123.png');
    expect(click).toHaveBeenCalledOnce();
    expect(button.innerHTML).toBe('Original');
    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 1500);
  });

  it('copies a PNG image and restores button feedback', async () => {
    const { container, button } = createContainer();
    const writeClipboard = vi.fn(() => Promise.resolve());
    class TestClipboardItem {
      value: Record<string, Blob>;
      constructor(value: Record<string, Blob>) {
        this.value = value;
      }
    }

    await copyRemoteDiagramImage(container, button, 'Diagram', {
      getPngUrl: (url) => url,
      getPngBlob: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))),
      writeClipboard,
      clipboardItemCtor: TestClipboardItem as unknown as typeof ClipboardItem,
      setTimeoutFn: (callback) => {
        callback();
        return 1;
      }
    });

    expect(writeClipboard).toHaveBeenCalledWith([expect.any(TestClipboardItem)]);
    expect(button.innerHTML).toBe('Original');
  });

  it('shows clipboard failure feedback while still restoring the button', async () => {
    const { container, button } = createContainer();
    const error = vi.fn();
    const restoreCallbacks: Array<() => void> = [];

    await copyRemoteDiagramImage(container, button, 'Diagram', {
      getPngUrl: (url) => url,
      getPngBlob: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))),
      writeClipboard: vi.fn(() => Promise.reject(new Error('denied'))),
      clipboardItemCtor: class TestClipboardItem {
        constructor(_value: Record<string, Blob>) {}
      } as unknown as typeof ClipboardItem,
      setTimeoutFn: (callback) => {
        restoreCallbacks.push(callback);
        return 1;
      },
      error
    });

    expect(error).toHaveBeenCalledWith('Clipboard write failed:', expect.any(Error));
    expect(button.innerHTML).toBe('<i class="bi bi-x-lg"></i>');
    restoreCallbacks[0]();
    expect(button.innerHTML).toBe('Original');
  });

  it('restores the original button on PNG generation failure', async () => {
    const { container, button } = createContainer();
    const error = vi.fn();

    await downloadRemoteDiagramPng(container, button, 'Diagram', {
      getPngUrl: (url) => url,
      getPngBlob: vi.fn(() => Promise.reject(new Error('boom'))),
      error
    });

    expect(error).toHaveBeenCalledWith('Diagram PNG export failed:', expect.any(Error));
    expect(button.innerHTML).toBe('Original');
  });

  it('delegates SVG downloads with generated filenames', async () => {
    const { container, button, img } = createContainer();
    const downloadSvg = vi.fn(() => Promise.resolve());

    await downloadRemoteDiagramSvg(container, button, {
      downloadSvg,
      now: () => 456
    });

    expect(button.innerHTML).toBe('<i class="bi bi-hourglass-split"></i>');
    expect(downloadSvg).toHaveBeenCalledWith(img, 'diagram-456.svg', button, 'Original');
  });

  it('opens a zoom modal with cloned image state', () => {
    const { container, img } = createContainer();
    img.setAttribute('width', '200');
    img.setAttribute('height', '100');
    const modalDiagram = document.createElement('div');
    const zoomModal = document.createElement('div');
    const resetTransform = vi.fn();
    const setCurrentElement = vi.fn();

    openRemoteImageZoomModal(container, {
      modalDiagram,
      zoomModal,
      resetTransform,
      setCurrentElement
    });
    const clone = modalDiagram.querySelector('img') as HTMLImageElement;

    expect(resetTransform).toHaveBeenCalledOnce();
    expect(clone).not.toBe(img);
    expect(clone.hasAttribute('width')).toBe(false);
    expect(clone.hasAttribute('height')).toBe(false);
    expect(clone.style.maxWidth).toBe('80vw');
    expect(clone.style.maxHeight).toBe('60vh');
    expect(clone.draggable).toBe(false);
    expect(setCurrentElement).toHaveBeenCalledWith(clone);
    expect(zoomModal.classList.contains('active')).toBe(true);

    const dragEvent = new Event('dragstart', { cancelable: true });
    clone.dispatchEvent(dragEvent);
    expect(dragEvent.defaultPrevented).toBe(true);
  });

  it('does nothing when the container has no image', async () => {
    const container = document.createElement('div');
    const button = document.createElement('button');
    button.innerHTML = 'Original';
    const getPngBlob = vi.fn();

    await downloadRemoteDiagramPng(container, button, 'Diagram', {
      getPngUrl: (url) => url,
      getPngBlob
    });
    await copyRemoteDiagramImage(container, button, 'Diagram', {
      getPngUrl: (url) => url,
      getPngBlob
    });

    expect(getPngBlob).not.toHaveBeenCalled();
    expect(button.innerHTML).toBe('Original');
  });
});
