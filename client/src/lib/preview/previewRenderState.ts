export interface PreviewRenderContext {
  force?: boolean;
  renderId?: number;
  previewDocumentId?: string | null;
}

export interface PreviewRenderStateSnapshot {
  generation: number;
  hasCommittedRender: boolean;
  lastRenderedDocumentId: string | null;
  lastRenderedContent: string | null;
}

export interface PreparePreviewRenderOptions {
  content: string;
  documentId: string;
  force?: boolean;
  showSkeleton?: boolean;
  containsSkeleton?: boolean;
  largeDocumentThreshold: number;
}

export interface PreparedPreviewRender {
  skip: boolean;
  renderId: number;
  isLargeDocument: boolean;
  isDocumentSwap: boolean;
  needsInitialPreview: boolean;
  shouldShowSkeleton: boolean;
}

export interface PreviewRenderStateController {
  readonly snapshot: PreviewRenderStateSnapshot;
  isCurrent(renderId: unknown): boolean;
  isCurrentContent(renderId: unknown, currentContent: string, expectedContent: string): boolean;
  prepareRender(options: PreparePreviewRenderOptions): PreparedPreviewRender;
  markCommitted(content: string, documentId: string | null | undefined): void;
  invalidateContent(): void;
  shouldRestoreScroll(containsSkeleton: boolean): boolean;
  shouldSkipExecute(content: string, context: PreviewRenderContext, containsSkeleton: boolean): boolean;
  shouldReplaceErrorPreview(containsSkeleton: boolean): boolean;
}

export function createPreviewRenderState(
  initial: Partial<PreviewRenderStateSnapshot> = {}
): PreviewRenderStateController {
  let generation = initial.generation ?? 0;
  let hasCommittedRender = initial.hasCommittedRender ?? false;
  let lastRenderedDocumentId = initial.lastRenderedDocumentId ?? null;
  let lastRenderedContent = initial.lastRenderedContent ?? null;

  function getSnapshot(): PreviewRenderStateSnapshot {
    return {
      generation,
      hasCommittedRender,
      lastRenderedDocumentId,
      lastRenderedContent
    };
  }

  function hasCurrentPreview(content: string, documentId: string, containsSkeleton: boolean): boolean {
    return (
      hasCommittedRender &&
      lastRenderedDocumentId === documentId &&
      lastRenderedContent === content &&
      !containsSkeleton
    );
  }

  return {
    get snapshot() {
      return getSnapshot();
    },
    isCurrent(renderId) {
      return renderId === generation;
    },
    isCurrentContent(renderId, currentContent, expectedContent) {
      return renderId === generation && currentContent === expectedContent;
    },
    prepareRender(options) {
      const force = options.force === true;
      const containsSkeleton = options.containsSkeleton === true;

      if (hasCurrentPreview(options.content, options.documentId, containsSkeleton) && !force) {
        return {
          skip: true,
          renderId: generation,
          isLargeDocument: options.content.length >= options.largeDocumentThreshold,
          isDocumentSwap: false,
          needsInitialPreview: false,
          shouldShowSkeleton: false
        };
      }

      generation += 1;
      const isLargeDocument = options.content.length >= options.largeDocumentThreshold;
      const isDocumentSwap = hasCommittedRender && lastRenderedDocumentId !== options.documentId;
      const needsInitialPreview = !hasCommittedRender || containsSkeleton;
      const shouldShowSkeleton = isLargeDocument && (
        options.showSkeleton === true ||
        needsInitialPreview ||
        isDocumentSwap
      );

      return {
        skip: false,
        renderId: generation,
        isLargeDocument,
        isDocumentSwap,
        needsInitialPreview,
        shouldShowSkeleton
      };
    },
    markCommitted(content, documentId) {
      lastRenderedContent = content;
      hasCommittedRender = true;
      lastRenderedDocumentId = documentId || null;
    },
    invalidateContent() {
      lastRenderedContent = null;
    },
    shouldRestoreScroll(containsSkeleton) {
      return hasCommittedRender && !containsSkeleton;
    },
    shouldSkipExecute(content, context, containsSkeleton) {
      return (
        !context.force &&
        content === lastRenderedContent &&
        lastRenderedDocumentId === context.previewDocumentId &&
        hasCommittedRender &&
        !containsSkeleton
      );
    },
    shouldReplaceErrorPreview(containsSkeleton) {
      return !hasCommittedRender || containsSkeleton;
    }
  };
}
