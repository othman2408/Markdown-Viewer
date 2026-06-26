// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  FindReplaceEngine,
  validateBlockSyntax,
  type FindReplaceEditor
} from '../../../lib/modals/findReplaceEngine';

function createEditor(value: string, selectionStart = 0, selectionEnd = value.length): FindReplaceEditor {
  return {
    value,
    selectionStart,
    selectionEnd,
    dispatchEvent: vi.fn(() => true)
  };
}

describe('find/replace engine', () => {
  it('finds literal matches case-insensitively by default', () => {
    const editor = createEditor('Alpha alpha ALPHA');
    const engine = new FindReplaceEngine(editor);

    const matches = engine.executeSearch({
      query: 'alpha',
      scopeFilter: 'entire'
    });

    expect(matches.map((match) => [match.start, match.end, match.value])).toEqual([
      [0, 5, 'Alpha'],
      [6, 11, 'alpha'],
      [12, 17, 'ALPHA']
    ]);
    expect(engine.currentMatchIndex).toBe(0);
    expect(engine.history.find).toEqual(['alpha']);
  });

  it('supports whole-word and selection scoped search', () => {
    const editor = createEditor('cat scatter cat catalog', 8, 16);
    const engine = new FindReplaceEngine(editor);

    const matches = engine.executeSearch({
      query: 'cat',
      findInSelection: true,
      isWholeWord: true,
      scopeFilter: 'entire'
    });

    expect(matches.map((match) => match.start)).toEqual([12]);
  });

  it('throws invalid regex messages and ignores empty queries', () => {
    const editor = createEditor('abc');
    const engine = new FindReplaceEngine(editor);

    expect(() => engine.executeSearch({
      query: '(',
      isRegex: true,
      scopeFilter: 'entire'
    })).toThrow();

    expect(engine.executeSearch({ query: '', scopeFilter: 'entire' })).toEqual([]);
    expect(engine.currentMatchIndex).toBe(-1);
  });

  it('filters matches by markdown scopes using the injected lexer', () => {
    const editor = createEditor('# Title\n\n```mermaid\ngraph TD\n```\n\nplain graph');
    const engine = new FindReplaceEngine(editor, {
      marked: {
        lexer: () => [
          { type: 'heading', raw: '# Title' },
          { type: 'code', lang: 'mermaid', raw: '```mermaid\ngraph TD\n```' },
          { type: 'paragraph', raw: 'plain graph' }
        ]
      }
    });

    const matches = engine.executeSearch({
      query: 'graph',
      scopeFilter: 'mermaid'
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].value).toBe('graph');
    expect(matches[0].start).toBe(editor.value.indexOf('graph TD'));
  });

  it('applies regex capture groups and preserve-case replacement', () => {
    const editor = createEditor('HELLO Hello hello');
    const engine = new FindReplaceEngine(editor);
    const matches = engine.executeSearch({
      query: '(?<word>hello)',
      isRegex: true,
      scopeFilter: 'entire'
    });

    const delta = engine.executeReplace(matches[0], '$<word> friend', {
      isRegex: true,
      preserveCase: true
    });

    expect(delta).toBe('HELLO FRIEND'.length - 'HELLO'.length);
    expect(editor.value).toBe('HELLO FRIEND Hello hello');
    expect(editor.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'input' }));
    expect(engine.history.replace).toEqual(['$<word> friend']);
  });

  it('executes replace-all from the end of the document and builds diff drafts', () => {
    const editor = createEditor('foo foo foo');
    const engine = new FindReplaceEngine(editor);
    const matches = engine.executeSearch({
      query: 'foo',
      scopeFilter: 'entire'
    });

    const draft = engine.createReplacementDraft(editor.value, matches, 'bar', {});
    engine.executeReplaceAll(matches, 'bar', {});

    expect(draft).toBe('bar bar bar');
    expect(editor.value).toBe('bar bar bar');
    expect(editor.dispatchEvent).toHaveBeenCalledTimes(3);
  });

  it('moves duplicate history entries to the front and caps history at ten entries', () => {
    const editor = createEditor('');
    const engine = new FindReplaceEngine(editor);

    for (let index = 0; index < 12; index += 1) {
      engine.addHistory('find', `query-${index}`);
    }
    engine.addHistory('find', 'query-3');

    expect(engine.history.find).toHaveLength(10);
    expect(engine.history.find[0]).toBe('query-3');
    expect(engine.history.find).not.toContain('query-0');
  });

  it('validates protected block replacement syntax', () => {
    expect(validateBlockSyntax('$$x$$', '$$y$$', 'latex')).toEqual({ valid: true });
    expect(validateBlockSyntax('$$x$$', '$y$', 'latex')).toEqual({
      valid: false,
      reason: 'LaTeX math block delimiters are unbalanced.'
    });
    expect(validateBlockSyntax('graph TD', 'flowchart TD', 'mermaid')).toEqual({ valid: true });
    expect(validateBlockSyntax('graph TD', 'A --> B', 'mermaid')).toEqual({
      valid: false,
      reason: 'Missing diagram type definition (e.g. flowchart TD).'
    });
  });
});
