import { describe, expect, it } from 'vitest';
import {
  createEditorHistoryEntry,
  createEditorHistoryStack,
  getEditorHistoryAvailability,
  initializeEditorHistory,
  prepareKeystrokeHistory,
  preparePendingHistoryCommit,
  prepareProgrammaticHistoryCommit,
  prepareRedoHistory,
  prepareUndoHistory
} from '../../../lib/editor/history';

describe('editor history helpers', () => {
  it('initializes an empty history stack once', () => {
    const initialized = initializeEditorHistory(createEditorHistoryStack(), 'Initial');
    const second = initializeEditorHistory(initialized.history, 'Other');

    expect(initialized.initialized).toBe(true);
    expect(initialized.lastPushedValue).toBe('Initial');
    expect(initialized.history.undoStack).toEqual([
      { value: 'Initial', selectionStart: 0, selectionEnd: 0 }
    ]);
    expect(second.initialized).toBe(false);
    expect(second.history).toBe(initialized.history);
  });

  it('commits pending or current programmatic states while clearing redo', () => {
    const history = {
      undoStack: [createEditorHistoryEntry('Initial', 0, 0)],
      redoStack: [createEditorHistoryEntry('Redo', 1, 1)]
    };

    const pending = prepareProgrammaticHistoryCommit({
      history,
      currentValue: 'Current',
      lastPushedValue: 'Initial',
      pendingState: createEditorHistoryEntry('Pending', 2, 3),
      selectionStart: 7,
      selectionEnd: 7
    });
    const current = prepareProgrammaticHistoryCommit({
      history,
      currentValue: 'Changed',
      lastPushedValue: 'Initial',
      pendingState: null,
      selectionStart: 4,
      selectionEnd: 5
    });

    expect(pending.changed).toBe(true);
    expect(pending.pendingState).toBeNull();
    expect(pending.lastPushedValue).toBe('Current');
    expect(pending.history.undoStack.map((entry) => entry.value)).toEqual(['Initial', 'Pending']);
    expect(pending.history.redoStack).toEqual([]);
    expect(current.history.undoStack.at(-1)).toEqual({
      value: 'Changed',
      selectionStart: 4,
      selectionEnd: 5
    });
  });

  it('commits pending typing state with bounded undo history', () => {
    const history = {
      undoStack: [createEditorHistoryEntry('one'), createEditorHistoryEntry('two')],
      redoStack: [createEditorHistoryEntry('redo')]
    };

    const result = preparePendingHistoryCommit({
      history,
      currentValue: 'three',
      pendingState: createEditorHistoryEntry('pending'),
      maxEntries: 2
    });

    expect(result.changed).toBe(true);
    expect(result.lastPushedValue).toBe('three');
    expect(result.history.undoStack.map((entry) => entry.value)).toEqual(['two', 'pending']);
    expect(result.history.redoStack).toEqual([]);
  });

  it('prepares keystroke pending states and commit boundaries', () => {
    const first = prepareKeystrokeHistory({
      currentValue: 'Hello',
      lastPushedValue: '',
      lastCursorStart: 0,
      lastCursorEnd: 0,
      lastInputType: null,
      pendingState: null,
      inputType: 'insertText',
      data: 'o'
    });
    const spaced = prepareKeystrokeHistory({
      currentValue: 'Hello ',
      lastPushedValue: '',
      lastCursorStart: 0,
      lastCursorEnd: 0,
      lastInputType: 'insert',
      pendingState: first.pendingState,
      inputType: 'insertText',
      data: ' '
    });
    const deleteAfterInsert = prepareKeystrokeHistory({
      currentValue: 'Hell',
      lastPushedValue: '',
      lastCursorStart: 0,
      lastCursorEnd: 0,
      lastInputType: 'insert',
      pendingState: first.pendingState,
      inputType: 'deleteContentBackward'
    });

    expect(first).toMatchObject({
      changed: true,
      nextInputType: 'insert',
      shouldCommit: false
    });
    expect(first.pendingState).toEqual({
      value: '',
      selectionStart: 0,
      selectionEnd: 0
    });
    expect(spaced.shouldCommit).toBe(true);
    expect(deleteAfterInsert).toMatchObject({
      nextInputType: 'delete',
      shouldCommit: true
    });
  });

  it('reports undo and redo availability from stacks plus pending state', () => {
    expect(getEditorHistoryAvailability(createEditorHistoryStack(), null)).toEqual({
      canUndo: false,
      canRedo: false
    });
    expect(getEditorHistoryAvailability(createEditorHistoryStack(), createEditorHistoryEntry('pending'))).toEqual({
      canUndo: true,
      canRedo: false
    });
    expect(getEditorHistoryAvailability({
      undoStack: [],
      redoStack: [createEditorHistoryEntry('redo')]
    }, null)).toEqual({
      canUndo: false,
      canRedo: true
    });
  });

  it('prepares undo from pending state or undo stack while recording redo', () => {
    const fromPending = prepareUndoHistory({
      history: createEditorHistoryStack(),
      currentValue: 'Current',
      selectionStart: 7,
      selectionEnd: 7,
      pendingState: createEditorHistoryEntry('Pending', 1, 2)
    });
    const fromStack = prepareUndoHistory({
      history: {
        undoStack: [createEditorHistoryEntry('Initial', 0, 0), createEditorHistoryEntry('Before', 3, 3)],
        redoStack: []
      },
      currentValue: 'Current',
      selectionStart: 7,
      selectionEnd: 7,
      pendingState: null
    });

    expect(fromPending.restoredState).toEqual({
      value: 'Pending',
      selectionStart: 1,
      selectionEnd: 2
    });
    expect(fromPending.history.redoStack).toEqual([
      { value: 'Current', selectionStart: 7, selectionEnd: 7 }
    ]);
    expect(fromStack.restoredState?.value).toBe('Before');
    expect(fromStack.history.undoStack.map((entry) => entry.value)).toEqual(['Initial']);
    expect(fromStack.history.redoStack.map((entry) => entry.value)).toEqual(['Current']);
  });

  it('prepares redo by moving current state to undo', () => {
    const result = prepareRedoHistory({
      history: {
        undoStack: [createEditorHistoryEntry('Initial')],
        redoStack: [createEditorHistoryEntry('Redo', 4, 5)]
      },
      currentValue: 'Current',
      selectionStart: 1,
      selectionEnd: 1,
      pendingState: createEditorHistoryEntry('Ignored pending')
    });

    expect(result.changed).toBe(true);
    expect(result.pendingState).toBeNull();
    expect(result.restoredState).toEqual({
      value: 'Redo',
      selectionStart: 4,
      selectionEnd: 5
    });
    expect(result.history.undoStack.map((entry) => entry.value)).toEqual(['Initial', 'Current']);
    expect(result.history.redoStack).toEqual([]);
  });
});
