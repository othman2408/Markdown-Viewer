export type MarkdownViewerDomRefs = {
  aboutModal: HTMLElement | null;
  aboutModalClose: HTMLElement | null;
  aboutModalCloseIcon: HTMLElement | null;
  aboutVersion: HTMLElement | null;
  clearFormattingCancel: HTMLElement | null;
  clearFormattingClose: HTMLElement | null;
  clearFormattingConfirm: HTMLElement | null;
  clearFormattingModal: HTMLElement | null;
  contentContainer: HTMLElement | null;
  copyMarkdownButton: HTMLElement | null;
  directionToggle: HTMLElement | null;
  dragOverlay: HTMLElement | null;
  editorHighlightLayer: HTMLElement | null;
  editorPane: HTMLTextAreaElement | null;
  editorPaneContainer: HTMLElement | null;
  exportHtml: HTMLElement | null;
  exportMd: HTMLElement | null;
  exportPdf: HTMLElement | null;
  exportPng: HTMLElement | null;
  fileInput: HTMLInputElement | null;
  findReplaceClose: HTMLElement | null;
  findReplaceCloseIcon: HTMLElement | null;
  findReplaceDiffToggle: HTMLInputElement | null;
  findReplaceDock: HTMLElement | null;
  findReplaceDragHandle: HTMLElement | null;
  findReplaceHistory: HTMLSelectElement | null;
  findReplaceInput: HTMLInputElement | null;
  findReplaceModal: HTMLElement | null;
  findReplaceScope: HTMLSelectElement | null;
  findReplaceWith: HTMLInputElement | null;
  githubImportCancelBtn: HTMLElement | null;
  githubImportError: HTMLElement | null;
  githubImportFileSelect: HTMLSelectElement | null;
  githubImportModal: HTMLElement | null;
  githubImportSelectAllBtn: HTMLElement | null;
  githubImportSelectedCount: HTMLElement | null;
  githubImportSelectionToolbar: HTMLElement | null;
  githubImportSubmitBtn: HTMLElement | null;
  githubImportTitle: HTMLElement | null;
  githubImportTree: HTMLElement | null;
  githubImportUrlInput: HTMLInputElement | null;
  helpModal: HTMLElement | null;
  helpModalClose: HTMLElement | null;
  helpModalCloseIcon: HTMLElement | null;
  lineNumbers: HTMLElement | null;
  markdownEditor: HTMLTextAreaElement | null;
  markdownFormatToolbar: HTMLElement | null;
  markdownPreview: HTMLElement | null;
  mobileExportPdf: HTMLElement | null;
  mobileExportPng: HTMLElement | null;
  previewPane: HTMLElement | null;
};

function byId<T extends HTMLElement = HTMLElement>(documentRef: Document, id: string): T | null {
  return documentRef.getElementById(id) as T | null;
}

function query<T extends Element = Element>(documentRef: Document, selector: string): T | null {
  return documentRef.querySelector(selector) as T | null;
}

export function collectMarkdownViewerDomRefs(
  documentRef: Document = document
): MarkdownViewerDomRefs {
  const markdownEditor = byId<HTMLTextAreaElement>(documentRef, 'markdown-editor');

  return {
    aboutModal: byId(documentRef, 'about-modal'),
    aboutModalClose: byId(documentRef, 'about-modal-close'),
    aboutModalCloseIcon: byId(documentRef, 'about-modal-close-icon'),
    aboutVersion: byId(documentRef, 'about-version'),
    clearFormattingCancel: byId(documentRef, 'clear-formatting-cancel'),
    clearFormattingClose: byId(documentRef, 'clear-formatting-close'),
    clearFormattingConfirm: byId(documentRef, 'clear-formatting-confirm'),
    clearFormattingModal: byId(documentRef, 'clear-formatting-modal'),
    contentContainer: query<HTMLElement>(documentRef, '.content-container'),
    copyMarkdownButton: byId(documentRef, 'copy-markdown-button'),
    directionToggle: byId(documentRef, 'direction-toggle'),
    dragOverlay: byId(documentRef, 'drag-overlay'),
    editorHighlightLayer: byId(documentRef, 'editor-highlight-layer'),
    editorPane: markdownEditor,
    editorPaneContainer: query<HTMLElement>(documentRef, '.editor-pane'),
    exportHtml: byId(documentRef, 'export-html'),
    exportMd: byId(documentRef, 'export-md'),
    exportPdf: byId(documentRef, 'export-pdf'),
    exportPng: byId(documentRef, 'export-png'),
    fileInput: byId<HTMLInputElement>(documentRef, 'file-input'),
    findReplaceClose: byId(documentRef, 'find-replace-close'),
    findReplaceCloseIcon: byId(documentRef, 'find-replace-close-icon'),
    findReplaceDiffToggle: byId<HTMLInputElement>(documentRef, 'find-replace-diff-toggle'),
    findReplaceDock: byId(documentRef, 'find-replace-dock'),
    findReplaceDragHandle: byId(documentRef, 'find-replace-drag-handle'),
    findReplaceHistory: byId<HTMLSelectElement>(documentRef, 'find-replace-history'),
    findReplaceInput: byId<HTMLInputElement>(documentRef, 'find-replace-input'),
    findReplaceModal: byId(documentRef, 'find-replace-modal'),
    findReplaceScope: byId<HTMLSelectElement>(documentRef, 'find-replace-scope'),
    findReplaceWith: byId<HTMLInputElement>(documentRef, 'find-replace-with'),
    githubImportCancelBtn: byId(documentRef, 'github-import-cancel'),
    githubImportError: byId(documentRef, 'github-import-error'),
    githubImportFileSelect: byId<HTMLSelectElement>(documentRef, 'github-import-file-select'),
    githubImportModal: byId(documentRef, 'github-import-modal'),
    githubImportSelectAllBtn: byId(documentRef, 'github-import-select-all'),
    githubImportSelectedCount: byId(documentRef, 'github-import-selected-count'),
    githubImportSelectionToolbar: byId(documentRef, 'github-import-selection-toolbar'),
    githubImportSubmitBtn: byId(documentRef, 'github-import-submit'),
    githubImportTitle: byId(documentRef, 'github-import-title'),
    githubImportTree: byId(documentRef, 'github-import-tree'),
    githubImportUrlInput: byId<HTMLInputElement>(documentRef, 'github-import-url'),
    helpModal: byId(documentRef, 'help-modal'),
    helpModalClose: byId(documentRef, 'help-modal-close'),
    helpModalCloseIcon: byId(documentRef, 'help-modal-close-icon'),
    lineNumbers: byId(documentRef, 'line-numbers'),
    markdownEditor,
    markdownFormatToolbar: byId(documentRef, 'markdown-format-toolbar'),
    markdownPreview: byId(documentRef, 'markdown-preview'),
    mobileExportPdf: byId(documentRef, 'mobile-export-pdf'),
    mobileExportPng: byId(documentRef, 'mobile-export-png'),
    previewPane: query<HTMLElement>(documentRef, '.preview-pane')
  };
}
