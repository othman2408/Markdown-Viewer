// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  executeBulkFindReplace,
  renderFindReplaceReplacementDiff,
  replaceAllFindMatches,
  replaceCurrentFindMatch
} from '../../../lib/modals/findReplaceActions';
import {
  FindReplaceEngine,
  validateBlockSyntax,
  type FindReplaceEditor,
  type FindReplaceMatch
} from '../../../lib/modals/findReplaceEngine';

function createEditor(value: string): FindReplaceEditor {
  return {
    value,
    selectionEnd: value.length,
    selectionStart: 0,
    dispatchEvent: vi.fn(() => true)
  };
}

describe('find/replace action helpers', () => {
  it('replaces the active match and selects the next valid match', () => {
    const editor = createEditor('foo foo');
    const engine = new FindReplaceEngine(editor);
    let matches = engine.executeSearch({ query: 'foo', scopeFilter: 'entire' });
    let activeIndex = 1;
    const refreshFindMatches = vi.fn(() => {
      matches = engine.executeSearch({ query: 'foo', scopeFilter: 'entire' });
    });
    const selectActiveMatch = vi.fn();

    expect(replaceCurrentFindMatch({
      activeIndex,
      engine,
      getMatches: () => matches,
      getReplacement: () => 'bar',
      getScopeFilter: () => 'entire',
      isRegex: false,
      matches,
      preserveCase: false,
      refreshFindMatches,
      selectActiveMatch,
      setActiveIndex(index) {
        activeIndex = index;
      },
      validateBlockSyntax
    })).toBe(true);

    expect(editor.value).toBe('foo bar');
    expect(refreshFindMatches).toHaveBeenCalledOnce();
    expect(activeIndex).toBe(0);
    expect(selectActiveMatch).toHaveBeenCalledOnce();
  });

  it('blocks protected-scope replacement when syntax validation fails', () => {
    const editor = createEditor('graph TD');
    const engine = new FindReplaceEngine(editor);
    const match: FindReplaceMatch = {
      end: 8,
      groups: null,
      matchArray: null,
      start: 0,
      value: 'graph TD'
    };
    const alertRef = vi.fn();
    const refreshFindMatches = vi.fn();

    expect(replaceCurrentFindMatch({
      activeIndex: 0,
      alertRef,
      engine,
      getMatches: () => [match],
      getReplacement: () => 'A --> B',
      getScopeFilter: () => 'mermaid',
      isRegex: false,
      matches: [match],
      preserveCase: false,
      refreshFindMatches,
      selectActiveMatch: vi.fn(),
      setActiveIndex: vi.fn(),
      validateBlockSyntax
    })).toBe(true);

    expect(editor.value).toBe('graph TD');
    expect(alertRef).toHaveBeenCalledWith('Blocked replacement: Missing diagram type definition (e.g. flowchart TD).');
    expect(refreshFindMatches).not.toHaveBeenCalled();
  });

  it('executes bulk replacement and refreshes from the start', () => {
    const editor = createEditor('foo foo foo');
    const engine = new FindReplaceEngine(editor);
    let matches = engine.executeSearch({ query: 'foo', scopeFilter: 'entire' });
    const refreshFindMatches = vi.fn(() => {
      matches = engine.executeSearch({ query: 'foo', scopeFilter: 'entire' });
    });
    const selectActiveMatch = vi.fn();

    expect(executeBulkFindReplace({
      engine,
      getMatches: () => matches,
      getReplacement: () => 'bar',
      isRegex: false,
      matches,
      preserveCase: false,
      refreshFindMatches,
      selectActiveMatch
    })).toBe(true);

    expect(editor.value).toBe('bar bar bar');
    expect(refreshFindMatches).toHaveBeenCalledWith({ resetIndex: true });
    expect(selectActiveMatch).not.toHaveBeenCalled();
  });

  it('routes replace-all through diff preview when requested', () => {
    const editor = createEditor('foo foo');
    const engine = new FindReplaceEngine(editor);
    const matches = engine.executeSearch({ query: 'foo', scopeFilter: 'entire' });
    const renderDiffPreview = vi.fn();
    const refreshFindMatches = vi.fn();

    expect(replaceAllFindMatches({
      engine,
      getMatches: () => matches,
      getReplacement: () => 'bar',
      isRegex: false,
      markdownValue: editor.value,
      matches,
      preserveCase: false,
      refreshFindMatches,
      renderDiffPreview,
      selectActiveMatch: vi.fn(),
      showDiff: true
    })).toBe(true);

    expect(editor.value).toBe('foo foo');
    expect(refreshFindMatches).not.toHaveBeenCalled();
    expect(renderDiffPreview).toHaveBeenCalledWith({
      originalValue: 'foo foo',
      draftValue: 'bar bar'
    });
  });

  it('renders a replacement diff directly', () => {
    const editor = createEditor('Hello hello');
    const engine = new FindReplaceEngine(editor);
    const matches = engine.executeSearch({
      query: 'hello',
      scopeFilter: 'entire'
    });
    const renderDiffPreview = vi.fn();

    expect(renderFindReplaceReplacementDiff({
      engine,
      getReplacement: () => 'world',
      isRegex: false,
      markdownValue: editor.value,
      matches,
      preserveCase: true,
      renderDiffPreview
    })).toBe(true);

    expect(renderDiffPreview).toHaveBeenCalledWith({
      originalValue: 'Hello hello',
      draftValue: 'World world'
    });
  });
});
