export type FindReplaceHistoryType = 'find' | 'replace';

export interface FindReplaceEditor {
  dispatchEvent(event: Event): boolean;
  selectionEnd: number;
  selectionStart: number;
  value: string;
}

export interface FindReplaceMatch {
  end: number;
  groups: Record<string, string> | null;
  matchArray: RegExpExecArray | null;
  start: number;
  value: string;
}

export interface FindReplaceSearchOptions {
  findInSelection?: boolean;
  isCaseSensitive?: boolean;
  isRegex?: boolean;
  isWholeWord?: boolean;
  query: string;
  scopeFilter?: string;
}

export interface FindReplaceReplaceOptions {
  isRegex?: boolean;
  preserveCase?: boolean;
}

export interface FindReplaceHistory {
  find: string[];
  replace: string[];
}

interface MarkedToken {
  lang?: string;
  raw: string;
  tokens?: MarkedToken[];
  type: string;
}

interface MarkedLike {
  lexer?: (text: string) => MarkedToken[];
}

export interface FindReplaceEngineOptions {
  marked?: MarkedLike;
  warn?: (...args: unknown[]) => void;
}

export interface FindReplaceScopeEntry {
  end: number;
  scope: string;
  start: number;
  type: string;
}

export interface BlockSyntaxValidationResult {
  reason?: string;
  valid: boolean;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class FindReplaceEngine {
  activeMatches: FindReplaceMatch[] = [];
  currentMatchIndex = -1;
  history: FindReplaceHistory = { find: [], replace: [] };

  private cachedScopeMap: FindReplaceScopeEntry[] | null = null;
  private cachedScopeText: string | null = null;
  private readonly editor: FindReplaceEditor;
  private readonly marked?: MarkedLike;
  private readonly warn: (...args: unknown[]) => void;

  constructor(editor: FindReplaceEditor, options: FindReplaceEngineOptions = {}) {
    this.editor = editor;
    this.marked = options.marked;
    this.warn = options.warn ?? console.warn;
  }

  buildASTScopeMap(text: string): FindReplaceScopeEntry[] {
    if (text === this.cachedScopeText && this.cachedScopeMap) {
      return this.cachedScopeMap;
    }
    if (!this.marked?.lexer) return [];

    try {
      const tokens = this.marked.lexer(text);
      const scopeMap: FindReplaceScopeEntry[] = [];
      let currentIndex = 0;
      const traverse = (tokenList: MarkedToken[]) => {
        for (const token of tokenList) {
          const start = text.indexOf(token.raw, currentIndex);
          if (start === -1) continue;
          const end = start + token.raw.length;
          currentIndex = end;
          let scope = 'plain';
          if (token.type === 'heading') scope = 'heading';
          else if (token.type === 'code') {
            if (token.lang === 'mermaid') scope = 'mermaid';
            else scope = 'code';
          } else if (token.type === 'paragraph' && token.raw.startsWith('$$') && token.raw.endsWith('$$')) {
            scope = 'latex';
          }
          scopeMap.push({ start, end, scope, type: token.type });
          if (token.tokens) traverse(token.tokens);
        }
      };
      traverse(tokens);
      this.cachedScopeText = text;
      this.cachedScopeMap = scopeMap;
      return scopeMap;
    } catch (error) {
      this.warn('AST scope parsing failed:', error);
      return [];
    }
  }

  compileRegExp(
    query: string,
    isRegex?: boolean,
    isCaseSensitive?: boolean,
    isWholeWord?: boolean
  ): RegExp | null {
    if (!query) return null;
    let pattern = isRegex ? query : escapeRegExp(query);
    if (isWholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    const flags = isCaseSensitive ? 'gd' : 'gid';
    return new RegExp(pattern, flags);
  }

  executeSearch(options: FindReplaceSearchOptions): FindReplaceMatch[] {
    const {
      query,
      isRegex,
      isCaseSensitive,
      isWholeWord,
      scopeFilter,
      findInSelection
    } = options;
    const fullText = this.editor.value || '';
    const searchRange = {
      start: findInSelection ? this.editor.selectionStart : 0,
      end: findInSelection ? this.editor.selectionEnd : fullText.length
    };

    let regex: RegExp | null;
    try {
      regex = this.compileRegExp(query, isRegex, isCaseSensitive, isWholeWord);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
    if (!regex) {
      this.activeMatches = [];
      this.currentMatchIndex = -1;
      return this.activeMatches;
    }

    const rawMatches: FindReplaceMatch[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(fullText)) !== null) {
      if (match.index >= searchRange.end) break;
      if (match.index >= searchRange.start) {
        rawMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          value: match[0],
          groups: match.groups || null,
          matchArray: match
        });
      }
      if (regex.lastIndex === match.index) {
        regex.lastIndex += 1;
      }
    }

    if (scopeFilter && scopeFilter !== 'entire') {
      const scopeMap = this.buildASTScopeMap(fullText);
      this.activeMatches = rawMatches.filter((candidate) => {
        const matchingScope = scopeMap.find((scope) => (
          candidate.start >= scope.start && candidate.end <= scope.end
        ));
        return Boolean(matchingScope && matchingScope.scope === scopeFilter);
      });
    } else {
      this.activeMatches = rawMatches;
    }

    this.currentMatchIndex = this.activeMatches.length > 0 ? 0 : -1;
    this.addHistory('find', query);
    return this.activeMatches;
  }

