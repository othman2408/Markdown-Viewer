// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import EditorWorkspace from '../../components/EditorWorkspace.svelte';
import { createEmptyLineNumberRenderState } from '../../lib/editor/lineNumbers';
import { editorState } from '../../lib/state/editor.svelte';
import { uiState } from '../../lib/state/ui.svelte';

declare global {
  interface Window {
    markdownViewerPaneResizer?: {
      apply(): void;
      reset(): void;
      refreshLayout(): void;
    };
    markdownViewerEditorGeometry?: {
      refreshAfterPaneLayout(): void;
    };
  }
}

function resetEditorState() {
  editorState.replace({
    value: '',
    stats: {
      charCount: 0,
      wordCount: 0,
      readingTimeMinutes: 0
    },
    selection: {
      start: 0,
      end: 0,
      direction: 'none'
    },
    scrollTop: 0,
    scrollLeft: 0,
    viewMode: 'split',
    syncScrollingEnabled: true,
    canUndo: false,
    canRedo: false,
    direction: 'ltr',
    lineNumbers: createEmptyLineNumberRenderState()
  });
}

function resetUiState() {
  uiState.replace({
    theme: 'light',
    mobileMenuOpen: false,
    viewMode: 'split'
  });
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width
  });
}

describe('EditorWorkspace', () => {
  const defaultViewportWidth = window.innerWidth;

  beforeEach(() => {
    setViewportWidth(defaultViewportWidth);
    resetEditorState();
    resetUiState();
  });

  afterEach(() => {
    cleanup();
    document.body.classList.remove('resizing');
    delete window.markdownViewerEditorGeometry;
    delete window.markdownViewerPaneResizer;
    setViewportWidth(defaultViewportWidth);
    resetEditorState();
    resetUiState();
  });

  it('keeps the editor pane contract stable for editor wiring', () => {
    const { container } = render(EditorWorkspace);
    const content = container.querySelector<HTMLElement>('main.content-container');
    const editorPane = container.querySelector<HTMLDivElement>('.editor-pane');
    const lineNumbers = container.querySelector<HTMLDivElement>('#line-numbers');
    const highlightLayer = container.querySelector<HTMLDivElement>('#editor-highlight-layer');
    const skeleton = container.querySelector<HTMLDivElement>('#editor-skeleton');
    const editor = container.querySelector<HTMLTextAreaElement>('#markdown-editor');
    const dropHint = container.querySelector<HTMLDivElement>('.drop-hint');

    expect(content).not.toBeNull();
    expect(editorPane?.classList.contains('is-loading')).toBe(true);
    expect(lineNumbers?.classList.contains('line-numbers')).toBe(true);
    expect(lineNumbers?.hasAttribute('inert')).toBe(true);
    expect(highlightLayer?.classList.contains('editor-highlight-layer')).toBe(true);
    expect(highlightLayer?.getAttribute('tabindex')).toBe('-1');
    expect(skeleton?.getAttribute('aria-hidden')).toBe('true');
    expect(editor?.placeholder).toBe('Type or paste your Markdown here...');
    expect(dropHint?.textContent).toContain('Drop a .md file anywhere to open it');
  });

  it('keeps the preview and resize contract stable for preview rendering', () => {
    const { container } = render(EditorWorkspace);
    const divider = container.querySelector<HTMLDivElement>('.resize-divider');
    const previewPane = container.querySelector<HTMLDivElement>('.preview-pane');
    const preview = container.querySelector<HTMLDivElement>('#markdown-preview');
    const previewSkeleton = container.querySelector<HTMLDivElement>('#markdown-preview-skeleton');
    const dragOverlay = container.querySelector<HTMLDivElement>('#drag-overlay');

    expect(divider?.getAttribute('role')).toBe('separator');
    expect(divider?.getAttribute('aria-orientation')).toBe('vertical');
    expect(divider?.getAttribute('aria-valuemin')).toBe('20');
    expect(divider?.getAttribute('aria-valuemax')).toBe('80');
    expect(divider?.getAttribute('aria-valuenow')).toBe('50');
    expect(divider?.getAttribute('tabindex')).toBe('0');
    expect(previewPane).not.toBeNull();
    expect(preview?.classList.contains('markdown-body')).toBe(true);
    expect(previewSkeleton?.classList.contains('skeleton-preview-container')).toBe(true);
    expect(previewSkeleton?.getAttribute('aria-hidden')).toBe('true');
    expect(dragOverlay?.getAttribute('aria-hidden')).toBe('true');
  });

  it('lets Svelte own editor and preview text direction attributes', async () => {
    const { container } = render(EditorWorkspace);
    const editor = container.querySelector<HTMLTextAreaElement>('#markdown-editor');
    const preview = container.querySelector<HTMLDivElement>('#markdown-preview');

    expect(editor?.getAttribute('dir')).toBe('ltr');
    expect(preview?.getAttribute('dir')).toBe('ltr');

    editorState.replace({ direction: 'rtl' });
    await tick();

    expect(editor?.getAttribute('dir')).toBe('rtl');
    expect(preview?.getAttribute('dir')).toBe('rtl');
  });

  it('lets Svelte own workspace view-mode classes without removing dock classes', async () => {
    const { container } = render(EditorWorkspace);
    const content = container.querySelector<HTMLElement>('main.content-container');

    expect(content).not.toBeNull();
    expect(content?.classList.contains('view-split')).toBe(true);
    expect(content?.classList.contains('view-editor-only')).toBe(false);
    expect(content?.classList.contains('view-preview-only')).toBe(false);

    content?.classList.add('fr-docked');
    uiState.replace({ viewMode: 'preview' });
    await tick();

    expect(content?.classList.contains('view-preview-only')).toBe(true);
    expect(content?.classList.contains('view-split')).toBe(false);
    expect(content?.classList.contains('view-editor-only')).toBe(false);
    expect(content?.classList.contains('fr-docked')).toBe(true);
  });

  it('keeps the textarea value in sync with editor state', async () => {
    editorState.replace({ value: '# From state' });
    const { container } = render(EditorWorkspace);
    const editor = container.querySelector<HTMLTextAreaElement>('#markdown-editor');

    expect(editor?.value).toBe('# From state');

    editorState.replace({ value: '# Updated state' });
    await tick();

    expect(editor?.value).toBe('# Updated state');
  });

  it('updates editor state value when the textarea receives input', async () => {
    const { container } = render(EditorWorkspace);
    const editor = container.querySelector<HTMLTextAreaElement>('#markdown-editor');

    expect(editor).not.toBeNull();

    const textarea = editor as HTMLTextAreaElement;
    textarea.value = 'typed markdown';
    textarea.setSelectionRange(5, 5, 'none');
    await fireEvent.input(textarea);

    expect(editorState.value).toBe('typed markdown');
    expect(editorState.selection).toEqual({
      start: 5,
      end: 5,
      direction: 'none'
    });
  });

  it('updates editor state selection when the textarea selection changes', async () => {
    editorState.replace({ value: 'selectable markdown' });
    const { container } = render(EditorWorkspace);
    const editor = container.querySelector<HTMLTextAreaElement>('#markdown-editor');

    expect(editor).not.toBeNull();

    const textarea = editor as HTMLTextAreaElement;
    textarea.setSelectionRange(2, 8, 'forward');
    await fireEvent.select(textarea);

    expect(editorState.selection).toEqual({
      start: 2,
      end: 8,
      direction: 'forward'
    });
  });

  it('updates editor state scroll state when the textarea scrolls', async () => {
    editorState.replace({ value: Array.from({ length: 20 }, (_, index) => `line ${index}`).join('\n') });
    const { container } = render(EditorWorkspace);
    const editor = container.querySelector<HTMLTextAreaElement>('#markdown-editor');

    expect(editor).not.toBeNull();

    const textarea = editor as HTMLTextAreaElement;
    textarea.scrollTop = 42;
    textarea.scrollLeft = 7;
    await fireEvent.scroll(textarea);

    expect(editorState.scrollTop).toBe(42);
    expect(editorState.scrollLeft).toBe(7);
  });

  it('renders line-number rows from editor state', async () => {
    const { container } = render(EditorWorkspace);

    editorState.replace({
      lineNumbers: {
        lineCount: 3,
        gutterCh: 4,
        rows: [
          { lineIndex: 0, label: '1', heightPx: 21, active: false },
          { lineIndex: 1, label: '2', heightPx: 42, active: true },
          { lineIndex: 2, label: '3', heightPx: 21, active: false }
        ]
      }
    });
    await tick();

    const editorPane = container.querySelector<HTMLDivElement>('.editor-pane');
    const rows = Array.from(container.querySelectorAll<HTMLDivElement>('#line-numbers .line-number'));

    expect(editorPane?.getAttribute('style')).toContain('--line-number-gutter: 4ch');
    expect(rows.map((row) => row.textContent)).toEqual(['1', '2', '3']);
    expect(rows.map((row) => row.style.height)).toEqual(['21px', '42px', '21px']);
    expect(rows[1].classList.contains('active-line')).toBe(true);
  });

  it('lets Svelte own keyboard pane resizing', async () => {
    setViewportWidth(1280);
    const { container } = render(EditorWorkspace);
    const divider = container.querySelector<HTMLDivElement>('.resize-divider');
    const editorPane = container.querySelector<HTMLDivElement>('.editor-pane');
    const previewPane = container.querySelector<HTMLDivElement>('.preview-pane');

    expect(divider).not.toBeNull();

    await fireEvent.keyDown(divider as HTMLDivElement, { key: 'ArrowRight' });

    expect(divider?.getAttribute('aria-valuenow')).toBe('55');
    expect(editorPane?.style.flex).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.55 - 4px)');
    expect(previewPane?.style.flex).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.45 - 4px)');

    await fireEvent.keyDown(divider as HTMLDivElement, { key: 'ArrowLeft' });

    expect(divider?.getAttribute('aria-valuenow')).toBe('50');
  });

  it('clamps Svelte-owned pointer resizing and clears drag state on mouseup', async () => {
    setViewportWidth(1280);
    const { container } = render(EditorWorkspace);
    const content = container.querySelector<HTMLElement>('main.content-container');
    const divider = container.querySelector<HTMLDivElement>('.resize-divider');
    const editorPane = container.querySelector<HTMLDivElement>('.editor-pane');
    const previewPane = container.querySelector<HTMLDivElement>('.preview-pane');

    expect(content).not.toBeNull();
    expect(divider).not.toBeNull();

    content!.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1000,
      bottom: 400,
      width: 1000,
      height: 400,
      toJSON: () => ({})
    });

    await fireEvent.mouseDown(divider as HTMLDivElement, { clientX: 500 });
    expect(divider?.classList.contains('dragging')).toBe(true);
    expect(document.body.classList.contains('resizing')).toBe(true);

    await fireEvent.mouseMove(document, { clientX: 950 });

    expect(divider?.getAttribute('aria-valuenow')).toBe('80');
    expect(editorPane?.style.flex).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.8 - 4px)');
    expect(previewPane?.style.flex).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.2 - 4px)');

    await fireEvent.mouseUp(document);

    expect(divider?.classList.contains('dragging')).toBe(false);
    expect(document.body.classList.contains('resizing')).toBe(false);
  });

  it('exposes a Svelte-owned pane resizer bridge for layout refresh requests', () => {
    setViewportWidth(1280);
    const { container } = render(EditorWorkspace);
    const editorPane = container.querySelector<HTMLDivElement>('.editor-pane');
    const previewPane = container.querySelector<HTMLDivElement>('.preview-pane');
    let refreshCount = 0;

    window.markdownViewerEditorGeometry = {
      refreshAfterPaneLayout() {
        refreshCount += 1;
      }
    };

    window.markdownViewerPaneResizer?.apply();

    expect(editorPane?.style.flex).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.5 - 4px)');
    expect(previewPane?.style.flex).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.5 - 4px)');
    expect(refreshCount).toBe(1);

    window.markdownViewerPaneResizer?.reset();

    expect(editorPane?.style.flex).toBe('');
    expect(previewPane?.style.flex).toBe('');
    expect(refreshCount).toBe(2);
  });
});
