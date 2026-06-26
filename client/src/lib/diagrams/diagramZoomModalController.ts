import type { RemoteDiagramZoomOptions } from './remoteDiagramActions';

export interface DiagramZoomModalElements {
  closeButton: HTMLElement;
  copyButton: HTMLElement;
  downloadPngButton: HTMLElement;
  downloadSvgButton: HTMLElement;
  modalDiagram: HTMLElement;
  zoomInButton: HTMLElement;
  zoomModal: HTMLElement;
  zoomOutButton: HTMLElement;
  zoomResetButton: HTMLElement;
}

export interface DiagramZoomModalControllerOptions {
  documentRef?: Document;
  onCopy(element: Element, button: HTMLElement): Promise<void> | void;
  onDownloadPng(element: Element, button: HTMLElement): Promise<void> | void;
  onDownloadSvg(element: Element, button: HTMLElement): Promise<void> | void;
}

type OpenRemoteImageZoom = (container: Element, options: RemoteDiagramZoomOptions) => void;

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const BUTTON_ZOOM_STEP = 0.25;
const WHEEL_ZOOM_STEP = 0.15;

export function getDiagramZoomModalElements(documentRef: Document): DiagramZoomModalElements | null {
  const closeButton = documentRef.getElementById('mermaid-modal-close');
  const copyButton = documentRef.getElementById('mermaid-modal-copy');
  const downloadPngButton = documentRef.getElementById('mermaid-modal-download-png');
  const downloadSvgButton = documentRef.getElementById('mermaid-modal-download-svg');
  const modalDiagram = documentRef.getElementById('mermaid-modal-diagram');
  const zoomInButton = documentRef.getElementById('mermaid-modal-zoom-in');
  const zoomModal = documentRef.getElementById('mermaid-zoom-modal');
  const zoomOutButton = documentRef.getElementById('mermaid-modal-zoom-out');
  const zoomResetButton = documentRef.getElementById('mermaid-modal-zoom-reset');

  if (
    !closeButton ||
    !copyButton ||
    !downloadPngButton ||
    !downloadSvgButton ||
    !modalDiagram ||
    !zoomInButton ||
    !zoomModal ||
    !zoomOutButton ||
    !zoomResetButton
  ) {
    return null;
  }

  return {
    closeButton,
    copyButton,
    downloadPngButton,
    downloadSvgButton,
    modalDiagram,
    zoomInButton,
    zoomModal,
    zoomOutButton,
    zoomResetButton
  };
}

function clampZoom(scale: number): number {
  return Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
}

function styleZoomedElement(element: HTMLElement | SVGElement): void {
  element.removeAttribute('width');
  element.removeAttribute('height');
  element.style.width = 'auto';
  element.style.height = 'auto';
  element.style.maxWidth = '80vw';
  element.style.maxHeight = '60vh';
  element.style.transformOrigin = 'center';
}

export class DiagramZoomModalController {
  private readonly documentRef: Document;
  private readonly elements: DiagramZoomModalElements;
  private readonly options: DiagramZoomModalControllerOptions;
  private currentElement: Element | null = null;
  private dragStart = { x: 0, y: 0 };
  private isDragging = false;
  private panX = 0;
  private panY = 0;
  private zoomScale = 1;

  constructor(elements: DiagramZoomModalElements, options: DiagramZoomModalControllerOptions) {
    this.elements = elements;
    this.options = options;
    this.documentRef = options.documentRef ?? elements.zoomModal.ownerDocument;
    this.attach();
  }

  close(): boolean {
    if (!this.elements.zoomModal.classList.contains('active')) return false;

    this.elements.zoomModal.classList.remove('active');
    this.elements.modalDiagram.textContent = '';
    this.currentElement = null;
    this.isDragging = false;
    this.elements.modalDiagram.classList.remove('dragging');
    this.resetTransform();
    return true;
  }

  getCurrentElement(): Element | null {
    return this.currentElement;
  }

  openRemoteImageFromContainer(container: Element, openRemoteImageZoom: OpenRemoteImageZoom): void {
    openRemoteImageZoom(container, {
      modalDiagram: this.elements.modalDiagram,
      resetTransform: () => this.resetTransform(),
      setCurrentElement: (element) => {
        this.setCurrentElement(element);
      },
      zoomModal: this.elements.zoomModal
    });
  }

  openSvgFromContainer(container: Element): boolean {
    const svgElement = container.querySelector('svg');
    if (!svgElement) return false;

    this.elements.modalDiagram.textContent = '';
    this.resetTransform();

    const svgClone = svgElement.cloneNode(true) as SVGElement;
    styleZoomedElement(svgClone);
    this.elements.modalDiagram.appendChild(svgClone);
    this.setCurrentElement(svgClone);
    this.elements.zoomModal.classList.add('active');
    return true;
  }

  resetTransform(): void {
    this.zoomScale = 1;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
  }

  setCurrentElement(element: Element | null): void {
    this.currentElement = element;
  }

  private applyTransform(): void {
    if (this.currentElement instanceof HTMLElement || this.currentElement instanceof SVGElement) {
      this.currentElement.style.transform =
        `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomScale})`;
    }
  }

  private attach(): void {
    this.elements.closeButton.addEventListener('click', () => {
      this.close();
    });
    this.elements.zoomModal.addEventListener('click', (event) => {
      if (event.target === this.elements.zoomModal) {
        this.close();
      }
    });
    this.elements.zoomInButton.addEventListener('click', () => {
      this.zoomScale = clampZoom(this.zoomScale + BUTTON_ZOOM_STEP);
      this.applyTransform();
    });
    this.elements.zoomOutButton.addEventListener('click', () => {
      this.zoomScale = clampZoom(this.zoomScale - BUTTON_ZOOM_STEP);
      this.applyTransform();
    });
    this.elements.zoomResetButton.addEventListener('click', () => {
      this.resetTransform();
    });
    this.elements.modalDiagram.addEventListener('wheel', (event) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP;
      this.zoomScale = clampZoom(this.zoomScale + delta);
      this.applyTransform();
    }, { passive: false });
    this.elements.modalDiagram.addEventListener('mousedown', (event) => {
      this.isDragging = true;
      this.dragStart = {
        x: event.clientX - this.panX,
        y: event.clientY - this.panY
      };
      this.elements.modalDiagram.classList.add('dragging');
    });
    this.documentRef.addEventListener('mousemove', (event) => {
      if (!this.isDragging) return;
      this.panX = event.clientX - this.dragStart.x;
      this.panY = event.clientY - this.dragStart.y;
      this.applyTransform();
    });
    this.documentRef.addEventListener('mouseup', () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.elements.modalDiagram.classList.remove('dragging');
    });
    this.elements.downloadPngButton.addEventListener('click', async () => {
      if (!this.currentElement) return;
      await this.options.onDownloadPng(this.currentElement, this.elements.downloadPngButton);
    });
    this.elements.copyButton.addEventListener('click', async () => {
      if (!this.currentElement) return;
      await this.options.onCopy(this.currentElement, this.elements.copyButton);
    });
    this.elements.downloadSvgButton.addEventListener('click', () => {
      if (!this.currentElement) return;
      void this.options.onDownloadSvg(this.currentElement, this.elements.downloadSvgButton);
    });
  }
}

export function createDiagramZoomModalController(
  options: DiagramZoomModalControllerOptions
): DiagramZoomModalController | null {
  const documentRef = options.documentRef ?? document;
  const elements = getDiagramZoomModalElements(documentRef);
  return elements ? new DiagramZoomModalController(elements, options) : null;
}
