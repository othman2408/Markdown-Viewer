import {
  LARGE_DOCUMENT_THRESHOLD,
  HUGE_DOCUMENT_THRESHOLD,
  LARGE_EDITOR_WORK_DELAY,
  HUGE_EDITOR_WORK_DELAY
} from '../config/appConfig';
import {
  buildLineNumberRenderState,
  countLinesFast as countEditorLinesFast,
  getActiveLineRange,
  getEditorWorkDelay as getLineNumberEditorWorkDelay,
  getLineNumberGutterCh,
  getLineNumberRowHeight,
  getWrappedLineCountMonospace
} from '../editor/lineNumbers';
import type { EditorStateSnapshot } from '../state/editor.svelte';

const LINE_NUMBER_GUTTER_MIN_CH = 3;
const LINE_NUMBER_GUTTER_PADDING_CH = 1;
const LINE_CACHE_MAX_ENTRIES = 5000;

type AnimationFrameHandle = ReturnType<Window['requestAnimationFrame']>;
type TimeoutHandle = ReturnType<typeof setTimeout>;
type SyncEditorState = (patch: Partial<EditorStateSnapshot>) => void;

export type LineNumberUpdateOptions = {
  delay?: number;
  force?: boolean;
  inputType?: string;
};

export type EditorScrollSnapshot = {
  scrollLeft: number;
  scrollTop: number;
};

export type EditorLayoutRuntimeOptions = {
  documentRef?: Document;
  editor: HTMLTextAreaElement;
  editorHighlightLayer: HTMLElement | null;
  isEditorVisible(): boolean;
  lineNumbers: HTMLElement | null;
  syncEditorState: SyncEditorState;
  updateFindHighlights(): void;
  windowRef?: Window;
};

export type EditorLayoutRuntime = {
  getScrollSnapshot(): EditorScrollSnapshot;
  initEditorGeometry(): void;
  refreshEditorWidth(): void;
  scheduleEditorOverlayScrollSync(): void;
  scheduleLineNumberUpdate(options?: LineNumberUpdateOptions): void;
  scrollActiveMatchIntoView(match: { start: number }): void;
  setScrollSnapshot(snapshot: EditorScrollSnapshot): void;
  syncEditorScrollOverlays(): void;
  syncHighlightScroll(): void;
  updateLineNumbers(options?: LineNumberUpdateOptions): void;
};

function getLineHeight(styles: CSSStyleDeclaration): number {
  const computed = parseFloat(styles.lineHeight);
  if (!Number.isNaN(computed)) return computed;

  const fontSize = parseFloat(styles.fontSize) || 14;
  return fontSize * 1.5;
}

