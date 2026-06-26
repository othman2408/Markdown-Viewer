import { describe, expect, it } from 'vitest';
import {
  buildLineNumberRenderState,
  countLinesBeforeIndex,
  countLinesFast,
  getActiveLineRange,
  getEditorWorkDelay,
  getLineNumberGutterCh,
  getLineNumberRowHeight,
  getWrappedLineCountMonospace
} from '../../../lib/editor/lineNumbers';

describe('editor line number helpers', () => {
  it('counts physical markdown lines like the editor', () => {
    expect(countLinesFast('')).toBe(1);
    expect(countLinesFast('one')).toBe(1);
    expect(countLinesFast('one\ntwo\n')).toBe(3);
    expect(countLinesBeforeIndex('one\ntwo\nthree', 0)).toBe(0);
    expect(countLinesBeforeIndex('one\ntwo\nthree', 4)).toBe(1);
    expect(countLinesBeforeIndex('one\ntwo\nthree', 999)).toBe(2);
  });

  it('estimates monospace wrapped line rows using the word wrapping algorithm', () => {
    expect(getWrappedLineCountMonospace('', 8)).toBe(1);
    expect(getWrappedLineCountMonospace('one two', 8)).toBe(1);
    expect(getWrappedLineCountMonospace('one two three', 8)).toBe(2);
    expect(getWrappedLineCountMonospace('supercalifragilistic', 8)).toBe(3);
    expect(getWrappedLineCountMonospace('one  two', 4)).toBe(2);
    expect(getWrappedLineCountMonospace('one\ttwo', 6)).toBe(2);
  });

  it('finds the active line range from the caret position', () => {
    expect(getActiveLineRange('alpha\nbeta\ngamma', 7)).toEqual({
      lineIndex: 1,
      start: 6,
      end: 10,
      text: 'beta'
    });

    expect(getActiveLineRange('alpha\nbeta', 999)).toEqual({
      lineIndex: 1,
      start: 6,
      end: 10,
      text: 'beta'
    });
  });

  it('builds Svelte line-number render rows from editor geometry', () => {
    const state = buildLineNumberRenderState({
      text: 'alpha\nbeta gamma delta\nomega',
      lineHeight: 20,
      maxCharsPerLine: 8,
      caret: 8
    });

    expect(state.lineCount).toBe(3);
    expect(state.gutterCh).toBe(3);
    expect(state.rows).toEqual([
      { lineIndex: 0, label: '1', heightPx: 20, active: false },
      { lineIndex: 1, label: '2', heightPx: 60, active: true },
      { lineIndex: 2, label: '3', heightPx: 20, active: false }
    ]);
  });

  it('sizes gutters and can cache wrapped row heights', () => {
    const cache = new Map<string, number>();

    expect(getLineNumberGutterCh(9)).toBe(3);
    expect(getLineNumberGutterCh(100)).toBe(4);
    expect(getLineNumberRowHeight('one two three', 10, 8, cache)).toBe(20);
    expect(cache.size).toBe(1);
    expect(getLineNumberRowHeight('one two three', 10, 8, cache)).toBe(20);
    expect(cache.size).toBe(1);
  });

  it('keeps line-number work delay thresholds outside the app runtime file', () => {
    const thresholds = {
      largeDocumentThreshold: 100,
      hugeDocumentThreshold: 500,
      largeEditorWorkDelay: 20,
      hugeEditorWorkDelay: 50
    };

    expect(getEditorWorkDelay('x'.repeat(99), thresholds)).toBe(0);
    expect(getEditorWorkDelay('x'.repeat(100), thresholds)).toBe(20);
    expect(getEditorWorkDelay('x'.repeat(500), thresholds)).toBe(50);
  });
});
