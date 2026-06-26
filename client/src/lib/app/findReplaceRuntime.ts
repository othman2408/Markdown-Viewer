import {
  attachFindReplaceModalDomHandlers,
  constrainFindReplaceFloatingPosition,
  createDefaultFindReplaceOptions,
  prepareFindReplaceClose,
  prepareFindReplaceControlsState,
  prepareFindReplaceDockState,
  prepareFindReplaceDrawerState,
  prepareFindReplaceErrorHidden,
  prepareFindReplaceErrorVisible,
  prepareFindReplaceOpen,
  prepareFindReplaceOptionToggle,
  renderFindReplaceDiffPreview,
  renderFindReplaceHistoryOptions,
  resetFindReplaceFloatingPosition,
  type FindReplaceOptionsPatch
} from '../modals/findReplace';
import {
  FindReplaceEngine,
  validateBlockSyntax,
  type FindReplaceEngineOptions,
  type FindReplaceMatch
} from '../modals/findReplaceEngine';
import {
  executeBulkFindReplace,
  replaceAllFindMatches,
  replaceCurrentFindMatch
} from '../modals/findReplaceActions';
import {
  attachFindReplacePanelDrag,
  resetFindReplaceDockLayoutOnClose,
  toggleFindReplaceDockMode
} from '../modals/findReplacePanel';
import { updatePreviewFindHighlights as updatePreviewFindHighlightsDom } from '../modals/previewFindHighlights';

export interface FindReplaceEditor {
  dispatchEvent(event: Event): boolean;
  focus(): void;
  selectionEnd: number;
  selectionStart: number;
  setSelectionRange(start: number, end: number): void;
  value: string;
}

export interface FindReplaceScrollSnapshot {
  scrollLeft: number;
  scrollTop: number;
}

export interface CreateFindReplaceRuntimeOptions {
  alertRef?: (message: string) => void;
  applyPaneWidths(): void;
  clearTimeoutFn?: (handle: unknown) => void;
  closeAppModal(modal: HTMLElement): void;
  consoleRef?: Pick<Console, 'warn'>;
  contentContainer: HTMLElement | null;
  documentRef?: Document;
  dockedStorageKey: string;
  editor: FindReplaceEditor;
  editorHighlightLayer: HTMLElement | null;
  findRefreshDelay: number;
  findReplaceDiffToggle: HTMLInputElement | null;
  findReplaceDock: HTMLElement | null;
  findReplaceDragHandle: HTMLElement | null;
  findReplaceHistory: HTMLSelectElement | null;
  findReplaceInput: HTMLInputElement | null;
  findReplaceModal: HTMLElement | null;
  findReplaceScope: HTMLSelectElement | null;
  findReplaceWith: HTMLInputElement | null;
  getCurrentViewMode(): string;
  getEditorVisible(): boolean;
  getScrollSnapshot(): FindReplaceScrollSnapshot;
  largeDocumentThreshold: number;
  largeFindRefreshDelay: number;
  markdownPreview: HTMLElement;
  marked: FindReplaceEngineOptions['marked'];
  openAppModal(
    modal: HTMLElement,
    options?: {
      focusTarget?: HTMLElement | null;
      onClose?: () => void;
    }
  ): void;
  previewPane: HTMLElement;
  readStorageItem(key: string): string | null;
  requestFrame?: (callback: FrameRequestCallback) => number;
  saveStorageItem(key: string, value: string): void;
  scrollActiveMatchIntoView(match: FindReplaceMatch): void;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
  syncModalState(patch: Record<string, unknown>): void;
  syncWorkspaceState(): void;
  windowRef?: Pick<Window, 'innerHeight' | 'innerWidth'>;
}

export interface FindReplaceRuntime {
  closeFindReplaceModal(): void;
  constrainFloatingPanelPosition(): void;
  getFindDocked(): boolean;
  getFindOpen(): boolean;
  initFindReplaceModal(): void;
  openFindReplaceModal(): void;
  scheduleFindRefresh(options?: { resetIndex?: boolean }): void;
  toggleDockMode(forceFloat?: boolean): void;
  updateFindHighlights(): void;
}

