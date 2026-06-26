export type EditorHistoryInputKind = 'insert' | 'delete' | 'other' | 'programmatic' | null;

export interface EditorHistoryEntry {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface EditorHistoryStack {
  undoStack: EditorHistoryEntry[];
  redoStack: EditorHistoryEntry[];
}

export interface EditorHistoryAvailability {
  canUndo: boolean;
  canRedo: boolean;
}

interface InitializeEditorHistoryResult {
  history: EditorHistoryStack;
  initialized: boolean;
  lastPushedValue: string;
  pendingState: EditorHistoryEntry | null;
}

interface PrepareProgrammaticHistoryInput {
  history: EditorHistoryStack;
  currentValue: string;
  lastPushedValue: string;
  pendingState: EditorHistoryEntry | null;
  selectionStart: number;
  selectionEnd: number;
  maxEntries?: number;
}

interface PreparePendingHistoryCommitInput {
  history: EditorHistoryStack;
  currentValue: string;
  pendingState: EditorHistoryEntry | null;
  maxEntries?: number;
}

interface PrepareHistoryCommitResult {
  changed: boolean;
  history: EditorHistoryStack;
  lastPushedValue: string;
  pendingState: EditorHistoryEntry | null;
}

interface PrepareKeystrokeHistoryInput {
  currentValue: string;
  lastPushedValue: string;
  lastCursorStart: number;
  lastCursorEnd: number;
  lastInputType: EditorHistoryInputKind;
  pendingState: EditorHistoryEntry | null;
  inputType?: string;
  data?: string | null;
}

interface PrepareKeystrokeHistoryResult {
  changed: boolean;
  nextInputType: EditorHistoryInputKind;
  pendingState: EditorHistoryEntry | null;
  shouldCommit: boolean;
}

interface PrepareUndoRedoHistoryInput {
  history: EditorHistoryStack;
  currentValue: string;
  selectionStart: number;
  selectionEnd: number;
  pendingState?: EditorHistoryEntry | null;
  maxEntries?: number;
}

interface PrepareUndoRedoHistoryResult {
  changed: boolean;
  history: EditorHistoryStack;
  lastInputType: EditorHistoryInputKind;
  lastPushedValue: string | null;
  pendingState: EditorHistoryEntry | null;
  restoredState: EditorHistoryEntry | null;
}

const DEFAULT_MAX_HISTORY_ENTRIES = 200;

export function createEditorHistoryStack(): EditorHistoryStack {
  return {
    undoStack: [],
    redoStack: []
  };
}

export function createEditorHistoryEntry(
  value = '',
  selectionStart = 0,
  selectionEnd = 0
): EditorHistoryEntry {
  return {
    value,
    selectionStart: Math.max(0, Math.floor(Number(selectionStart) || 0)),
    selectionEnd: Math.max(0, Math.floor(Number(selectionEnd) || 0))
  };
}

function cloneEntry(entry: EditorHistoryEntry): EditorHistoryEntry {
  return createEditorHistoryEntry(entry.value, entry.selectionStart, entry.selectionEnd);
}

function cloneHistory(history: EditorHistoryStack): EditorHistoryStack {
  return {
    undoStack: history.undoStack.map(cloneEntry),
    redoStack: history.redoStack.map(cloneEntry)
  };
}

function pushBoundedEntry(
  entries: EditorHistoryEntry[],
  entry: EditorHistoryEntry,
  maxEntries = DEFAULT_MAX_HISTORY_ENTRIES
): EditorHistoryEntry[] {
  const nextEntries = [...entries, cloneEntry(entry)];
  const overflow = nextEntries.length - Math.max(1, maxEntries);

  return overflow > 0 ? nextEntries.slice(overflow) : nextEntries;
}

function getCurrentEntry(input: {
  currentValue: string;
  selectionStart: number;
  selectionEnd: number;
}): EditorHistoryEntry {
  return createEditorHistoryEntry(input.currentValue, input.selectionStart, input.selectionEnd);
}

function getNextInputKind(inputType = ''): EditorHistoryInputKind {
  if (inputType.startsWith('delete')) return 'delete';
  if (inputType.startsWith('insert')) return 'insert';
  return 'other';
}

export function initializeEditorHistory(
  history: EditorHistoryStack,
  initialValue = ''
): InitializeEditorHistoryResult {
  if (history.undoStack.length > 0) {
    return {
      history,
      initialized: false,
      lastPushedValue: initialValue || '',
      pendingState: null
    };
  }

  const value = initialValue || '';

  return {
    history: {
      ...cloneHistory(history),
      undoStack: [createEditorHistoryEntry(value, 0, 0)]
    },
    initialized: true,
    lastPushedValue: value,
    pendingState: null
  };
}

export function prepareProgrammaticHistoryCommit(
  input: PrepareProgrammaticHistoryInput
): PrepareHistoryCommitResult {
  const history = cloneHistory(input.history);

  if (input.pendingState) {
    return {
      changed: true,
      history: {
        undoStack: pushBoundedEntry(history.undoStack, input.pendingState, input.maxEntries),
        redoStack: []
      },
      lastPushedValue: input.currentValue,
      pendingState: null
    };
  }

  if (input.currentValue === input.lastPushedValue) {
    return {
      changed: false,
      history,
      lastPushedValue: input.lastPushedValue,
      pendingState: null
    };
  }

  return {
    changed: true,
    history: {
      undoStack: pushBoundedEntry(history.undoStack, getCurrentEntry(input), input.maxEntries),
      redoStack: []
    },
    lastPushedValue: input.currentValue,
    pendingState: null
  };
}

export function preparePendingHistoryCommit(
  input: PreparePendingHistoryCommitInput
): PrepareHistoryCommitResult {
  const history = cloneHistory(input.history);

  if (!input.pendingState) {
    return {
      changed: false,
      history,
      lastPushedValue: input.currentValue,
      pendingState: null
    };
  }

  return {
    changed: true,
    history: {
      undoStack: pushBoundedEntry(history.undoStack, input.pendingState, input.maxEntries),
      redoStack: []
    },
    lastPushedValue: input.currentValue,
    pendingState: null
  };
}

export function prepareKeystrokeHistory(input: PrepareKeystrokeHistoryInput): PrepareKeystrokeHistoryResult {
  if (input.currentValue === input.lastPushedValue) {
    return {
      changed: false,
      nextInputType: input.lastInputType,
      pendingState: input.pendingState,
      shouldCommit: false
    };
  }

  const inputType = input.inputType || '';
  const pendingState = input.pendingState || createEditorHistoryEntry(
    input.lastPushedValue,
    input.lastCursorStart,
    input.lastCursorEnd
  );
  let shouldCommit = false;

  if (
    inputType === 'insertLineBreak' ||
    inputType === 'insertParagraph' ||
    inputType === 'insertFromPaste' ||
    input.lastInputType === 'programmatic'
  ) {
    shouldCommit = true;
  } else if (input.data === ' ') {
    shouldCommit = true;
  } else {
    const isDelete = inputType.startsWith('delete');
    const wasDelete = input.lastInputType === 'delete';
    const isInsert = inputType.startsWith('insert');
    const wasInsert = input.lastInputType === 'insert';

    if ((isDelete && wasInsert) || (isInsert && wasDelete)) {
      shouldCommit = true;
    }
  }

  return {
    changed: true,
    nextInputType: getNextInputKind(inputType),
    pendingState,
    shouldCommit
  };
}

export function getEditorHistoryAvailability(
  history: EditorHistoryStack,
  pendingState: EditorHistoryEntry | null
): EditorHistoryAvailability {
  return {
    canUndo: history.undoStack.length > 0 || pendingState !== null,
    canRedo: history.redoStack.length > 0
  };
}

export function prepareUndoHistory(input: PrepareUndoRedoHistoryInput): PrepareUndoRedoHistoryResult {
  const history = cloneHistory(input.history);
  const currentEntry = getCurrentEntry(input);
  let restoredState: EditorHistoryEntry | null = null;
  let pendingState = input.pendingState || null;

  if (pendingState) {
    restoredState = cloneEntry(pendingState);
    pendingState = null;
    history.redoStack = pushBoundedEntry(history.redoStack, currentEntry, input.maxEntries);
  } else if (history.undoStack.length > 0) {
    const undoStack = [...history.undoStack];
    const topState = undoStack.pop();
    if (topState) {
      restoredState = cloneEntry(topState);
      history.undoStack = undoStack;
      history.redoStack = pushBoundedEntry(history.redoStack, currentEntry, input.maxEntries);
    }
  }

  return {
    changed: Boolean(restoredState),
    history,
    lastInputType: restoredState ? null : 'other',
    lastPushedValue: restoredState?.value || null,
    pendingState,
    restoredState
  };
}

export function prepareRedoHistory(input: PrepareUndoRedoHistoryInput): PrepareUndoRedoHistoryResult {
  const history = cloneHistory(input.history);
  const redoStack = [...history.redoStack];
  const restoredState = redoStack.pop() || null;

  if (!restoredState) {
    return {
      changed: false,
      history,
      lastInputType: 'other',
      lastPushedValue: null,
      pendingState: input.pendingState || null,
      restoredState: null
    };
  }

  return {
    changed: true,
    history: {
      undoStack: pushBoundedEntry(history.undoStack, getCurrentEntry(input), input.maxEntries),
      redoStack
    },
    lastInputType: null,
    lastPushedValue: restoredState.value,
    pendingState: null,
    restoredState: cloneEntry(restoredState)
  };
}
