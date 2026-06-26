import { describe, expect, it } from 'vitest';
import { createEditorInputSnapshot, getTextareaSelection, mergeEditorInputSnapshot } from '../../../lib/editor/inputSnapshot';

describe('editor input snapshots', () => {
  it('normalizes textarea selection direction and positions', () => {
    expect(getTextareaSelection({
      value: '',
      selectionStart: 2.8,
      selectionEnd: 5.2,
      selectionDirection: 'backward',
      scrollTop: 0,
      scrollLeft: 0
    })).toEqual({
      start: 2,
      end: 5,
      direction: 'backward'
    });

    expect(getTextareaSelection({
      value: '',
      selectionStart: -1,
      selectionEnd: Number.NaN,
      selectionDirection: 'sideways',
      scrollTop: 0,
      scrollLeft: 0
    })).toEqual({
      start: 0,
      end: 0,
      direction: 'none'
    });
  });

  it('creates snapshots with optional document stats', () => {
    const snapshot = createEditorInputSnapshot({
      value: 'one two',
      selectionStart: 1,
      selectionEnd: 3,
      selectionDirection: 'forward',
      scrollTop: 12,
      scrollLeft: 4
    }, { includeStats: true });

    expect(snapshot).toEqual({
      value: 'one two',
      selection: {
        start: 1,
        end: 3,
        direction: 'forward'
      },
      scrollTop: 12,
      scrollLeft: 4,
      stats: {
        charCount: 7,
        wordCount: 2,
        readingTimeMinutes: 1
      }
    });
  });

  it('merges snapshots without replacing unchanged state objects', () => {
    const state = {
      value: 'same',
      selection: {
        start: 0,
        end: 0,
        direction: 'none' as const
      },
      scrollTop: 0,
      scrollLeft: 0,
      stats: {
        charCount: 4,
        wordCount: 1,
        readingTimeMinutes: 1
      },
      canUndo: false
    };

    const unchanged = mergeEditorInputSnapshot(state, {
      value: 'same',
      selection: state.selection,
      scrollTop: 0,
      scrollLeft: 0
    });
    const changed = mergeEditorInputSnapshot(state, {
      value: 'changed',
      selection: {
        start: 7,
        end: 7,
        direction: 'none'
      },
      scrollTop: 3,
      scrollLeft: 1,
      stats: {
        charCount: 7,
        wordCount: 1,
        readingTimeMinutes: 1
      }
    });

    expect(unchanged).toBe(state);
    expect(changed).toEqual({
      ...state,
      value: 'changed',
      selection: {
        start: 7,
        end: 7,
        direction: 'none'
      },
      scrollTop: 3,
      scrollLeft: 1,
      stats: {
        charCount: 7,
        wordCount: 1,
        readingTimeMinutes: 1
      }
    });
  });
});
