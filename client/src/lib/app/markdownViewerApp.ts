// @ts-nocheck
import { syncCloudState, syncEditorState, syncModalState, syncUiState, syncWorkspaceState } from '../state/stateBridge';
import { createEditorInputSnapshot } from '../editor/inputSnapshot';
import { attachEditorTextareaController } from '../editor/textareaController';
import { attachEditorLayoutController } from '../editor/layoutController';
import { createSyncScrollController } from '../editor/syncScrollController';
import { createScreenReaderAnnouncer } from '../a11y/screenReaderAnnouncer';
import { createAbcPlaybackRuntime } from '../diagrams/abcPlaybackRuntime';
import { createDiagramToolbarRuntime } from '../diagrams/diagramToolbarRuntime';
import {
  attachMarkdownFileInputController,
  importMarkdownFileToTab,
  isMarkdownUploadFile
} from '../files/markdownImport';
import {
  copyMarkdownDocument,
  exportMarkdownDocument,
  openImportGithubAction,
  openShareAction,
  triggerFileImport
} from '../header/documentActions';
import { createAppModalLifecycle } from '../modals/appModalLifecycle';
import {
  attachDocumentModalControls,
  openAboutDocumentModal,
  openDocumentModal
} from '../modals/documentModalControls';
import {
  findTabById,
  updateTabInList
} from '../workspace/actions';
import {
  attachFileDragDropController,
  createFileDragDropController
} from '../editor/dragDrop';
import { attachAppKeyboardShortcutController } from '../editor/appKeyboardShortcuts';
import {
  extractReferenceDefinitions,
  toTitleCase
} from '../markdown/editing';
import { createEmojiPostProcessor } from '../markdown/emojiPostProcessing';
import { createPreviewRenderState } from '../preview/previewRenderState';
import {
  getPreviewRenderDelay
} from '../preview/previewTiming';
import {
  createGitHubImportClient
} from '../modals/githubImport';
import { attachPreviewLinkClickController } from '../preview/linkClicks';
import { createGitHubImportModalController } from '../modals/githubImportModalController';
import { attachGitHubImportModalControls } from '../modals/githubImportModal';
import {
  APP_VERSION,
  FIND_REFRESH_DELAY,
  FIND_REPLACE_DOCKED_KEY,
  HUGE_DOCUMENT_THRESHOLD,
  HUGE_EDITOR_WORK_DELAY,
  HUGE_RENDER_DELAY,
  LARGE_DOCUMENT_THRESHOLD,
  LARGE_EDITOR_WORK_DELAY,
  LARGE_FIND_REFRESH_DELAY,
  LARGE_RENDER_DELAY,
  RENDER_DELAY,
  SCROLL_SYNC_DELAY
} from '../config/appConfig';
import { collectMarkdownViewerDomRefs } from './domRefs';
import {
  initializeCoreLibraryRuntime,
  initializeGlobalPreferencesRuntime,
  initializeWorkspaceRuntime,
  readDefaultMarkdownDocument
} from './bootstrap';
import {
  applyPaneWidthsFromBridge,
  registerEditorGeometryBridge,
  registerHeaderActionBridge,
  registerAuthBridge,
  registerMarkdownToolbarBridge,
  registerShareBridge,
  registerSyncScrollBridge,
  registerThemeBridge,
  registerViewModeBridge,
  registerWorkspaceTabBridge,
  resetPaneWidthsFromBridge
} from './commandBridge';
import { createWorkspacePersistenceRuntime } from './workspacePersistence';
import { createEditorHistoryRuntime } from './editorHistoryRuntime';
import { createMarkdownRendererRuntime } from '../markdown/rendererRuntime';
import { createEditorLayoutRuntime } from './editorLayoutRuntime';
import { createThemeRuntime } from './themeRuntime';
import { createShareRuntime } from './shareRuntime';
import { createMarkdownEditingRuntime } from './markdownEditingRuntime';
import { createExportRuntime } from './exportRuntime';
import { createInsertModalRuntime } from './insertModalRuntime';
import { createFindReplaceRuntime } from './findReplaceRuntime';
import { createWorkspaceTabsRuntime } from './workspaceTabsRuntime';
import { createPreviewRuntime } from './previewRuntime';

type Detachable = {
  detach(): void;
};

export type MarkdownViewerAppRuntime = {
  destroy(): void;
};

export type MarkdownViewerAppOptions = {
  onLogout?: () => void | Promise<void>;
};

