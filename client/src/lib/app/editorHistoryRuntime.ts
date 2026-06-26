import {
  createEditorHistoryStack,
  getEditorHistoryAvailability,
  initializeEditorHistory,
  prepareKeystrokeHistory,
  preparePendingHistoryCommit,
  prepareProgrammaticHistoryCommit,
  prepareRedoHistory,
  prepareUndoHistory,
  type EditorHistoryEntry,
  type EditorHistoryInputKind,
  type EditorHistoryStack
} from '../editor/history';
import type { EditorStateSnapshot } from '../state/editor.svelte';

type TimerHandle = ReturnType<typeof setTimeout>;
type SyncEditorState = (patch: Partial<EditorStateSnapshot>) => void;

export type EditorHistoryRuntimeOptions = {
  clearTimer?: typeof clearTimeout;
  editor: HTMLTextAreaElement;
  getActiveTabId(): string | null;
  saveCurrentTabState(): void;
  setTimer?: typeof setTimeout;
  syncEditorState: SyncEditorState;
};

export type EditorHistoryRuntime = {
  activateTabHistory(tabId: string | null, initialValue: string): void;
  commitPendingState(): void;
  deleteTabHistory(tabId: string | null): void;
  executeRedo(): void;
  executeUndo(): void;
  handleKeystrokeHistory(event?: InputEvent): void;
  markProgrammaticInput(value: string): void;
  pushProgrammaticHistoryState(): void;
  resetTypingHistoryState(): void;
  updateLastCursor(): void;
  updateUndoRedoButtons(): void;
};

export function createEditorHistoryRuntime(
  options: EditorHistoryRuntimeOptions
): EditorHistoryRuntime {
  const tabHistories: Record<string, EditorHistoryStack> = {};
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  let currentHistoryTabId: string | null = null;
  let lastPushedValue = '';
  let typingTimeout: TimerHandle | null = null;
  let lastInputType: EditorHistoryInputKind = null;
  let lastCursorStart = 0;
  let lastCursorEnd = 0;
  let pendingState: EditorHistoryEntry | null = null;

  function getOrCreateTabHistory(tabId: string | null): EditorHistoryStack {
    if (!tabId) return createEditorHistoryStack();
    if (!tabHistories[tabId]) {
      tabHistories[tabId] = createEditorHistoryStack();
    }
    return tabHistories[tabId];
  }

  function setTabHistory(tabId: string | null, history: EditorHistoryStack): void {
    if (!tabId) return;
    tabHistories[tabId] = history;
  }

  function clearTypingTimer(): void {
    if (typingTimeout) {
      clearTimer(typingTimeout);
      typingTimeout = null;
    }
  }

  function updateUndoRedoButtons(): void {
    const state = getEditorHistoryAvailability(getOrCreateTabHistory(options.getActiveTabId()), pendingState);
    options.syncEditorState(state);
  }

  function commitPendingState(): void {
    clearTypingTimer();
    const tabId = options.getActiveTabId();
    const result = preparePendingHistoryCommit({
      history: getOrCreateTabHistory(tabId),
      currentValue: options.editor.value,
      pendingState
    });
    if (!result.changed) return;
    setTabHistory(tabId, result.history);
    lastPushedValue = result.lastPushedValue;
    pendingState = result.pendingState;
    updateUndoRedoButtons();
  }

  return {
    activateTabHistory(tabId, initialValue) {
      const initialized = initializeEditorHistory(getOrCreateTabHistory(tabId), initialValue || '');
      if (initialized.initialized) {
        setTabHistory(tabId, initialized.history);
        lastPushedValue = initialized.lastPushedValue;
        currentHistoryTabId = tabId;
        pendingState = initialized.pendingState;
      } else {
        lastPushedValue = initialValue || '';
        currentHistoryTabId = tabId;
        pendingState = null;
      }
    },

    commitPendingState,

    deleteTabHistory(tabId) {
      if (tabId) {
        delete tabHistories[tabId];
      }
    },

    executeRedo() {
      clearTypingTimer();
      const tabId = options.getActiveTabId();
      const result = prepareRedoHistory({
        history: getOrCreateTabHistory(tabId),
        currentValue: options.editor.value,
        selectionStart: options.editor.selectionStart,
        selectionEnd: options.editor.selectionEnd,
        pendingState
      });
      setTabHistory(tabId, result.history);
      pendingState = result.pendingState;
      const stateToRestore = result.restoredState;
      if (stateToRestore) {
        options.editor.value = stateToRestore.value;
        options.editor.setSelectionRange(stateToRestore.selectionStart, stateToRestore.selectionEnd);
        lastPushedValue = result.lastPushedValue || '';
        lastInputType = result.lastInputType;
        options.editor.dispatchEvent(new Event('input', { bubbles: true }));
        options.saveCurrentTabState();
      }
      updateUndoRedoButtons();
    },

    executeUndo() {
      clearTypingTimer();
      const tabId = options.getActiveTabId();
      const result = prepareUndoHistory({
        history: getOrCreateTabHistory(tabId),
        currentValue: options.editor.value,
        selectionStart: options.editor.selectionStart,
        selectionEnd: options.editor.selectionEnd,
        pendingState
      });
      setTabHistory(tabId, result.history);
      pendingState = result.pendingState;
      const stateToRestore = result.restoredState;
      if (stateToRestore) {
        options.editor.value = stateToRestore.value;
        options.editor.setSelectionRange(stateToRestore.selectionStart, stateToRestore.selectionEnd);
        lastPushedValue = result.lastPushedValue || '';
        lastInputType = result.lastInputType;
        options.editor.dispatchEvent(new Event('input', { bubbles: true }));
        options.saveCurrentTabState();
      }
      updateUndoRedoButtons();
    },

    handleKeystrokeHistory(event) {
      const result = prepareKeystrokeHistory({
        currentValue: options.editor.value,
        lastPushedValue,
        lastCursorStart,
        lastCursorEnd,
        lastInputType,
        pendingState,
        inputType: event && typeof event.inputType === 'string' ? event.inputType : '',
        data: event && typeof event.data === 'string' ? event.data : null
      });
      if (!result.changed) return;
      pendingState = result.pendingState;
      if (result.shouldCommit) {
        commitPendingState();
      }
      clearTypingTimer();
      typingTimeout = setTimer(() => {
        commitPendingState();
      }, 1000);
      lastInputType = result.nextInputType;
    },

    markProgrammaticInput(value) {
      lastPushedValue = value;
      lastInputType = 'programmatic';
    },

    pushProgrammaticHistoryState() {
      clearTypingTimer();
      const tabId = options.getActiveTabId();
      const result = prepareProgrammaticHistoryCommit({
        history: getOrCreateTabHistory(tabId),
        currentValue: options.editor.value,
        lastPushedValue,
        pendingState,
        selectionStart: options.editor.selectionStart,
        selectionEnd: options.editor.selectionEnd
      });
      setTabHistory(tabId, result.history);
      pendingState = result.pendingState;
      lastPushedValue = result.lastPushedValue;
      updateUndoRedoButtons();
    },

    resetTypingHistoryState() {
      clearTypingTimer();
      lastInputType = null;
      pendingState = null;
    },

    updateLastCursor() {
      lastCursorStart = options.editor.selectionStart;
      lastCursorEnd = options.editor.selectionEnd;
    },

    updateUndoRedoButtons
  };
}
