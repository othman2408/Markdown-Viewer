import type {
  FindReplaceMatch,
  FindReplaceReplaceOptions
} from './findReplaceEngine';

export interface FindReplaceActionEngine {
  createReplacementDraft(
    text: string,
    matches: FindReplaceMatch[],
    replacementTemplate: string,
    options: FindReplaceReplaceOptions
  ): string;
  executeReplace(
    match: FindReplaceMatch,
    replacementTemplate: string,
    options: FindReplaceReplaceOptions
  ): number;
  executeReplaceAll(
    matches: FindReplaceMatch[],
    replacementTemplate: string,
    options: FindReplaceReplaceOptions
  ): void;
}

export interface FindReplaceActionOptions {
  activeIndex: number;
  alertRef?: (message: string) => void;
  engine: FindReplaceActionEngine;
  getMatches: () => FindReplaceMatch[];
  getReplacement: () => string;
  getScopeFilter: () => string;
  isRegex: boolean;
  matches: FindReplaceMatch[];
  preserveCase: boolean;
  refreshFindMatches: (options?: { resetIndex?: boolean }) => void;
  selectActiveMatch: () => void;
  setActiveIndex: (index: number) => void;
  validateBlockSyntax: (
    originalBlockText: string,
    newBlockText: string,
    scope: string
  ) => {
    reason?: string;
    valid: boolean;
  };
}

export interface FindReplaceBulkActionOptions {
  engine: FindReplaceActionEngine;
  getMatches: () => FindReplaceMatch[];
  getReplacement: () => string;
  isRegex: boolean;
  matches: FindReplaceMatch[];
  preserveCase: boolean;
  refreshFindMatches: (options?: { resetIndex?: boolean }) => void;
  selectActiveMatch: () => void;
}

export interface FindReplaceDiffActionOptions {
  engine: FindReplaceActionEngine;
  getReplacement: () => string;
  isRegex: boolean;
  markdownValue: string;
  matches: FindReplaceMatch[];
  preserveCase: boolean;
  renderDiffPreview: (input: {
    draftValue: string;
    originalValue: string;
  }) => void;
}

export interface FindReplaceReplaceAllOptions extends FindReplaceBulkActionOptions {
  markdownValue: string;
  renderDiffPreview: FindReplaceDiffActionOptions['renderDiffPreview'];
  showDiff: boolean;
}

function getReplaceOptions(input: {
  isRegex: boolean;
  preserveCase: boolean;
}): FindReplaceReplaceOptions {
  return {
    preserveCase: input.preserveCase,
    isRegex: input.isRegex
  };
}

export function replaceCurrentFindMatch(options: FindReplaceActionOptions): boolean {
  if (!options.matches.length || options.activeIndex < 0) return false;

  const replacement = options.getReplacement();
  const match = options.matches[options.activeIndex];
  const scopeFilter = options.getScopeFilter();

  if (scopeFilter === 'latex' || scopeFilter === 'mermaid') {
    const syntaxCheck = options.validateBlockSyntax(match.value, replacement, scopeFilter);
    if (!syntaxCheck.valid) {
      options.alertRef?.(`Blocked replacement: ${syntaxCheck.reason}`);
      return true;
    }
  }

  options.engine.executeReplace(match, replacement, getReplaceOptions(options));
  options.refreshFindMatches();

  const refreshedMatches = options.getMatches();
  if (refreshedMatches.length) {
    options.setActiveIndex(Math.min(options.activeIndex, refreshedMatches.length - 1));
    options.selectActiveMatch();
  }

  return true;
}

export function executeBulkFindReplace(options: FindReplaceBulkActionOptions): boolean {
  if (!options.matches.length) return false;

  options.engine.executeReplaceAll(
    options.matches,
    options.getReplacement(),
    getReplaceOptions(options)
  );
  options.refreshFindMatches({ resetIndex: true });

  if (options.getMatches().length) {
    options.selectActiveMatch();
  }

  return true;
}

export function renderFindReplaceReplacementDiff(options: FindReplaceDiffActionOptions): boolean {
  if (!options.matches.length) return false;

  const draftValue = options.engine.createReplacementDraft(
    options.markdownValue,
    options.matches,
    options.getReplacement(),
    getReplaceOptions(options)
  );

  options.renderDiffPreview({
    originalValue: options.markdownValue,
    draftValue
  });

  return true;
}

export function replaceAllFindMatches(options: FindReplaceReplaceAllOptions): boolean {
  if (!options.matches.length) return false;

  if (options.showDiff) {
    return renderFindReplaceReplacementDiff(options);
  }

  return executeBulkFindReplace(options);
}