export function createFindReplaceRuntime(options: CreateFindReplaceRuntimeOptions): FindReplaceRuntime {
  const documentRef = options.documentRef ?? document;
  const windowRef = options.windowRef ?? window;
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const setTimeoutFn = options.setTimeoutFn ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const clearTimeoutFn = options.clearTimeoutFn ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const consoleRef = options.consoleRef ?? console;
  const alertRef = options.alertRef ?? alert;

  let findMatches: FindReplaceMatch[] = [];
  let activeFindIndex = -1;
  let lastFindQuery = '';
  let findReplaceOptions: FindReplaceOptionsPatch = createDefaultFindReplaceOptions();
  let findRefreshTimeout: unknown = null;
  let frEngine: FindReplaceEngine | null = null;
  let isFindModalOpen = false;
  let isFrDocked = false;
  let lastFloatingLeft: string | null = null;
  let lastFloatingTop: string | null = null;
  let lastFloatingRight: string | null = null;

  function isPreviewVisible(): boolean {
    const currentViewMode = options.getCurrentViewMode();
    return currentViewMode === 'preview' || currentViewMode === 'split';
  }

  function updatePreviewFindHighlights(): void {
    updatePreviewFindHighlightsDom({
      activeFindIndex,
      findMatchCount: findMatches.length,
      isCaseSensitive: findReplaceOptions.findReplaceMatchCase,
      isFindModalOpen,
      isPreviewVisible: isPreviewVisible(),
      isRegex: findReplaceOptions.findReplaceUseRegex,
      isWholeWord: findReplaceOptions.findReplaceWholeWord,
      markdownPreview: options.markdownPreview,
      previewPane: options.previewPane,
      query: options.findReplaceInput ? options.findReplaceInput.value : ''
    });
  }

  function updateFindHighlights(): void {
    updatePreviewFindHighlights();
    if (!options.editorHighlightLayer) return;
    if (!options.getEditorVisible()) return;
    if (!isFindModalOpen || !options.findReplaceInput || !options.findReplaceInput.value || !findMatches.length) {
      if (options.editorHighlightLayer.textContent !== '') {
        options.editorHighlightLayer.textContent = '';
      }
      return;
    }

    const text = options.editor.value || '';
    const { scrollTop, scrollLeft } = options.getScrollSnapshot();
    const fragment = documentRef.createDocumentFragment();
    let lastIndex = 0;
    findMatches.forEach((match, index) => {
      fragment.appendChild(documentRef.createTextNode(text.slice(lastIndex, match.start)));
      const mark = documentRef.createElement('mark');
      mark.className = `find-highlight${index === activeFindIndex ? ' active' : ''}`;
      mark.textContent = text.slice(match.start, match.end);
      fragment.appendChild(mark);
      lastIndex = match.end;
    });
    fragment.appendChild(documentRef.createTextNode(text.slice(lastIndex)));
    options.editorHighlightLayer.textContent = '';
    options.editorHighlightLayer.appendChild(fragment);
    options.editorHighlightLayer.scrollTop = scrollTop;
    options.editorHighlightLayer.scrollLeft = scrollLeft;
  }

  function updateFindControls(): void {
    const total = findMatches.length;
    const current = total && activeFindIndex >= 0 ? activeFindIndex + 1 : 0;
    const hasQuery = !!(options.findReplaceInput && options.findReplaceInput.value);
    options.syncModalState(prepareFindReplaceControlsState(current, total, hasQuery));
  }

  function updateHistoryDropdowns(): void {
    if (!options.findReplaceHistory || !frEngine) return;
    renderFindReplaceHistoryOptions(options.findReplaceHistory, frEngine.history.find);
  }

  function refreshFindMatches(refreshOptions?: { resetIndex?: boolean }): void {
    clearTimeoutFn(findRefreshTimeout);
    findRefreshTimeout = null;
    const query = options.findReplaceInput ? options.findReplaceInput.value : '';
    options.syncModalState(prepareFindReplaceErrorHidden());
    if (!isFindModalOpen || !query) {
      findMatches = [];
      activeFindIndex = -1;
      updateFindControls();
      updateFindHighlights();
      return;
    }

    if (!frEngine) {
      frEngine = new FindReplaceEngine(options.editor, { marked: options.marked });
    }

    const isRegex = findReplaceOptions.findReplaceUseRegex;
    const isCaseSensitive = findReplaceOptions.findReplaceMatchCase;
    const isWholeWord = findReplaceOptions.findReplaceWholeWord;
    const scopeFilter = options.findReplaceScope ? options.findReplaceScope.value : 'document';
    const findInSelection = findReplaceOptions.findReplaceInSelection;
    try {
      findMatches = frEngine.executeSearch({
        query,
        isRegex,
        isCaseSensitive,
        isWholeWord,
        scopeFilter,
        findInSelection
      });
    } catch (err) {
      findMatches = [];
      activeFindIndex = -1;
      options.syncModalState(prepareFindReplaceErrorVisible(err instanceof Error ? err.message : String(err)));
    }

    const shouldResetActiveIndex = Boolean(refreshOptions?.resetIndex) || query !== lastFindQuery;
    if (shouldResetActiveIndex) {
      activeFindIndex = findMatches.length ? 0 : -1;
    } else if (activeFindIndex >= findMatches.length) {
      activeFindIndex = findMatches.length - 1;
    }
    lastFindQuery = query;
    updateFindControls();
    updateFindHighlights();
    if (shouldResetActiveIndex && findMatches.length && activeFindIndex >= 0) {
      options.scrollActiveMatchIntoView(findMatches[activeFindIndex]);
    }
    updateHistoryDropdowns();
  }

  function scheduleFindRefresh(refreshOptions?: { resetIndex?: boolean }): void {
    clearTimeoutFn(findRefreshTimeout);
    const text = options.editor ? options.editor.value || '' : '';
    const delay = text.length >= options.largeDocumentThreshold
      ? options.largeFindRefreshDelay
      : options.findRefreshDelay;
    findRefreshTimeout = setTimeoutFn(() => {
      findRefreshTimeout = null;
      refreshFindMatches(refreshOptions);
    }, delay);
  }

  function selectActiveMatch(): void {
    if (!findMatches.length || activeFindIndex < 0) return;
    const match = findMatches[activeFindIndex];
    options.editor.focus();
    options.editor.setSelectionRange(match.start, match.end);
    try {
      options.scrollActiveMatchIntoView(match);
    } catch (error) {
      consoleRef.warn('Viewport centering scroll failed:', error);
    }
  }

  function cycleFindMatch(direction: number): void {
    const totalMatches = findMatches.length;
    if (!totalMatches) return;
    activeFindIndex = (activeFindIndex + direction + totalMatches) % totalMatches;
    updateFindControls();
    updateFindHighlights();
    selectActiveMatch();
  }

  function toggleDockMode(forceFloat = false): void {
    const dockState = toggleFindReplaceDockMode({
      body: documentRef.body,
      contentContainer: options.contentContainer,
      currentDocked: isFrDocked,
      dockButton: options.findReplaceDock,
      documentRef,
      floatingPosition: {
        left: lastFloatingLeft,
        right: lastFloatingRight,
        top: lastFloatingTop
      },
      forceFloat,
      onDockStateChange(docked) {
        options.syncModalState(prepareFindReplaceDockState(docked));
      },
      onLayoutChange: options.applyPaneWidths,
      onPersistPreferredDocked(docked) {
        options.saveStorageItem(options.dockedStorageKey, docked ? 'true' : 'false');
      },
      onWorkspaceSync: options.syncWorkspaceState,
      panel: options.findReplaceModal,
      viewportWidth: windowRef.innerWidth
    });

    if (dockState) {
      isFrDocked = dockState.docked;
    }
  }

  function initFindReplacePanelDrag(): void {
    attachFindReplacePanelDrag({
      documentRef,
      handle: options.findReplaceDragHandle,
      isDocked: () => isFrDocked,
      onPositionChange(position) {
        lastFloatingLeft = position.left;
        lastFloatingTop = position.top;
        lastFloatingRight = position.right;
      },
      panel: options.findReplaceModal,
      viewportHeight: () => windowRef.innerHeight,
      viewportWidth: () => windowRef.innerWidth
    });
  }

  function openFindReplaceModal(): void {
    if (!options.findReplaceModal || !options.findReplaceInput) return;
    if (!frEngine) {
      frEngine = new FindReplaceEngine(options.editor, { marked: options.marked });
    }
    isFindModalOpen = true;
    const selected = options.editor.value.slice(options.editor.selectionStart, options.editor.selectionEnd);
    if (selected && selected.length < 100) {
      options.findReplaceInput.value = selected;
    }

    let wasDockedPref = options.readStorageItem(options.dockedStorageKey) === 'true';
    if (windowRef.innerWidth < 1080) {
      wasDockedPref = false;
    }
    if (wasDockedPref) {
      isFrDocked = false;
      toggleDockMode();
    } else {
      isFrDocked = true;
      toggleDockMode();
    }

    options.syncModalState(prepareFindReplaceOpen(isFrDocked));
    requestFrame(() => {
      options.findReplaceInput?.focus();
      options.findReplaceInput?.select();
    });
    refreshFindMatches({ resetIndex: true });
    if (findMatches.length) {
      selectActiveMatch();
    }
  }

  function closeFindReplaceModal(): void {
    isFindModalOpen = false;
    options.syncModalState(prepareFindReplaceClose());
    resetFindReplaceDockLayoutOnClose({
      contentContainer: options.contentContainer,
      docked: isFrDocked,
      onLayoutChange: options.applyPaneWidths,
      panel: options.findReplaceModal
    });
    findMatches = [];
    activeFindIndex = -1;
    updateFindControls();
    updateFindHighlights();
  }

  function replaceCurrentMatch(): void {
    if (!frEngine) return;
    replaceCurrentFindMatch({
      activeIndex: activeFindIndex,
      alertRef,
      engine: frEngine,
      getMatches: () => findMatches,
      getReplacement: () => options.findReplaceWith ? options.findReplaceWith.value : '',
      getScopeFilter: () => options.findReplaceScope ? options.findReplaceScope.value : 'document',
      isRegex: findReplaceOptions.findReplaceUseRegex,
      matches: findMatches,
      preserveCase: findReplaceOptions.findReplacePreserveCase,
      refreshFindMatches,
      selectActiveMatch,
      setActiveIndex(index) {
        activeFindIndex = index;
      },
      validateBlockSyntax
    });
  }

  function replaceAllMatches(): void {
    if (!frEngine) return;
    replaceAllFindMatches({
      engine: frEngine,
      getMatches: () => findMatches,
      getReplacement: () => options.findReplaceWith ? options.findReplaceWith.value : '',
      isRegex: findReplaceOptions.findReplaceUseRegex,
      markdownValue: options.editor.value,
      matches: findMatches,
      preserveCase: findReplaceOptions.findReplacePreserveCase,
      refreshFindMatches,
      renderDiffPreview({ originalValue, draftValue }) {
        renderFindReplaceDiffPreview({
          originalValue,
          draftValue,
          openModal: options.openAppModal,
          closeModal: options.closeAppModal
        });
      },
      selectActiveMatch,
      showDiff: Boolean(options.findReplaceDiffToggle && options.findReplaceDiffToggle.checked)
    });
  }

  function executeBulkReplace(): void {
    if (!frEngine) return;
    executeBulkFindReplace({
      engine: frEngine,
      getMatches: () => findMatches,
      getReplacement: () => options.findReplaceWith ? options.findReplaceWith.value : '',
      isRegex: findReplaceOptions.findReplaceUseRegex,
      matches: findMatches,
      preserveCase: findReplaceOptions.findReplacePreserveCase,
      refreshFindMatches,
      selectActiveMatch
    });
  }

  function initFindReplaceModal(): void {
    if (!options.findReplaceModal) return;
    initFindReplacePanelDrag();
    const resetPosition = () => {
      if (!options.findReplaceModal) return;
      const nextPosition = resetFindReplaceFloatingPosition(options.findReplaceModal);
      lastFloatingLeft = nextPosition.left;
      lastFloatingTop = nextPosition.top;
      lastFloatingRight = nextPosition.right;
    };

    attachFindReplaceModalDomHandlers({
      documentRef,
      modal: options.findReplaceModal
    }, {
      closeAppModal: options.closeAppModal,
      closeFindReplaceModal,
      executeBulkReplace,
      onFindInput() {
        refreshFindMatches({ resetIndex: true });
      },
      onHistoryChange(value) {
        if (value && options.findReplaceInput) {
          options.findReplaceInput.value = value;
          refreshFindMatches({ resetIndex: true });
        }
      },
      onOptionToggle(id) {
        findReplaceOptions = prepareFindReplaceOptionToggle(findReplaceOptions, id);
        options.syncModalState(findReplaceOptions);
        refreshFindMatches({ resetIndex: true });
      },
      onReplaceInput: updateFindControls,
      onScopeChange() {
        refreshFindMatches({ resetIndex: true });
      },
      onToggleDock() {
        toggleDockMode(false);
      },
      onToggleDrawer(open) {
        options.syncModalState(prepareFindReplaceDrawerState(open));
      },
      replaceAllMatches,
      replaceCurrentMatch,
      resetPosition,
      selectFindMatch: cycleFindMatch
    });
  }

  function constrainFloatingPanelPosition(): void {
    if (!options.findReplaceModal) return;
    const constrainedPosition = constrainFindReplaceFloatingPosition({
      docked: isFrDocked,
      panel: options.findReplaceModal
    });
    if (!constrainedPosition) return;
    lastFloatingLeft = constrainedPosition.left;
    lastFloatingTop = constrainedPosition.top;
  }

  return {
    closeFindReplaceModal,
    constrainFloatingPanelPosition,
    getFindDocked: () => isFrDocked,
    getFindOpen: () => isFindModalOpen,
    initFindReplaceModal,
    openFindReplaceModal,
    scheduleFindRefresh,
    toggleDockMode,
    updateFindHighlights
  };
}
