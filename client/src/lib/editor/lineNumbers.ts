export interface EditorWorkDelayThresholds {
  largeDocumentThreshold: number;
  hugeDocumentThreshold: number;
  largeEditorWorkDelay: number;
  hugeEditorWorkDelay: number;
}

export interface ActiveLineRange {
  lineIndex: number;
  start: number;
  end: number;
  text: string;
}

export interface LineNumberRow {
  lineIndex: number;
  label: string;
  heightPx: number;
  active: boolean;
}

export interface LineNumberRenderState {
  lineCount: number;
  gutterCh: number;
  rows: LineNumberRow[];
}

export interface BuildLineNumberRenderStateOptions {
  text: string;
  lineHeight: number;
  maxCharsPerLine: number;
  caret: number;
  minGutterCh?: number;
  gutterPaddingCh?: number;
  heightCache?: Map<string, number>;
  maxCacheEntries?: number;
}

export const DEFAULT_LINE_NUMBER_GUTTER_MIN_CH = 3;
export const DEFAULT_LINE_NUMBER_GUTTER_PADDING_CH = 1;
export const DEFAULT_LINE_NUMBER_CACHE_MAX_ENTRIES = 5000;

export function createEmptyLineNumberRenderState(): LineNumberRenderState {
  return {
    lineCount: 0,
    gutterCh: 0,
    rows: []
  };
}

export function countLinesFast(text: string): number {
  if (!text) return 1;
  let count = 1;
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) count += 1;
  }
  return count;
}

export function countLinesBeforeIndex(text: string, endIndex: number): number {
  let count = 0;
  const max = Math.max(0, Math.min(text.length, endIndex));
  for (let index = 0; index < max; index += 1) {
    if (text.charCodeAt(index) === 10) count += 1;
  }
  return count;
}

export function getWrappedLineCountMonospace(lineText: string, maxCharsPerLine: number): number {
  const safeMaxCharsPerLine = Math.max(1, Math.floor(maxCharsPerLine));
  if (!lineText) return 1;

  const words = lineText.replace(/\t/g, '    ').split(' ');
  let linesCount = 1;
  let currentLineLength = 0;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const wordLength = word.length;

    if (wordLength === 0) {
      if (currentLineLength + 1 > safeMaxCharsPerLine) {
        linesCount += 1;
        currentLineLength = 1;
      } else {
        currentLineLength += 1;
      }
      continue;
    }

    if (wordLength > safeMaxCharsPerLine) {
      const remainingSpace = safeMaxCharsPerLine - currentLineLength;
      if (remainingSpace > 0 && currentLineLength > 0) {
        const firstPart = wordLength - remainingSpace;
        linesCount += 1 + Math.floor(firstPart / safeMaxCharsPerLine);
        currentLineLength = firstPart % safeMaxCharsPerLine;
      } else {
        linesCount += Math.floor(wordLength / safeMaxCharsPerLine);
        currentLineLength = wordLength % safeMaxCharsPerLine;
      }
      continue;
    }

    const spaceRequired = currentLineLength === 0 ? 0 : 1;
    if (currentLineLength + spaceRequired + wordLength > safeMaxCharsPerLine) {
      linesCount += 1;
      currentLineLength = wordLength;
    } else {
      currentLineLength += spaceRequired + wordLength;
    }
  }

  return Math.max(1, linesCount);
}

export function getLineNumberGutterCh(
  lineCount: number,
  minGutterCh = DEFAULT_LINE_NUMBER_GUTTER_MIN_CH,
  gutterPaddingCh = DEFAULT_LINE_NUMBER_GUTTER_PADDING_CH
): number {
  const digits = String(Math.max(1, lineCount)).length;
  return Math.max(minGutterCh, digits + gutterPaddingCh);
}

export function getLineNumberRowHeight(
  lineText: string,
  lineHeight: number,
  maxCharsPerLine: number,
  heightCache?: Map<string, number>,
  maxCacheEntries = DEFAULT_LINE_NUMBER_CACHE_MAX_ENTRIES
): number {
  const cacheKey = `${maxCharsPerLine}:${lineHeight}:${lineText}`;
  const cached = heightCache?.get(cacheKey);
  if (cached !== undefined) return cached;

  const wrapCount = getWrappedLineCountMonospace(lineText, maxCharsPerLine);
  const heightPx = wrapCount * lineHeight;

  if (heightCache) {
    if (heightCache.size >= maxCacheEntries) heightCache.clear();
    heightCache.set(cacheKey, heightPx);
  }

  return heightPx;
}

export function getActiveLineRange(text: string, caret: number, lineCount = countLinesFast(text)): ActiveLineRange {
  const safeCaret = Math.max(0, Math.min(text.length, caret));
  const lineIndex = Math.min(Math.max(0, lineCount - 1), countLinesBeforeIndex(text, safeCaret));
  const start = text.lastIndexOf('\n', Math.max(0, safeCaret - 1)) + 1;
  const lineEndIndex = text.indexOf('\n', safeCaret);
  const end = lineEndIndex === -1 ? text.length : lineEndIndex;

  return {
    lineIndex,
    start,
    end,
    text: text.slice(start, end)
  };
}

export function buildLineNumberRenderState({
  text,
  lineHeight,
  maxCharsPerLine,
  caret,
  minGutterCh = DEFAULT_LINE_NUMBER_GUTTER_MIN_CH,
  gutterPaddingCh = DEFAULT_LINE_NUMBER_GUTTER_PADDING_CH,
  heightCache,
  maxCacheEntries = DEFAULT_LINE_NUMBER_CACHE_MAX_ENTRIES
}: BuildLineNumberRenderStateOptions): LineNumberRenderState {
  const lineCount = countLinesFast(text);
  const lines = text.split('\n');
  const activeLine = getActiveLineRange(text, caret, lineCount);
  const rows = lines.map((lineText, index) => ({
    lineIndex: index,
    label: String(index + 1),
    heightPx: getLineNumberRowHeight(lineText, lineHeight, maxCharsPerLine, heightCache, maxCacheEntries),
    active: index === activeLine.lineIndex
  }));

  return {
    lineCount,
    gutterCh: getLineNumberGutterCh(lineCount, minGutterCh, gutterPaddingCh),
    rows
  };
}

export function getEditorWorkDelay(markdown: string, thresholds: EditorWorkDelayThresholds): number {
  const length = markdown.length;
  if (length >= thresholds.hugeDocumentThreshold) return thresholds.hugeEditorWorkDelay;
  if (length >= thresholds.largeDocumentThreshold) return thresholds.largeEditorWorkDelay;
  return 0;
}