export function createEditorLayoutRuntime(
  options: EditorLayoutRuntimeOptions
): EditorLayoutRuntime {
  const documentRef = options.documentRef ?? document;
  const windowRef = options.windowRef ?? window;
  const lineCache = new Map<string, number>();
  let lineNumberUpdateFrame: AnimationFrameHandle | null = null;
  let lineNumberUpdateTimeout: TimeoutHandle | null = null;
  let editorOverlayScrollFrame: AnimationFrameHandle | null = null;
  let cachedPaddingLeft = 10;
  let cachedPaddingRight = 10;
  let cachedCharWidth = 0;
  let cachedLineHeight = 21;
  let cachedEditorWidth = 0;
  let cachedMaxCharsPerLine = 80;
  let cachedScrollTop = 0;
  let cachedScrollLeft = 0;
  let isGeometryInitialized = false;
  let lastLineNumberLineCount = 0;
  let lastLineNumberRows: EditorStateSnapshot['lineNumbers']['rows'] = [];

  function syncHighlightScroll(): void {
    if (!options.editorHighlightLayer) return;
    options.editorHighlightLayer.scrollTop = cachedScrollTop;
    options.editorHighlightLayer.scrollLeft = cachedScrollLeft;
  }

  function syncLineNumberScroll(): void {
    if (!options.lineNumbers) return;
    options.lineNumbers.scrollTop = cachedScrollTop;
  }

  function scheduleEditorOverlayScrollSync(): void {
    if (editorOverlayScrollFrame) return;
    editorOverlayScrollFrame = windowRef.requestAnimationFrame(() => {
      editorOverlayScrollFrame = null;
      syncHighlightScroll();
      syncLineNumberScroll();
    });
  }

  function initEditorGeometry(): void {
    const styles = windowRef.getComputedStyle(options.editor);
    cachedPaddingLeft = parseFloat(styles.paddingLeft) || 10;
    cachedPaddingRight = parseFloat(styles.paddingRight) || 10;

    const testSpan = documentRef.createElement('span');
    testSpan.style.fontFamily = styles.fontFamily;
    testSpan.style.fontSize = styles.fontSize;
    testSpan.style.visibility = 'hidden';
    testSpan.style.position = 'absolute';
    testSpan.style.whiteSpace = 'pre';
    testSpan.textContent = 'a'.repeat(100);
    documentRef.body.appendChild(testSpan);
    cachedCharWidth = testSpan.getBoundingClientRect().width / 100;
    documentRef.body.removeChild(testSpan);
    cachedLineHeight = getLineHeight(styles);
    isGeometryInitialized = true;
    lineCache.clear();
  }

  function refreshEditorWidth(): void {
    if (!isGeometryInitialized) {
      initEditorGeometry();
    }

    cachedEditorWidth = options.editor.clientWidth;
    const availableWidth = cachedEditorWidth - cachedPaddingLeft - cachedPaddingRight;
    const nextMaxCharsPerLine = Math.max(1, Math.floor(availableWidth / cachedCharWidth));
    if (nextMaxCharsPerLine !== cachedMaxCharsPerLine) {
      cachedMaxCharsPerLine = nextMaxCharsPerLine;
      lineCache.clear();
    }
    cachedScrollTop = options.editor.scrollTop;
    cachedScrollLeft = options.editor.scrollLeft;
  }

  function syncLineNumberRowsState(lineNumberState: EditorStateSnapshot['lineNumbers']): void {
    lastLineNumberRows = lineNumberState.rows;
    lastLineNumberLineCount = lineNumberState.lineCount;
    options.syncEditorState({ lineNumbers: lineNumberState });
  }

  function buildFullLineNumberState(text: string, lineHeight: number): EditorStateSnapshot['lineNumbers'] {
    return buildLineNumberRenderState({
      text,
      lineHeight,
      maxCharsPerLine: cachedMaxCharsPerLine,
      caret: options.editor.selectionStart || 0,
      minGutterCh: LINE_NUMBER_GUTTER_MIN_CH,
      gutterPaddingCh: LINE_NUMBER_GUTTER_PADDING_CH,
      heightCache: lineCache,
      maxCacheEntries: LINE_CACHE_MAX_ENTRIES
    });
  }

  function syncActiveLineNumberState(text: string, lineCount: number, lineHeight: number): void {
    const activeLine = getActiveLineRange(text, options.editor.selectionStart || 0, lineCount);
    const rows = lastLineNumberRows.map((row, index) => {
      const active = index === activeLine.lineIndex;
      if (!active && !row.active) return row;
      const heightPx = active
        ? getLineNumberRowHeight(activeLine.text, lineHeight, cachedMaxCharsPerLine, lineCache, LINE_CACHE_MAX_ENTRIES)
        : row.heightPx;
      if (row.active === active && row.heightPx === heightPx) return row;

      return {
        ...row,
        active,
        heightPx
      };
    });
    syncLineNumberRowsState({
      lineCount,
      gutterCh: getLineNumberGutterCh(lineCount, LINE_NUMBER_GUTTER_MIN_CH, LINE_NUMBER_GUTTER_PADDING_CH),
      rows
    });
  }

  function updateLineNumbers(updateOptions?: LineNumberUpdateOptions): void {
    const opts = updateOptions || {};
    if (!options.lineNumbers) return;
    if (!options.isEditorVisible()) return;

    const text = options.editor.value || '';
    if (cachedEditorWidth === 0) {
      refreshEditorWidth();
    }

    const lineHeight = cachedLineHeight;
    const lineCount = countEditorLinesFast(text);
    const existingCount = lastLineNumberRows.length;
    const isLargeEditorDocument = text.length >= LARGE_DOCUMENT_THRESHOLD;
    const canUseActiveLineFastPath =
      isLargeEditorDocument &&
      !opts.force &&
      lineCount === lastLineNumberLineCount &&
      existingCount === lineCount;

    if (canUseActiveLineFastPath) {
      syncActiveLineNumberState(text, lineCount, lineHeight);
      syncLineNumberScroll();
      return;
    }

    const lineNumberState = buildFullLineNumberState(text, lineHeight);
    syncLineNumberRowsState(lineNumberState);
    syncLineNumberScroll();
  }

  function scheduleLineNumberUpdate(updateOptions?: LineNumberUpdateOptions): void {
    const opts = updateOptions || {};
    if (!options.lineNumbers) return;
    if (!options.isEditorVisible()) return;

    if (opts.force) {
      if (lineNumberUpdateTimeout) {
        windowRef.clearTimeout(lineNumberUpdateTimeout);
        lineNumberUpdateTimeout = null;
      }
      if (lineNumberUpdateFrame) {
        windowRef.cancelAnimationFrame(lineNumberUpdateFrame);
        lineNumberUpdateFrame = null;
      }
    } else if (lineNumberUpdateFrame || lineNumberUpdateTimeout) {
      return;
    }

    const text = options.editor.value || '';
    const delay = opts.delay !== undefined
      ? opts.delay
      : (opts.inputType === 'insertFromPaste' || text.length >= LARGE_DOCUMENT_THRESHOLD ? getLineNumberEditorWorkDelay(text, {
          largeDocumentThreshold: LARGE_DOCUMENT_THRESHOLD,
          hugeDocumentThreshold: HUGE_DOCUMENT_THRESHOLD,
          largeEditorWorkDelay: LARGE_EDITOR_WORK_DELAY,
          hugeEditorWorkDelay: HUGE_EDITOR_WORK_DELAY
        }) : 0);
    const runUpdate = () => {
      lineNumberUpdateFrame = windowRef.requestAnimationFrame(() => {
        lineNumberUpdateFrame = null;
        updateLineNumbers(opts);
      });
    };

    if (delay > 0) {
      lineNumberUpdateTimeout = windowRef.setTimeout(() => {
        lineNumberUpdateTimeout = null;
        runUpdate();
      }, delay);
    } else {
      runUpdate();
    }
  }

  function syncEditorScrollOverlays(): void {
    cachedScrollTop = options.editor.scrollTop;
    cachedScrollLeft = options.editor.scrollLeft;
    syncHighlightScroll();
    syncLineNumberScroll();
  }

  function clampEditorScrollTop(scrollTop: number): number {
    const maxScrollTop = Math.max(0, options.editor.scrollHeight - options.editor.clientHeight);
    return Math.min(maxScrollTop, Math.max(0, scrollTop));
  }

  function estimateEditorOffsetForIndex(index: number): number {
    if (!isGeometryInitialized || cachedEditorWidth !== options.editor.clientWidth) {
      refreshEditorWidth();
    }

    const styles = windowRef.getComputedStyle(options.editor);
    const paddingTop = parseFloat(styles.paddingTop) || 10;
    const textBefore = (options.editor.value || '').slice(0, Math.max(0, index));
    const lines = textBefore.split('\n');
    let visualRows = 0;
    for (let i = 0; i < lines.length - 1; i += 1) {
      visualRows += getWrappedLineCountMonospace(lines[i], cachedMaxCharsPerLine);
    }
    const currentLinePrefix = lines[lines.length - 1] || '';
    visualRows += Math.max(0, getWrappedLineCountMonospace(currentLinePrefix, cachedMaxCharsPerLine) - 1);
    return paddingTop + (visualRows * cachedLineHeight);
  }

  function getActiveFindHighlight(): HTMLElement | null {
    if (!options.editorHighlightLayer) return null;
    return options.editorHighlightLayer.querySelector('.find-highlight.active');
  }

  function scrollActiveMatchIntoView(match: { start: number }): void {
    let matchTop: number | null = null;
    let matchHeight = cachedLineHeight;
    let activeHighlight = getActiveFindHighlight();
    if (!activeHighlight) {
      options.updateFindHighlights();
      activeHighlight = getActiveFindHighlight();
    }
    if (activeHighlight) {
      matchTop = activeHighlight.offsetTop;
      matchHeight = activeHighlight.offsetHeight || matchHeight;
    } else {
      matchTop = estimateEditorOffsetForIndex(match.start);
    }

    const targetScrollTop = clampEditorScrollTop(
      matchTop - (options.editor.clientHeight / 2) + (matchHeight / 2)
    );
    options.editor.scrollTop = targetScrollTop;
    syncEditorScrollOverlays();
  }

  return {
    getScrollSnapshot() {
      return {
        scrollLeft: cachedScrollLeft,
        scrollTop: cachedScrollTop
      };
    },
    initEditorGeometry,
    refreshEditorWidth,
    scheduleEditorOverlayScrollSync,
    scheduleLineNumberUpdate,
    scrollActiveMatchIntoView,
    setScrollSnapshot(snapshot) {
      cachedScrollTop = snapshot.scrollTop;
      cachedScrollLeft = snapshot.scrollLeft;
    },
    syncEditorScrollOverlays,
    syncHighlightScroll,
    updateLineNumbers
  };
}