  preserveCase(source: string, replacement: string): string {
    if (source === source.toUpperCase()) {
      return replacement.toUpperCase();
    }
    if (source === source.toLowerCase()) {
      return replacement.toLowerCase();
    }
    if (source[0] === source[0].toUpperCase() && source.slice(1) === source.slice(1).toLowerCase()) {
      return replacement[0].toUpperCase() + replacement.slice(1).toLowerCase();
    }
    return replacement;
  }

  applyCaptureGroups(match: FindReplaceMatch, replacementTemplate: string): string {
    if (!match.matchArray) return replacementTemplate;
    let result = replacementTemplate;
    result = result.replace(/\$(\d+)/g, (token, number) => {
      const index = parseInt(number, 10);
      return match.matchArray?.[index] !== undefined ? match.matchArray[index] : token;
    });
    if (match.groups) {
      result = result.replace(/\$<([^>]+)>/g, (token, name) => {
        return match.groups?.[name] !== undefined ? match.groups[name] : token;
      });
    }
    return result;
  }

  prepareReplacement(
    match: FindReplaceMatch,
    replacementTemplate: string,
    options: FindReplaceReplaceOptions
  ): string {
    const { preserveCase, isRegex } = options;
    let finalReplacement = replacementTemplate;
    if (isRegex) {
      finalReplacement = this.applyCaptureGroups(match, finalReplacement);
    }
    if (preserveCase) {
      finalReplacement = this.preserveCase(match.value, finalReplacement);
    }
    return finalReplacement;
  }

  executeReplace(
    match: FindReplaceMatch,
    replacementTemplate: string,
    options: FindReplaceReplaceOptions
  ): number {
    const text = this.editor.value;
    const finalReplacement = this.prepareReplacement(match, replacementTemplate, options);
    const before = text.slice(0, match.start);
    const after = text.slice(match.end);
    this.editor.value = before + finalReplacement + after;
    this.editor.dispatchEvent(new Event('input', { bubbles: true }));
    this.addHistory('replace', replacementTemplate);
    return finalReplacement.length - match.value.length;
  }

  executeReplaceAll(
    matches: FindReplaceMatch[],
    replacementTemplate: string,
    options: FindReplaceReplaceOptions
  ): void {
    const matchesCopy = [...matches];
    matchesCopy.sort((a, b) => b.start - a.start);
    for (const match of matchesCopy) {
      this.executeReplace(match, replacementTemplate, options);
    }
  }

  createReplacementDraft(
    text: string,
    matches: FindReplaceMatch[],
    replacementTemplate: string,
    options: FindReplaceReplaceOptions
  ): string {
    const matchesCopy = [...matches];
    matchesCopy.sort((a, b) => b.start - a.start);
    let draftValue = text;
    for (const match of matchesCopy) {
      const finalReplacement = this.prepareReplacement(match, replacementTemplate, options);
      draftValue = draftValue.slice(0, match.start) + finalReplacement + draftValue.slice(match.end);
    }
    return draftValue;
  }

  addHistory(type: FindReplaceHistoryType, query: string): void {
    if (!query) return;
    const list = this.history[type];
    const index = list.indexOf(query);
    if (index !== -1) {
      list.splice(index, 1);
    }
    list.unshift(query);
    if (list.length > 10) {
      list.pop();
    }
  }
}

export function validateBlockSyntax(
  originalBlockText: string,
  newBlockText: string,
  scope: string
): BlockSyntaxValidationResult {
  if (scope === 'latex') {
    const origDisplay = (originalBlockText.match(/\$\$/g) || []).length;
    const newDisplay = (newBlockText.match(/\$\$/g) || []).length;
    const origInline = (originalBlockText.match(/[^\$]\$[^\$]/g) || []).length;
    const newInline = (newBlockText.match(/[^\$]\$[^\$]/g) || []).length;
    if (origDisplay !== newDisplay || origInline !== newInline) {
      return { valid: false, reason: 'LaTeX math block delimiters are unbalanced.' };
    }
  }
  if (scope === 'mermaid') {
    const diagramTypePattern = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram-v2|erDiagram|gantt|pie|quadrantChart|c4Context|mindmap|timeline|zenuml)/i;
    if (!diagramTypePattern.test(newBlockText.trim())) {
      return { valid: false, reason: 'Missing diagram type definition (e.g. flowchart TD).' };
    }
  }
  return { valid: true };
}
