import { describe, expect, it } from 'vitest';
import { createPreviewRenderState } from '../../../lib/preview/previewRenderState';

describe('preview render state', () => {
  it('prepares initial renders and marks committed content', () => {
    const state = createPreviewRenderState();

    const plan = state.prepareRender({
      content: 'hello',
      documentId: 'tab-1',
      containsSkeleton: false,
      largeDocumentThreshold: 10
    });

    expect(plan).toMatchObject({
      skip: false,
      renderId: 1,
      isLargeDocument: false,
      needsInitialPreview: true,
      shouldShowSkeleton: false
    });
    expect(state.isCurrent(1)).toBe(true);

    state.markCommitted('hello', 'tab-1');
    expect(state.snapshot).toEqual({
      generation: 1,
      hasCommittedRender: true,
      lastRenderedDocumentId: 'tab-1',
      lastRenderedContent: 'hello'
    });
  });

  it('skips current previews unless forced', () => {
    const state = createPreviewRenderState({
      generation: 3,
      hasCommittedRender: true,
      lastRenderedDocumentId: 'tab-1',
      lastRenderedContent: 'hello'
    });

    expect(state.prepareRender({
      content: 'hello',
      documentId: 'tab-1',
      containsSkeleton: false,
      largeDocumentThreshold: 10
    })).toMatchObject({
      skip: true,
      renderId: 3
    });

    expect(state.prepareRender({
      content: 'hello',
      documentId: 'tab-1',
      force: true,
      containsSkeleton: false,
      largeDocumentThreshold: 10
    })).toMatchObject({
      skip: false,
      renderId: 4
    });
  });

  it('requests skeletons for large initial, swapped, or explicit renders', () => {
    const initial = createPreviewRenderState();
    expect(initial.prepareRender({
      content: 'x'.repeat(10),
      documentId: 'tab-1',
      containsSkeleton: false,
      largeDocumentThreshold: 10
    }).shouldShowSkeleton).toBe(true);

    const swapped = createPreviewRenderState({
      generation: 1,
      hasCommittedRender: true,
      lastRenderedDocumentId: 'tab-1',
      lastRenderedContent: 'old'
    });
    expect(swapped.prepareRender({
      content: 'x'.repeat(10),
      documentId: 'tab-2',
      containsSkeleton: false,
      largeDocumentThreshold: 10
    })).toMatchObject({
      isDocumentSwap: true,
      shouldShowSkeleton: true
    });

    const explicit = createPreviewRenderState({
      generation: 1,
      hasCommittedRender: true,
      lastRenderedDocumentId: 'tab-1',
      lastRenderedContent: 'old'
    });
    expect(explicit.prepareRender({
      content: 'x'.repeat(10),
      documentId: 'tab-1',
      showSkeleton: true,
      containsSkeleton: false,
      largeDocumentThreshold: 10
    }).shouldShowSkeleton).toBe(true);
  });

  it('checks current content for async render guards', () => {
    const state = createPreviewRenderState({ generation: 2 });

    expect(state.isCurrentContent(2, 'current', 'current')).toBe(true);
    expect(state.isCurrentContent(1, 'current', 'current')).toBe(false);
    expect(state.isCurrentContent(2, 'current', 'stale')).toBe(false);
  });

  it('detects execute skips, scroll restore, error replacement, and invalidation', () => {
    const state = createPreviewRenderState({
      generation: 2,
      hasCommittedRender: true,
      lastRenderedDocumentId: 'tab-1',
      lastRenderedContent: 'hello'
    });

    expect(state.shouldSkipExecute('hello', { previewDocumentId: 'tab-1' }, false)).toBe(true);
    expect(state.shouldSkipExecute('hello', { previewDocumentId: 'tab-1', force: true }, false)).toBe(false);
    expect(state.shouldRestoreScroll(false)).toBe(true);
    expect(state.shouldRestoreScroll(true)).toBe(false);
    expect(state.shouldReplaceErrorPreview(false)).toBe(false);

    state.invalidateContent();
    expect(state.snapshot.lastRenderedContent).toBeNull();
    expect(state.shouldSkipExecute('hello', { previewDocumentId: 'tab-1' }, false)).toBe(false);
  });
});