export async function startMarkdownViewerApp(options: MarkdownViewerAppOptions = {}): Promise<MarkdownViewerAppRuntime | null> {
  const cleanupCallbacks: Array<() => void> = [];
  const addCleanup = (cleanup: Detachable | (() => void) | null | undefined): void => {
    if (!cleanup) return;
    cleanupCallbacks.push(typeof cleanup === 'function' ? cleanup : () => cleanup.detach());
  };
  let tabs = [];
  let activeTabId = null;
  let untitledCounter = 0;
  let workspaceTabsRuntime = null;
  function getWorkspacePayload() {
    return {
      tabs,
      activeTabId,
      untitledCounter,
      globalState: globalPreferences.load(),
      findReplaceDocked: readStorageItem(FIND_REPLACE_DOCKED_KEY) === 'true'
    };
  }
  function syncWorkspaceSnapshot() {
    syncWorkspaceState(getWorkspacePayload());
  }
  const {
    cloudApi,
    cloudStorage,
    cloudWorkspace,
    flushCloudWorkspaceSave,
    isCloudSharePage,
    readStorageItem,
    saveStorageItem,
    syncCloudStateSnapshot,
    workspaceStorage
  } = await initializeWorkspaceRuntime({ getWorkspacePayload });
  const libraryRuntime = await initializeCoreLibraryRuntime({
    alertFn: alert,
    consoleRef: console
  });
  if (!libraryRuntime) return null;
  const { CDN, loadScript, loadStyle } = libraryRuntime;
  const {
    stopActiveAbcPlayback,
    toggleAbcPlay
  } = createAbcPlaybackRuntime({
    alertRef: alert,
    consoleRef: console,
    documentRef: document,
    getABCJS: () => typeof ABCJS === 'undefined' ? undefined : ABCJS
  });
  let markdownRenderTimeout = null;
  let currentViewMode = 'split'; // 'editor', 'split', or 'preview'
  const appModalLifecycle = createAppModalLifecycle({ syncModalState });
  let findReplaceRuntime = null;
  let previewRuntime = null;
  const {
    aboutModal,
    aboutModalClose,
    aboutModalCloseIcon,
    aboutVersion,
    clearFormattingCancel,
    clearFormattingClose,
    clearFormattingConfirm,
    clearFormattingModal,
    contentContainer,
    copyMarkdownButton,
    directionToggle,
    dragOverlay,
    editorHighlightLayer,
    editorPane,
    editorPaneContainer,
    exportHtml,
    exportMd,
    exportPdf,
    exportPng,
    fileInput,
    findReplaceClose,
    findReplaceCloseIcon,
    findReplaceDiffToggle,
    findReplaceDock,
    findReplaceDragHandle,
    findReplaceHistory,
    findReplaceInput,
    findReplaceModal,
    findReplaceScope,
    findReplaceWith,
    githubImportCancelBtn,
    githubImportError,
    githubImportFileSelect,
    githubImportModal,
    githubImportSelectAllBtn,
    githubImportSelectedCount,
    githubImportSelectionToolbar,
    githubImportSubmitBtn,
    githubImportTitle,
    githubImportTree,
    githubImportUrlInput,
    helpModal,
    helpModalClose,
    helpModalCloseIcon,
    lineNumbers,
    markdownEditor,
    markdownFormatToolbar,
    markdownPreview,
    mobileExportPdf,
    mobileExportPng,
    previewPane
  } = collectMarkdownViewerDomRefs(document);
  if (aboutVersion) {
    aboutVersion.textContent = APP_VERSION;
  }
  const {
    addD2Toolbars,
    addGraphvizToolbars,
    addMermaidToolbars,
    addPlantumlToolbars,
    closeMermaidModal,
    copyAbcImage,
    downloadAbcPng,
    downloadAbcSvg
  } = createDiagramToolbarRuntime({
    consoleRef: console,
    documentRef: document,
    markdownPreview,
    writeClipboard: (items) => navigator.clipboard.write(items)
  });
  function clearCloudWorkspaceSnapshot() {
    cloudWorkspace.clearWorkspaceSnapshot();
    syncWorkspaceSnapshot();
  }
  async function handleLogout(event) {
    if (event) event.preventDefault();
    if (!cloudStorage.enabled) return;
    syncCloudState({ logoutInFlight: true });
    try {
      captureActiveTabState();
      workspaceSaveScheduler.clearPendingSave();
      clearTimeout(cloudStorage.saveTimer);
      await cloudApi('/api/workspace', {
        method: 'PUT',
        body: JSON.stringify(getWorkspacePayload())
      });
    } catch (error) {
      console.warn('Final workspace save before logout failed:', error);
    }
    try {
      await cloudApi('/api/logout', { method: 'POST' });
      clearCloudWorkspaceSnapshot();
      syncCloudState({
        enabled: false,
        csrfToken: null,
        logoutInFlight: false,
        saveInFlight: false,
        saveQueued: false
      });
      if (options.onLogout) {
        await options.onLogout();
      } else {
        window.location.href = '/login';
      }
    } catch (error) {
      console.warn('Logout failed:', error);
      syncCloudState({ logoutInFlight: false });
      syncCloudStateSnapshot();
    }
  }
  syncCloudStateSnapshot();
  registerAuthBridge({
    closeMobileMenu,
    logout: handleLogout
  }, window);
  registerHeaderActionBridge({
    copyMarkdown(event) {
      void copyMarkdownDocument({
        event,
        markdown: markdownEditor.value,
        button: copyMarkdownButton
      });
    },
    exportHtml(event) {
      handleExportHtml(event);
    },
    exportMarkdown(event) {
      exportMarkdownDocument({
        event,
        markdown: markdownEditor.value,
        filename: getExportFilename("md", "document.md"),
        saveAs
      });
    },
    exportPdf(event) {
      return handleExportPdf(event);
    },
    exportPng(event) {
      return handleExportPng(event);
    },
    importFile(event) {
      triggerFileImport(fileInput, event);
    },
    importGithub(event, variant) {
      openImportGithubAction({
        event,
        variant,
        closeMobileMenu,
        openGitHubImportModal
      });
    },
    share(event) {
      openShareAction({ event, openShareModal });
    }
  }, window);
  // ========================================
  // GLOBAL STATE (persisted across reloads)
  // ========================================
  const emojiPostProcessor = createEmojiPostProcessor({
    consoleRef: console,
    getJoypixels: () => typeof joypixels === 'undefined' ? undefined : joypixels,
    joypixelsCssUrl: CDN.joypixels_css,
    joypixelsScriptUrl: CDN.joypixels,
    loadScript,
    loadStyle,
    renderMarkdown(options) {
      renderMarkdown(options);
    }
  });
  const {
    contentDirectionController,
    globalPreferences
  } = initializeGlobalPreferencesRuntime({
    documentRef: document,
    readStorageItem,
    saveStorageItem,
    syncEditorState,
    syncUiState,
    syncWorkspaceState: syncWorkspaceSnapshot,
    windowRef: window
  });
  const {
    escapeHtmlAttribute,
    sanitizePreviewHtml
  } = createMarkdownRendererRuntime({
    getDomPurify: () => typeof DOMPurify === "undefined" ? undefined : DOMPurify,
    highlightRef: hljs,
    markedRef: marked
  });
  const previewRenderState = createPreviewRenderState();
  const {
    initMermaid,
    toggleTheme
  } = createThemeRuntime({
    addMermaidToolbars,
    documentRef: document,
    getMermaid: () => typeof mermaid === 'undefined' ? undefined : mermaid,
    globalPreferences,
    markdownPreview,
    previewRenderState,
    syncUiState,
    updateMapThemes,
    updateStlThemes
  });
  const {
    handleExportHtml,
    handleExportPdf,
    handleExportPng
  } = createExportRuntime({
    alertRef: alert,
    cdn: CDN,
    consoleRef: console,
    documentRef: document,
    editor: markdownEditor,
    exportButtons: {
      mobilePdf: mobileExportPdf,
      mobilePng: mobileExportPng,
      pdf: exportPdf,
      png: exportPng
    },
    getABCJS: () => typeof ABCJS === 'undefined' ? undefined : ABCJS,
    getDomPurify: () => DOMPurify,
    getExportFilename,
    getHtml2Canvas: () => typeof html2canvas === 'undefined' ? undefined : html2canvas,
    getJsPdf: () => typeof jspdf === 'undefined' ? undefined : jspdf,
    getMarked: () => marked,
    getMathJax: () => window.MathJax,
    getMermaid: () => typeof mermaid === 'undefined' ? undefined : mermaid,
    initMermaid,
    jsYaml: jsyaml,
    loadScript,
    saveAs
  });
  const previewRenderDelayOptions = {
    largeDocumentThreshold: LARGE_DOCUMENT_THRESHOLD,
    hugeDocumentThreshold: HUGE_DOCUMENT_THRESHOLD,
    renderDelay: RENDER_DELAY,
    largeRenderDelay: LARGE_RENDER_DELAY,
    hugeRenderDelay: HUGE_RENDER_DELAY
  };
  const {
    getScrollSnapshot,
    initEditorGeometry,
    refreshEditorWidth,
    scheduleEditorOverlayScrollSync,
    scheduleLineNumberUpdate,
    scrollActiveMatchIntoView,
    setScrollSnapshot,
    syncEditorScrollOverlays,
    syncHighlightScroll,
    updateLineNumbers
  } = createEditorLayoutRuntime({
    documentRef: document,
    editor: markdownEditor,
    editorHighlightLayer,
    isEditorVisible,
    lineNumbers,
    syncEditorState,
    updateFindHighlights,
    windowRef: window
  });
  const {
    activateTabHistory: initTabHistory,
    deleteTabHistory,
    executeRedo,
    executeUndo,
    handleKeystrokeHistory,
    markProgrammaticInput,
    pushProgrammaticHistoryState,
    resetTypingHistoryState,
    updateLastCursor,
    updateUndoRedoButtons
  } = createEditorHistoryRuntime({
    editor: markdownEditor,
    getActiveTabId: () => activeTabId,
    saveCurrentTabState,
    syncEditorState
  });
  const {
    applyClearFormatting,
    applyMarkdownList,
    handleListEnter,
    insertAlignmentBlock,
    insertMarkdownBlock,
    replaceEditorRange,
    transformEditorLines,
    transformSelectionOrCurrentLine,
    wrapEditorSelection
  } = createMarkdownEditingRuntime({
    editor: markdownEditor,
    markProgrammaticInput,
    pushProgrammaticHistoryState,
    renderMarkdown,
    saveCurrentTabState,
    updateFindHighlights,
    updateLineNumbers
  });
  const {
    cleanupImageObjectUrls,
    insertMarkdownImage,
    insertMarkdownLink,
    insertMarkdownReference,
    openAlertModal,
    openEmojiModal,
    openSymbolsModal,
    openTableModal
  } = createInsertModalRuntime({
    alertRef: alert,
    announce: announceToScreenReader,
    cloudApi,
    cloudStorage,
    consoleRef: console,
    documentRef: document,
    editor: markdownEditor,
    emojiPostProcessor,
    getTrackedContents() {
      const contents = [markdownEditor.value];
      if (Array.isArray(tabs)) {
        tabs.forEach(function(tab) {
          if (tab && typeof tab.content === 'string' && tab.content) {
            contents.push(tab.content);
          }
        });
      }
      return contents;
    },
    insertMarkdownBlock,
    replaceEditorRange,
    requestFrame: requestAnimationFrame,
    windowRef: window
  });
  previewRuntime = createPreviewRuntime({
    addD2Toolbars,
    addGraphvizToolbars,
    addMermaidToolbars,
    addPlantumlToolbars,
    cancelAnimationFrameFn: cancelAnimationFrame,
    cdn: CDN,
    cleanupImageObjectUrls,
    consoleRef: console,
    copyAbcImage,
    devicePixelRatio: window.devicePixelRatio,
    documentRef: document,
    domPurify: DOMPurify,
    downloadAbcPng,
    downloadAbcSvg,
    editor: markdownEditor,
    escapeHtmlAttribute,
    getABCJS: () => typeof ABCJS === 'undefined' ? undefined : ABCJS,
    getActivePreviewDocumentId,
    getLeaflet: () => typeof L === 'undefined' ? undefined : L,
    getMermaid: () => typeof mermaid === 'undefined' ? undefined : mermaid,
    getPako: () => typeof pako === 'undefined' ? undefined : pako,
    getTHREE: () => typeof THREE === 'undefined' ? undefined : THREE,
    getTheme: () => document.documentElement.getAttribute("data-theme") || 'light',
    getTopojson: () => typeof topojson === 'undefined' ? undefined : topojson,
    initMermaid,
    jsYaml: jsyaml,
    loadScript,
    loadStyle,
    marked,
    markdownPreview,
    previewPane,
    previewRenderState,
    processEmojis,
    requestAnimationFrameFn: requestAnimationFrame,
    sanitizePreviewHtml,
    scheduleLineNumberUpdate,
    stopActiveAbcPlayback,
    toggleAbcPlay,
    updateDocumentStats,
    updateFindHighlights,
    windowRef: window,
    writeClipboard: (items) => navigator.clipboard.write(items)
  });
  const sampleMarkdown = readDefaultMarkdownDocument(document);
  if (!markdownEditor.value) {
    markdownEditor.value = sampleMarkdown;
  }
  // ========================================
  // DOCUMENT TABS & SESSION MANAGEMENT
  // ========================================
  function getExportFilename(extension, fallback) {
    return workspaceTabsRuntime ? workspaceTabsRuntime.getExportFilename(extension, fallback) : fallback;
  }
  const {
    detachLifecycleFlush,
    loadActiveTabId,
    loadTabsFromStorage,
    loadUntitledCounter,
    saveActiveTabId,
    saveTabsToStorage,
    saveUntitledCounter,
    workspaceSaveScheduler
  } = createWorkspacePersistenceRuntime({
    captureActiveTabState,
    cloudStorage,
    documentRef: document,
    flushCloudWorkspaceSave,
    getTabs: () => tabs,
    syncWorkspaceState: syncWorkspaceSnapshot,
    windowRef: window,
    workspaceStorage
  });
  addCleanup(detachLifecycleFlush);
  workspaceTabsRuntime = createWorkspaceTabsRuntime({
    alertRef: alert,
    closeAppModal,
    documentRef: document,
    editor: markdownEditor,
    editorPaneContainer,
    getCurrentViewMode: () => currentViewMode || 'split',
    history: {
      deleteTabHistory,
      initTabHistory,
      resetTypingHistoryState,
      updateUndoRedoButtons
    },
    openAppModal,
    persistence: {
      loadActiveTabId,
      loadTabsFromStorage,
      loadUntitledCounter,
      saveActiveTabId,
      saveTabsToStorage,
      saveUntitledCounter
    },
    renderMarkdown,
    requestFrame: requestAnimationFrame,
    resetCurrentViewMode() {
      currentViewMode = null;
    },
    sampleMarkdown,
    setViewMode,
    state: {
      getActiveTabId: () => activeTabId,
      getTabs: () => tabs,
      getUntitledCounter: () => untitledCounter,
      setActiveTabId(value) {
        activeTabId = value;
      },
      setTabs(value) {
        tabs = value;
      },
      setUntitledCounter(value) {
        untitledCounter = value;
      }
    },
    syncWorkspaceState: syncWorkspaceSnapshot
  });
  function getActiveEditorSnapshot() {
    return workspaceTabsRuntime.getActiveEditorSnapshot();
  }
  function closeTabMenus() {
    workspaceTabsRuntime.closeTabMenus();
  }
  function reorderSvelteTabs(draggedTabId, targetTabId) {
    workspaceTabsRuntime.reorderTabs(draggedTabId, targetTabId);
  }
  function renderTabBar(tabsArr, currentActiveTabId) {
    workspaceTabsRuntime.renderTabBar(tabsArr, currentActiveTabId);
  }
  function captureActiveTabState() {
    if (workspaceTabsRuntime) workspaceTabsRuntime.captureActiveTabState();
  }
  function saveCurrentTabState() {
    if (workspaceTabsRuntime) workspaceTabsRuntime.saveCurrentTabState();
  }
  function switchTab(tabId) {
    workspaceTabsRuntime.switchTab(tabId);
  }
  function newTab(content, title) {
    workspaceTabsRuntime.newTab(content, title);
  }
  function closeTab(tabId) {
    workspaceTabsRuntime.closeTab(tabId);
  }
  function deleteTab(tabId) {
    workspaceTabsRuntime.deleteTab(tabId);
  }
  function renameTab(tabId) {
    workspaceTabsRuntime.renameTab(tabId);
  }
  function duplicateTab(tabId) {
    workspaceTabsRuntime.duplicateTab(tabId);
  }
  function resetAllTabs() {
    workspaceTabsRuntime.resetAllTabs();
  }
  function initTabs() {
    workspaceTabsRuntime.initTabs();
  }
  function getActivePreviewDocumentId() {
    return workspaceTabsRuntime ? workspaceTabsRuntime.getActivePreviewDocumentId() : '__single-document__';
  }
  registerWorkspaceTabBridge({
    closeMobileMenu,
    closeTabMenus,
    createTab: newTab,
    deleteTab,
    duplicateTab,
    renameTab,
    reorderTabs: reorderSvelteTabs,
    resetTabs: resetAllTabs,
    selectTab: switchTab
  }, window);
  function clearPendingPreviewWork() {
    if (previewRuntime) previewRuntime.clearPendingPreviewWork();
  }
  function isEditorVisible() {
    return currentViewMode === 'editor' || currentViewMode === 'split';
  }
  function updateMapThemes() {
    if (previewRuntime) previewRuntime.updateMapThemes();
  }
  function updateStlThemes() {
    if (previewRuntime) previewRuntime.updateStlThemes();
  }
  function renderMarkdown(options) {
    if (previewRuntime) previewRuntime.renderMarkdown(options);
  }
  function importMarkdownFile(file) {
    void importMarkdownFileToTab(file, {
      createTab: newTab,
      alertRef: alert
    });
  }
  const screenReaderAnnouncer = createScreenReaderAnnouncer({
    documentRef: document
  });
  function announceToScreenReader(message) {
    screenReaderAnnouncer.announce(message);
  }
  const githubImportController = createGitHubImportModalController({
    announce: announceToScreenReader,
    client: createGitHubImportClient(),
    closeAppModal,
    consoleRef: console,
    elements: {
      cancelButton: githubImportCancelBtn,
      error: githubImportError,
      fileSelect: githubImportFileSelect,
      modal: githubImportModal,
      selectAllButton: githubImportSelectAllBtn,
      selectedCount: githubImportSelectedCount,
      selectionToolbar: githubImportSelectionToolbar,
      submitButton: githubImportSubmitBtn,
      title: githubImportTitle,
      tree: githubImportTree,
      urlInput: githubImportUrlInput
    },
    importDocument(markdown, title) {
      newTab(markdown, title);
    },
    openAppModal
  });
  function openGitHubImportModal() {
    githubImportController.open();
  }
  function processEmojis(element) {
    emojiPostProcessor.process(element);
  }
  function debouncedRender() {
    clearTimeout(markdownRenderTimeout);
    const delay = getPreviewRenderDelay(markdownEditor.value, previewRenderDelayOptions);
    markdownRenderTimeout = setTimeout(function() {
      renderMarkdown({ reason: 'edit' });
    }, delay);
  }
  function updateDocumentStats() {
    syncEditorState(createEditorInputSnapshot(markdownEditor, { includeStats: true }));
  }
  const syncScrollController = createSyncScrollController({
    editor: markdownEditor,
    initialEnabled: globalPreferences.load().syncScrollingEnabled !== false,
    persistEnabled(enabled) {
      globalPreferences.save({ syncScrollingEnabled: enabled });
    },
    previewPane,
    syncEditorScrollOverlays,
    syncState(enabled) {
      syncEditorState({ syncScrollingEnabled: enabled });
    }
  });
  function syncEditorToPreview() {
    syncScrollController.syncEditorToPreview();
  }
  function syncPreviewToEditor() {
    syncScrollController.syncPreviewToEditor();
  }
  function toggleSyncScrolling() {
    syncScrollController.toggle();
  }
  registerSyncScrollBridge({ toggleSyncScrolling }, window);
  function setViewMode(mode) {
    if (mode === currentViewMode) return;
    const previousMode = currentViewMode;
    currentViewMode = mode;
    updateSyncToggleVisibility(mode);
    if (mode === 'split') {
      // Restore preserved pane widths when entering split mode
      applyPaneWidths();
    } else {
      // Reset inline pane widths when not in split mode
      resetPaneWidths();
    }
    // Re-render markdown when switching to a view that includes preview
    if (mode === 'split' || mode === 'preview') {
      renderMarkdown({ reason: 'view-switch' });
    }
    if (mode === 'split' || mode === 'editor') {
      refreshEditorWidth();
      scheduleLineNumberUpdate({ force: true });
      updateFindHighlights();
      scheduleEditorOverlayScrollSync();
    }
    syncEditorState({ direction: contentDirectionController.getDirection() });
    syncUiState({ viewMode: mode });
    syncEditorState({ viewMode: mode });
  }
  function resolveViewToggleMode(mode) {
    if ((mode === 'editor' || mode === 'preview') && currentViewMode === mode) {
      return 'split';
    }
    return mode;
  }
  function updateSyncToggleVisibility(mode) {
    syncUiState({ viewMode: mode });
    syncEditorState({ viewMode: mode });
  }
  registerViewModeBridge({
    closeMobileMenu,
    resolveDesktopMode: resolveViewToggleMode,
    saveCurrentTabState,
    setViewMode
  }, window);
  function openAppModal(modal, options = {}) {
    appModalLifecycle.open(modal, options);
  }
  function closeAppModal(modal) {
    appModalLifecycle.close(modal);
  }
  function getFindReplaceOpen() {
    return findReplaceRuntime ? findReplaceRuntime.getFindOpen() : false;
  }
  function getFindReplaceDocked() {
    return findReplaceRuntime ? findReplaceRuntime.getFindDocked() : false;
  }
  function updateFindHighlights() {
    if (findReplaceRuntime) findReplaceRuntime.updateFindHighlights();
  }
  function scheduleFindRefresh(options) {
    if (findReplaceRuntime) findReplaceRuntime.scheduleFindRefresh(options);
  }
  function openFindReplaceModal() {
    if (findReplaceRuntime) findReplaceRuntime.openFindReplaceModal();
  }
  function closeFindReplaceModal() {
    if (findReplaceRuntime) findReplaceRuntime.closeFindReplaceModal();
  }
  function toggleFrDockMode(forceFloat = false) {
    if (findReplaceRuntime) findReplaceRuntime.toggleDockMode(forceFloat);
  }
  function constrainFloatingPanelPosition() {
    if (findReplaceRuntime) findReplaceRuntime.constrainFloatingPanelPosition();
  }
  function initFindReplaceModal() {
    if (findReplaceRuntime) findReplaceRuntime.initFindReplaceModal();
  }
  findReplaceRuntime = createFindReplaceRuntime({
    alertRef: alert,
    applyPaneWidths,
    closeAppModal,
    consoleRef: console,
    contentContainer,
    documentRef: document,
    dockedStorageKey: FIND_REPLACE_DOCKED_KEY,
    editor: markdownEditor,
    editorHighlightLayer,
    findRefreshDelay: FIND_REFRESH_DELAY,
    findReplaceDiffToggle,
    findReplaceDock,
    findReplaceDragHandle,
    findReplaceHistory,
    findReplaceInput,
    findReplaceModal,
    findReplaceScope,
    findReplaceWith,
    getCurrentViewMode: () => currentViewMode,
    getEditorVisible: isEditorVisible,
    getScrollSnapshot,
    largeDocumentThreshold: LARGE_DOCUMENT_THRESHOLD,
    largeFindRefreshDelay: LARGE_FIND_REFRESH_DELAY,
    markdownPreview,
    marked,
    openAppModal,
    previewPane,
    readStorageItem,
    requestFrame: requestAnimationFrame,
    saveStorageItem,
    scrollActiveMatchIntoView,
    syncModalState,
    syncWorkspaceState: syncWorkspaceSnapshot,
    windowRef: window
  });
  function initAppModals() {
    addCleanup(attachDocumentModalControls({
      aboutModal,
      aboutModalClose,
      aboutModalCloseIcon,
      clearFormattingCancel,
      clearFormattingClose,
      clearFormattingConfirm,
      clearFormattingModal,
      helpModal,
      helpModalClose,
      helpModalCloseIcon
    }, {
      applyClearFormatting,
      closeAppModal
    }));
  }
  function openHelpModal() {
    openDocumentModal(helpModal, openAppModal);
  }
  function openAboutModal() {
    openAboutDocumentModal({
      modal: aboutModal,
      openAppModal,
      version: APP_VERSION,
      versionElement: aboutVersion
    });
  }
  function openClearFormattingModal() {
    openDocumentModal(clearFormattingModal, openAppModal);
  }
  function runMarkdownTool(action, button) {
    if (action === 'undo') {
      executeUndo();
      return;
    }
    if (action === 'redo') {
      executeRedo();
      return;
    }
    if (action === 'bold') wrapEditorSelection('**', '**', 'bold text');
    else if (action === 'strike') wrapEditorSelection('~~', '~~', 'struck text');
    else if (action === 'italic') wrapEditorSelection('*', '*', 'italic text');
    else if (action === 'quote') transformEditorLines(function(line) { return line ? '> ' + line.replace(/^>\s?/, '') : '>'; });
    else if (action === 'align-left') insertAlignmentBlock('left');
    else if (action === 'align-center') insertAlignmentBlock('center');
    else if (action === 'align-right') insertAlignmentBlock('right');
    else if (action === 'title-case') transformSelectionOrCurrentLine(toTitleCase);
    else if (action === 'uppercase') transformSelectionOrCurrentLine(function(text) { return text.toUpperCase(); });
    else if (action === 'lowercase') transformSelectionOrCurrentLine(function(text) { return text.toLowerCase(); });
    else if (action === 'heading') {
      const level = parseInt(button.getAttribute('data-md-level') || '1', 10);
      const marker = '#'.repeat(Math.max(1, Math.min(6, level))) + ' ';
      transformEditorLines(function(line) { return marker + line.replace(/^#{1,6}\s+/, ''); });
    } else if (action === 'unordered-list') {
      applyMarkdownList('unordered');
    } else if (action === 'ordered-list') {
      applyMarkdownList('ordered');
    } else if (action === 'horizontal-rule') insertMarkdownBlock('---\n');
    else if (action === 'link') insertMarkdownLink();
    else if (action === 'reference') insertMarkdownReference();
    else if (action === 'image') insertMarkdownImage();
    else if (action === 'inline-code') wrapEditorSelection('`', '`', 'code');
    else if (action === 'code-block') insertMarkdownBlock('```js\n' + (markdownEditor.value.slice(markdownEditor.selectionStart, markdownEditor.selectionEnd) || 'console.log("Hello, Markdown!");') + '\n```\n');
    else if (action === 'table') openTableModal();
    else if (action === 'date-time') {
      const now = new Date();
      const datePart = now.toLocaleDateString('en-CA');
      const timePart = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
      const timestamp = `${datePart} ${timePart} ${dayName}`;
      replaceEditorRange(markdownEditor.selectionStart, markdownEditor.selectionEnd, timestamp, markdownEditor.selectionStart + timestamp.length, markdownEditor.selectionStart + timestamp.length);
    } else if (action === 'emoji') {
      openEmojiModal();
    }
    else if (action === 'symbols') openSymbolsModal();
    else if (action === 'alert') openAlertModal();
    else if (action === 'terminal-block') insertMarkdownBlock('```bash\nbun run dev\n```\n');
    else if (action === 'fullscreen') {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    } else if (action === 'clear-formatting') openClearFormattingModal();
    else if (action === 'find') openFindReplaceModal();
    else if (action === 'help') openHelpModal();
    else if (action === 'info') openAboutModal();
  }
  registerMarkdownToolbarBridge({
    runMarkdownTool,
    toggleContentDirection
  }, window);
  registerEditorGeometryBridge({
    refreshAfterPaneLayout() {
      refreshEditorWidth();
      scheduleLineNumberUpdate();
    }
  }, window);
  function applyPaneWidths() {
    applyPaneWidthsFromBridge({ refreshEditorWidth, scheduleLineNumberUpdate }, window);
  }
  function resetPaneWidths() {
    resetPaneWidthsFromBridge({ refreshEditorWidth }, window);
  }
  function closeMobileMenu() {
    syncUiState({ mobileMenuOpen: false });
  }
  initTabs();
  syncWorkspaceSnapshot();
  updateFindHighlights();
  syncHighlightScroll();
  // Defer DOM geometry measurement until after FCP/LCP critical paint path
  setTimeout(function() {
    initEditorGeometry();
    refreshEditorWidth();
    scheduleLineNumberUpdate();
  }, 100);
  addCleanup(attachEditorLayoutController({
    constrainFloatingPanelPosition,
    getFindDocked: getFindReplaceDocked,
    getFindOpen: getFindReplaceOpen,
    initEditorGeometry,
    previewPane,
    refreshEditorWidth,
    scheduleLineNumberUpdate,
    syncPreviewToEditor,
    toggleFindDockMode: toggleFrDockMode,
    windowRef: window
  }));
  addCleanup(attachEditorTextareaController({
    editorElement: markdownEditor,
    getFindModalOpen: getFindReplaceOpen,
    handleListEnter,
    inputHandlers: {
      handleKeystrokeHistory,
      debouncedRender,
      scheduleCurrentTabSave() {
        workspaceSaveScheduler.scheduleCurrentTabSave(saveCurrentTabState);
      },
      scheduleFindRefresh,
      updateFindHighlights,
      scheduleLineNumberUpdate
    },
    onScrollSnapshot(snapshot) {
      setScrollSnapshot(snapshot);
    },
    saveCurrentTabState,
    scheduleEditorOverlayScrollSync,
    syncEditorToPreview,
    updateLastCursor
  }));
  initFindReplaceModal();
  initAppModals();
  function toggleContentDirection() {
    contentDirectionController.toggle();
  }
  registerThemeBridge({ toggleTheme }, window);
  addCleanup(attachGitHubImportModalControls({
    cancelButton: githubImportCancelBtn,
    fileSelect: githubImportFileSelect,
    selectAllButton: githubImportSelectAllBtn,
    submitButton: githubImportSubmitBtn,
    urlInput: githubImportUrlInput
  }, {
    closeModal: githubImportController.close,
    getAvailablePaths: githubImportController.getAvailablePaths,
    getSelectedPaths: githubImportController.getSelectedPaths,
    setSelectedPaths: githubImportController.setSelectedPaths,
    submitImport: githubImportController.submit
  }));
  addCleanup(attachMarkdownFileInputController({
    fileInput,
    importMarkdownFile
  }));
  const {
    loadFromCloudShare,
    loadFromShareHash,
    openShareModal,
    selectShareMode
  } = createShareRuntime({
    alertRef: alert,
    applyCloudSharedDocument(sharedDocument) {
      markdownEditor.value = sharedDocument.content;
      const tab = findTabById(tabs, activeTabId);
      if (tab) {
        tabs = updateTabInList(tabs, activeTabId, {
          title: sharedDocument.title,
          content: markdownEditor.value,
          viewMode: sharedDocument.viewMode
        });
      }
      renderMarkdown({ reason: 'document-load', showSkeleton: true });
      saveCurrentTabState();
      setViewMode(sharedDocument.viewMode);
      renderTabBar(tabs, activeTabId);
    },
    applyLocalSharedDocument(sharedDocument) {
      markdownEditor.value = sharedDocument.content;
      renderMarkdown({ reason: 'document-load', showSkeleton: true });
      saveCurrentTabState();
      setViewMode(sharedDocument.viewMode);
    },
    cloudStorage,
    consoleRef: console,
    createCloudShare(input) {
      return cloudApi('/api/shares', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    },
    fetcher: fetch,
    getActiveTitle() {
      const activeTab = findTabById(tabs, activeTabId);
      return activeTab && activeTab.title ? activeTab.title : null;
    },
    getCompressionLib: () => typeof pako === 'undefined' ? undefined : pako,
    getMarkdown: () => markdownEditor.value,
    isCloudSharePage,
    loadCompression: () => loadScript(CDN.pako),
    locationRef: window.location,
    syncCloudStateSnapshot: syncCloudStateSnapshot,
    syncModalState
  });
  registerShareBridge({ selectShareMode }, window);  loadFromCloudShare();
  loadFromShareHash();
  const fileDragDropController = createFileDragDropController({
    overlay: dragOverlay,
    isMarkdownUploadFile,
    importMarkdownFile,
    alertRef: alert
  });
  addCleanup(attachFileDragDropController(document, fileDragDropController));
  addCleanup(attachAppKeyboardShortcutController({
    documentRef: document,
    editorElement: markdownEditor,
    findReplaceHandlers: {
      openFindReplaceModal,
      closeFindReplaceModal
    },
    getActiveElement: () => document.activeElement,
    getEditorHasSelection: () => markdownEditor.selectionStart !== markdownEditor.selectionEnd,
    getFindReplaceOpen: getFindReplaceOpen,
    getHasDocumentSelection: () => Boolean(window.getSelection && window.getSelection().toString().trim().length > 0),
    getViewMode: () => currentViewMode,
    globalHandlers: {
      undo: executeUndo,
      redo: executeRedo,
      exportMarkdown() {
        exportMd.click();
      },
      copyMarkdown() {
        copyMarkdownButton.click();
      },
      toggleSyncScrolling,
      newTab,
      closeTab: () => {
        closeTab(activeTabId);
      },
      closeActiveOverlays() {
        closeTabMenus();
        closeMermaidModal();
      }
    }
  }));
  // Preview link handling
  addCleanup(attachPreviewLinkClickController({
    editor: markdownEditor,
    locationHref: window.location.href,
    markdownPreview,
    openExternal(href, target, features) {
      window.open(href, target, features);
    },
    previewPane,
    setProgrammaticScrolling(value) {
      syncScrollController.setProgrammaticScrolling(value);
    },
    warn: console.warn
  }));

  let destroyed = false;
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(markdownRenderTimeout);
      workspaceSaveScheduler.clearPendingSave();
      if (cloudStorage.saveTimer) {
        clearTimeout(cloudStorage.saveTimer);
        cloudStorage.saveTimer = null;
      }
      findReplaceRuntime?.destroy();
      previewRuntime?.clearPendingPreviewWork();
      cleanupImageObjectUrls();
      for (const cleanup of cleanupCallbacks.splice(0).reverse()) {
        cleanup();
      }
      delete window.markdownViewerAuth;
      delete window.markdownViewerHeaderActions;
      delete window.markdownViewerTabs;
      delete window.markdownViewerToolbar;
      delete window.markdownViewerSyncScroll;
      delete window.markdownViewerViewMode;
      delete window.markdownViewerTheme;
      delete window.markdownViewerEditorGeometry;
      delete window.markdownViewerShare;
    }
  };
}

