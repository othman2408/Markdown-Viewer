import {
  applyStlMaterialMode,
  resetStlViewToInitial,
  setActiveStlModeButton,
  zoomStlView,
  type StlControlsView,
  type StlImageExportView,
  type StlMaterialView,
  type StlVectorLike,
  type StlViewMode
} from './stlPreviewRuntime';

export type StlZoomModalView = StlControlsView & StlMaterialView & StlImageExportView;

export interface StlZoomModalControllerOptions<View extends StlZoomModalView = StlZoomModalView> {
  createVector: () => StlVectorLike;
  disposeView: (viewId: string) => void;
  documentRef?: Document;
  exportViewImage: (view: View, isDownload: boolean, button: HTMLElement, originalHtml: string) => void;
  modalInstanceId?: string;
  renderView: (container: HTMLElement, code: string, viewId: string) => View;
}

export interface StlZoomModalController<View extends StlZoomModalView = StlZoomModalView> {
  close: () => void;
  detach: () => void;
  getActiveView: () => View | null;
  open: (code: string) => View | null;
}

interface StlZoomModalElements {
  angleButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
  copyButton: HTMLButtonElement;
  modal: HTMLElement;
  pngButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  solidButton: HTMLButtonElement;
  viewer: HTMLElement;
  wireframeButton: HTMLButtonElement;
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
}

const DEFAULT_MODAL_INSTANCE_ID = 'stl-modal-instance';

function requireElement<T extends HTMLElement>(
  documentRef: Document,
  id: string,
  typeName: string
): T {
  const element = documentRef.getElementById(id);
  if (!element) {
    throw new Error(`Missing STL zoom modal ${typeName}: #${id}`);
  }
  return element as T;
}

function getStlZoomModalElements(documentRef: Document): StlZoomModalElements {
  return {
    angleButton: requireElement<HTMLButtonElement>(documentRef, 'stl-modal-btn-angle', 'angle button'),
    closeButton: requireElement<HTMLButtonElement>(documentRef, 'stl-zoom-modal-close', 'close button'),
    copyButton: requireElement<HTMLButtonElement>(documentRef, 'stl-modal-btn-copy', 'copy button'),
    modal: requireElement<HTMLElement>(documentRef, 'stl-zoom-modal', 'container'),
    pngButton: requireElement<HTMLButtonElement>(documentRef, 'stl-modal-btn-png', 'PNG button'),
    resetButton: requireElement<HTMLButtonElement>(documentRef, 'stl-modal-btn-zoom-reset', 'reset button'),
    solidButton: requireElement<HTMLButtonElement>(documentRef, 'stl-modal-btn-solid', 'solid button'),
    viewer: requireElement<HTMLElement>(documentRef, 'stl-modal-viewer', 'viewer'),
    wireframeButton: requireElement<HTMLButtonElement>(documentRef, 'stl-modal-btn-wireframe', 'wireframe button'),
    zoomInButton: requireElement<HTMLButtonElement>(documentRef, 'stl-modal-btn-zoom-in', 'zoom in button'),
    zoomOutButton: requireElement<HTMLButtonElement>(documentRef, 'stl-modal-btn-zoom-out', 'zoom out button')
  };
}

export function createStlZoomModalController<View extends StlZoomModalView = StlZoomModalView>(
  options: StlZoomModalControllerOptions<View>
): StlZoomModalController<View> {
  const documentRef = options.documentRef ?? document;
  const elements = getStlZoomModalElements(documentRef);
  const modalInstanceId = options.modalInstanceId ?? DEFAULT_MODAL_INSTANCE_ID;
  const modeButtons = [elements.solidButton, elements.angleButton, elements.wireframeButton];
  let activeView: View | null = null;

  const close = () => {
    elements.modal.classList.remove('active');
    options.disposeView(modalInstanceId);
    activeView = null;
    elements.viewer.innerHTML = '';
  };

  const open = (code: string): View | null => {
    elements.viewer.innerHTML = '';
    elements.modal.classList.add('active');
    activeView = options.renderView(elements.viewer, code, modalInstanceId);
    setActiveStlModeButton(modeButtons, elements.solidButton);
    return activeView;
  };

  const zoom = (factor: number) => {
    zoomStlView(activeView, factor, options.createVector);
  };

  const applyMode = (mode: StlViewMode, button: HTMLButtonElement) => {
    if (applyStlMaterialMode(activeView, mode)) {
      setActiveStlModeButton(modeButtons, button);
    }
  };

  const exportImage = (isDownload: boolean, button: HTMLButtonElement) => {
    if (activeView) {
      options.exportViewImage(activeView, isDownload, button, button.innerHTML);
    }
  };

  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === elements.modal) {
      close();
    }
  };
  const handleZoomInClick = () => zoom(0.8);
  const handleZoomOutClick = () => zoom(1.25);
  const handleResetClick = () => {
    resetStlViewToInitial(activeView);
  };
  const handleSolidClick = () => applyMode('solid', elements.solidButton);
  const handleAngleClick = () => applyMode('angle', elements.angleButton);
  const handleWireframeClick = () => applyMode('wireframe', elements.wireframeButton);
  const handleCopyClick = () => exportImage(false, elements.copyButton);
  const handlePngClick = () => exportImage(true, elements.pngButton);

  elements.closeButton.addEventListener('click', close);
  elements.modal.addEventListener('click', handleOverlayClick);
  elements.zoomInButton.addEventListener('click', handleZoomInClick);
  elements.zoomOutButton.addEventListener('click', handleZoomOutClick);
  elements.resetButton.addEventListener('click', handleResetClick);
  elements.solidButton.addEventListener('click', handleSolidClick);
  elements.angleButton.addEventListener('click', handleAngleClick);
  elements.wireframeButton.addEventListener('click', handleWireframeClick);
  elements.copyButton.addEventListener('click', handleCopyClick);
  elements.pngButton.addEventListener('click', handlePngClick);

  const detach = () => {
    elements.closeButton.removeEventListener('click', close);
    elements.modal.removeEventListener('click', handleOverlayClick);
    elements.zoomInButton.removeEventListener('click', handleZoomInClick);
    elements.zoomOutButton.removeEventListener('click', handleZoomOutClick);
    elements.resetButton.removeEventListener('click', handleResetClick);
    elements.solidButton.removeEventListener('click', handleSolidClick);
    elements.angleButton.removeEventListener('click', handleAngleClick);
    elements.wireframeButton.removeEventListener('click', handleWireframeClick);
    elements.copyButton.removeEventListener('click', handleCopyClick);
    elements.pngButton.removeEventListener('click', handlePngClick);
  };

  return {
    close,
    detach,
    getActiveView: () => activeView,
    open
  };
}
