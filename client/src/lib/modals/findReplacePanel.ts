import type { FindReplaceFloatingPosition } from './findReplace';

export interface FindReplaceDockToggleOptions {
  body?: HTMLElement;
  contentContainer: HTMLElement | null;
  currentDocked: boolean;
  dockButton: HTMLElement | null;
  documentRef?: Document;
  floatingPosition: FindReplaceFloatingPosition;
  forceFloat?: unknown;
  onDockStateChange(docked: boolean): void;
  onLayoutChange(): void;
  onPersistPreferredDocked?(docked: boolean): void;
  onWorkspaceSync?(): void;
  panel: HTMLElement | null;
  viewportWidth?: number;
}

export interface FindReplaceDockToggleResult {
  docked: boolean;
  persistedPreference: boolean | null;
}

export interface FindReplacePanelDragOptions {
  documentRef?: Document;
  handle: HTMLElement | null;
  isDocked(): boolean;
  minViewportWidth?: number;
  onPositionChange(position: Required<FindReplaceFloatingPosition>): void;
  panel: HTMLElement | null;
  viewportHeight?: () => number;
  viewportWidth?: () => number;
}

export interface FindReplacePanelDragAttachment {
  detach(): void;
}

export interface FindReplaceDockCloseOptions {
  contentContainer: HTMLElement | null;
  docked: boolean;
  onLayoutChange(): void;
  panel: HTMLElement | null;
}

function normalizeForceFloat(forceFloat: unknown): boolean {
  if (forceFloat instanceof Event) return false;
  if (forceFloat && typeof forceFloat === 'object') return false;
  return Boolean(forceFloat);
}

function getDocumentBody(documentRef: Document | undefined, body: HTMLElement | undefined): HTMLElement | null {
  return body ?? documentRef?.body ?? null;
}

function setDockButtonFloatingState(dockButton: HTMLElement): void {
  dockButton.innerHTML = '<i class="bi bi-layout-sidebar-reverse"></i>';
  dockButton.title = 'Toggle Dock Mode';
}

function setDockButtonDockedState(dockButton: HTMLElement): void {
  dockButton.innerHTML = '<i class="bi bi-window"></i>';
  dockButton.title = 'Toggle Floating Mode';
}

function applyFloatingPosition(panel: HTMLElement, position: FindReplaceFloatingPosition): void {
  panel.style.left = position.left !== null ? position.left : '';
  panel.style.top = position.top !== null ? position.top : '';
  panel.style.right = position.right !== null ? position.right : '';
}

