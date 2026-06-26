export interface PaneResizerBridge {
  apply(): void;
  reset(): void;
  refreshLayout(): void;
}

export interface EditorGeometryBridge {
  refreshAfterPaneLayout(): void;
}

declare global {
  interface Window {
    markdownViewerPaneResizer?: PaneResizerBridge;
    markdownViewerEditorGeometry?: EditorGeometryBridge;
  }
}
