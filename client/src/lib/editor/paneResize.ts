export const MIN_PANE_PERCENT = 20;
export const MIN_RESIZE_VIEWPORT_WIDTH = 1080;

export interface PaneLayoutElements {
  container: HTMLElement | null;
  editorPane: HTMLElement | null;
  previewPane: HTMLElement | null;
}

export function clampPanePercent(percent: number, minPercent = MIN_PANE_PERCENT): number {
  const numericPercent = Number.isFinite(percent) ? percent : 50;
  return Math.max(minPercent, Math.min(100 - minPercent, numericPercent));
}

export function getPanePercentFromClientX(clientX: number, containerRect: Pick<DOMRect, 'left' | 'width'>): number {
  if (!containerRect.width) return 50;
  return clampPanePercent(((clientX - containerRect.left) / containerRect.width) * 100);
}

export function getPaneFlex(percent: number): string {
  const ratio = clampPanePercent(percent) / 100;
  return `0 0 calc((100% - var(--dock-width, 0px)) * ${ratio} - 4px)`;
}

export function getEditorPaneFlex(editorPercent: number): string {
  return getPaneFlex(editorPercent);
}

export function getPreviewPaneFlex(editorPercent: number): string {
  return getPaneFlex(100 - clampPanePercent(editorPercent));
}

export function getPaneLayoutElements(dividerElement: Element | null): PaneLayoutElements {
  const container = dividerElement?.closest<HTMLElement>('.content-container') || null;

  return {
    container,
    editorPane: container?.querySelector<HTMLElement>('.editor-pane') || null,
    previewPane: container?.querySelector<HTMLElement>('.preview-pane') || null
  };
}

export function applyPaneFlex(elements: Pick<PaneLayoutElements, 'editorPane' | 'previewPane'>, editorPercent: number): boolean {
  if (!elements.editorPane || !elements.previewPane) return false;

  elements.editorPane.style.flex = getEditorPaneFlex(editorPercent);
  elements.previewPane.style.flex = getPreviewPaneFlex(editorPercent);
  return true;
}

export function resetPaneFlex(elements: Pick<PaneLayoutElements, 'editorPane' | 'previewPane'>): void {
  if (elements.editorPane) elements.editorPane.style.flex = '';
  if (elements.previewPane) elements.previewPane.style.flex = '';
}