function captureActiveElement(documentRef: Document): {
  activeId: string | null;
  selectable: boolean;
  selectionEnd: number;
  selectionStart: number;
} {
  const activeElement = documentRef.activeElement as HTMLElement & {
    selectionEnd?: number;
    selectionStart?: number;
  } | null;
  const tagName = activeElement?.tagName;
  const selectable = Boolean(activeElement && (tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA'));
  const canReadSelection = selectable && typeof activeElement?.selectionStart === 'number';

  return {
    activeId: activeElement?.id || null,
    selectable,
    selectionEnd: canReadSelection ? Number(activeElement?.selectionEnd ?? 0) : 0,
    selectionStart: canReadSelection ? Number(activeElement?.selectionStart ?? 0) : 0
  };
}

function restoreActiveElement(
  documentRef: Document,
  snapshot: ReturnType<typeof captureActiveElement>
): void {
  if (!snapshot.activeId) return;

  const element = documentRef.getElementById(snapshot.activeId) as HTMLElement & {
    selectionEnd?: number;
    selectionStart?: number;
    setSelectionRange?: (start: number, end: number) => void;
  } | null;
  if (!element) return;

  element.focus();
  if (snapshot.selectable && typeof element.selectionStart === 'number' && typeof element.setSelectionRange === 'function') {
    element.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
  }
}

function movePanelToFloating(
  panel: HTMLElement,
  dockButton: HTMLElement,
  contentContainer: HTMLElement,
  body: HTMLElement,
  floatingPosition: FindReplaceFloatingPosition
): void {
  if (panel.parentElement !== body) {
    body.appendChild(panel);
  }
  contentContainer.classList.remove('fr-docked');
  contentContainer.style.setProperty('--dock-width', '0px');
  applyFloatingPosition(panel, floatingPosition);
  setDockButtonFloatingState(dockButton);
}

function movePanelToDocked(
  panel: HTMLElement,
  dockButton: HTMLElement,
  contentContainer: HTMLElement
): void {
  panel.style.left = 'auto';
  panel.style.top = 'auto';
  panel.style.right = 'auto';
  contentContainer.appendChild(panel);
  contentContainer.classList.add('fr-docked');
  contentContainer.style.setProperty('--dock-width', '340px');
  setDockButtonDockedState(dockButton);
}

export function toggleFindReplaceDockMode(
  options: FindReplaceDockToggleOptions
): FindReplaceDockToggleResult | null {
  const documentRef = options.documentRef ?? options.panel?.ownerDocument;
  const body = getDocumentBody(documentRef, options.body);
  const { contentContainer, dockButton, panel } = options;
  if (!documentRef || !body || !panel || !dockButton || !contentContainer) return null;

  const forceFloat = normalizeForceFloat(options.forceFloat);
  const focusSnapshot = captureActiveElement(documentRef);
  const viewportWidth = options.viewportWidth ?? window.innerWidth;

  if (viewportWidth < 1080 || forceFloat) {
    movePanelToFloating(panel, dockButton, contentContainer, body, options.floatingPosition);
    options.onDockStateChange(false);
    options.onLayoutChange();
    restoreActiveElement(documentRef, focusSnapshot);
    return {
      docked: false,
      persistedPreference: null
    };
  }

  const nextDocked = !options.currentDocked;
  options.onDockStateChange(nextDocked);
  options.onPersistPreferredDocked?.(nextDocked);
  options.onWorkspaceSync?.();

  if (nextDocked) {
    movePanelToDocked(panel, dockButton, contentContainer);
  } else {
    movePanelToFloating(panel, dockButton, contentContainer, body, options.floatingPosition);
  }

  options.onLayoutChange();
  restoreActiveElement(documentRef, focusSnapshot);

  return {
    docked: nextDocked,
    persistedPreference: nextDocked
  };
}

function getPanelDragWindowValue(value: (() => number) | undefined, fallback: number): number {
  return typeof value === 'function' ? value() : fallback;
}

function eventStartedInHeaderActions(event: Event): boolean {
  const target = event.target;
  return target instanceof Element && Boolean(target.closest('.find-replace-header-actions'));
}

export function attachFindReplacePanelDrag(options: FindReplacePanelDragOptions): FindReplacePanelDragAttachment | null {
  const { handle, panel } = options;
  const documentRef = options.documentRef ?? panel?.ownerDocument;
  if (!documentRef || !handle || !panel) return null;

  let dragOffset = { x: 0, y: 0 };
  let dragging = false;
  const minViewportWidth = options.minViewportWidth ?? 768;
  const viewportWidth = () => getPanelDragWindowValue(options.viewportWidth, window.innerWidth);
  const viewportHeight = () => getPanelDragWindowValue(options.viewportHeight, window.innerHeight);

  const startDrag = (clientX: number, clientY: number): void => {
    dragging = true;
    dragOffset = {
      x: clientX - panel.offsetLeft,
      y: clientY - panel.offsetTop
    };
    documentRef.body.classList.add('resizing');
  };

  const moveDrag = (clientX: number, clientY: number): void => {
    const x = clientX - dragOffset.x;
    const y = clientY - dragOffset.y;
    const maxX = viewportWidth() - panel.offsetWidth;
    const maxY = viewportHeight() - panel.offsetHeight;
    const position = {
      left: `${Math.max(0, Math.min(maxX, x))}px`,
      right: 'auto',
      top: `${Math.max(0, Math.min(maxY, y))}px`
    };

    panel.style.left = position.left;
    panel.style.top = position.top;
    panel.style.right = position.right;
    options.onPositionChange(position);
  };

  const stopDrag = (): void => {
    if (!dragging) return;
    dragging = false;
    documentRef.body.classList.remove('resizing');
  };

  const handleMouseDown = (event: MouseEvent): void => {
    if (options.isDocked()) return;
    if (viewportWidth() < minViewportWidth) return;
    if (eventStartedInHeaderActions(event)) return;
    startDrag(event.clientX, event.clientY);
  };
  const handleMouseMove = (event: MouseEvent): void => {
    if (!dragging || options.isDocked()) return;
    moveDrag(event.clientX, event.clientY);
  };
  const handleTouchStart = (event: TouchEvent): void => {
    if (options.isDocked()) return;
    if (viewportWidth() < minViewportWidth) return;
    if (eventStartedInHeaderActions(event)) return;
    const touch = event.touches?.[0];
    if (touch) {
      startDrag(touch.clientX, touch.clientY);
    }
  };
  const handleTouchMove = (event: TouchEvent): void => {
    if (!dragging || options.isDocked()) return;
    const touch = event.touches?.[0];
    if (touch) {
      moveDrag(touch.clientX, touch.clientY);
    }
  };

  handle.addEventListener('mousedown', handleMouseDown);
  documentRef.addEventListener('mousemove', handleMouseMove);
  documentRef.addEventListener('mouseup', stopDrag);
  handle.addEventListener('touchstart', handleTouchStart, { passive: true });
  documentRef.addEventListener('touchmove', handleTouchMove, { passive: true });
  documentRef.addEventListener('touchend', stopDrag);

  return {
    detach() {
      handle.removeEventListener('mousedown', handleMouseDown);
      documentRef.removeEventListener('mousemove', handleMouseMove);
      documentRef.removeEventListener('mouseup', stopDrag);
      handle.removeEventListener('touchstart', handleTouchStart);
      documentRef.removeEventListener('touchmove', handleTouchMove);
      documentRef.removeEventListener('touchend', stopDrag);
      stopDrag();
    }
  };
}

export function resetFindReplaceDockLayoutOnClose(options: FindReplaceDockCloseOptions): boolean {
  if (!options.panel || !options.docked || !options.contentContainer) return false;

  options.contentContainer.classList.remove('fr-docked');
  options.contentContainer.style.setProperty('--dock-width', '0px');
  options.onLayoutChange();

  return true;
}
