import { finalizeAbcRender } from '../diagrams/abcPreviewRuntime';
import {
  ensureD2TransparentFill,
  ensurePlantUmlTransparentBackground,
  processRemoteImageDiagrams
} from '../diagrams/remoteDiagramRuntime';
import { applyMapThemeToLeafletMaps, renderLeafletMapNode } from '../diagrams/mapPreviewRuntime';
import {
  addStlPreviewToolbar,
  applyStlMaterialMode,
  disposeStlViewResources,
  exportStlViewImage,
  renderStlModelInContainer,
  setActiveStlModeButton,
  updateStlViewTheme
} from '../diagrams/stlPreviewRuntime';
import { createStlZoomModalController } from '../diagrams/stlZoomModalController';
import { encodeKrokiD2, encodePlantUML } from '../diagrams/diagramEncoding';
import { buildMainThreadPreviewHtml } from '../preview/previewPreparation';
import { processPreviewMath } from '../preview/previewMathRuntime';
import {
  capturePreviewScroll,
  getPreviewPostProcessRoots,
  markPreviewRootsReady,
  patchPreviewDom,
  previewContainsSkeleton,
  queryPreviewRoots,
  restorePreviewScroll,
  showPreviewSkeleton
} from '../preview/previewDom';
import { createPreviewSegmentRenderer } from '../preview/previewSegments';
import { createPreviewWorkerClient } from '../preview/previewWorkerClient';
import { deferPreviewWork } from '../preview/previewTiming';
import { escapeHtml, type YamlAdapter } from '../markdown/frontmatter';
import type { ExtractedReferenceDefinitions } from '../markdown/editing';
import { applyReferencePreviewLinks, enhanceGitHubAlerts } from '../markdown/previewPostProcessing';
import type { MarkedParser } from '../preview/previewPreparation';
import type { PreviewDomPatchResult } from '../preview/previewDom';
import {
  HUGE_DOCUMENT_THRESHOLD,
  LARGE_DOCUMENT_THRESHOLD,
  PREVIEW_BLOCK_REUSE_LIMIT,
  PREVIEW_ENGINE_V2_ENABLED,
  PREVIEW_SANITIZE_OPTIONS,
  PREVIEW_SEGMENT_MIN_BLOCKS,
  PREVIEW_WORKER_THRESHOLD,
  PREVIEW_WORKER_TIMEOUT
} from '../config/appConfig';

export interface PreviewRuntimeCdn {
  abcjs: string;
  leaflet_css: string;
  leaflet_js: string;
  mathjax: string;
  mermaid: string;
  orbitControls: string;
  pako: string;
  stlLoader: string;
  three: string;
  topojson: string;
}

export interface PreviewRuntimeEditor {
  value: string;
}

export interface PreviewRuntimeRenderOptions {
  force?: boolean;
  reason?: string;
  showSkeleton?: boolean;
}

export interface PreviewRuntimeState {
  invalidateContent(): void;
  isCurrent(renderId: number): boolean;
  isCurrentContent(renderId: number, currentValue: string, renderedValue: string): boolean;
  markCommitted(content: string, documentId: string): void;
  prepareRender(input: {
    containsSkeleton: boolean;
    content: string;
    documentId: string;
    force: boolean;
    largeDocumentThreshold: number;
    showSkeleton: boolean;
  }): {
    isLargeDocument: boolean;
    renderId: number;
    shouldShowSkeleton: boolean;
    skip: boolean;
  };
  shouldReplaceErrorPreview(containsSkeleton: boolean): boolean;
  shouldRestoreScroll(containsSkeleton: boolean): boolean;
  shouldSkipExecute(content: string, context: Record<string, unknown>, containsSkeleton: boolean): boolean;
  snapshot: {
    hasCommittedRender: boolean;
  };
}

export interface CreatePreviewRuntimeOptions {
  addD2Toolbars(): void;
  addGraphvizToolbars(): void;
  addMermaidToolbars(): void;
  addPlantumlToolbars(): void;
  cancelAnimationFrameFn?: (handle: number) => void;
  cdn: PreviewRuntimeCdn;
  cleanupImageObjectUrls(): void;
  consoleRef?: Pick<Console, 'error' | 'warn'>;
  copyAbcImage(container: HTMLElement, button: HTMLElement): void;
  devicePixelRatio?: number;
  documentRef?: Document;
  domPurify: {
    sanitize(html: string, options?: unknown): string;
  };
  downloadAbcPng(container: HTMLElement, button: HTMLElement): void;
  downloadAbcSvg(container: HTMLElement, button: HTMLElement): void;
  editor: PreviewRuntimeEditor;
  escapeHtmlAttribute(code: string): string;
  getABCJS(): any;
  getActivePreviewDocumentId(): string;
  getLeaflet(): any;
  getMermaid(): any;
  getPako(): any;
  getTHREE(): any;
  getTheme(): string;
  getTopojson(): any;
  initMermaid(forceReinit?: boolean): void;
  jsYaml: YamlAdapter;
  loadScript(url: string): Promise<unknown>;
  loadStyle(url: string): Promise<unknown>;
  marked: MarkedParser;
  markdownPreview: HTMLElement;
  previewPane: HTMLElement;
  previewRenderState: PreviewRuntimeState;
  processEmojis(element: ParentNode): void;
  requestAnimationFrameFn?: (callback: FrameRequestCallback) => number;
  sanitizePreviewHtml(html: string): string;
  scheduleLineNumberUpdate(): void;
  stopActiveAbcPlayback(): void;
  toggleAbcPlay(visualObj: unknown[] | null | undefined, button: HTMLElement, container: HTMLElement): void;
  updateDocumentStats(): void;
  updateFindHighlights(): void;
  windowRef?: Window;
  writeClipboard(items: ClipboardItem[]): Promise<void>;
}

export interface PreviewRuntime {
  clearPendingPreviewWork(): void;
  renderMarkdown(options?: PreviewRuntimeRenderOptions): void;
  updateMapThemes(): void;
  updateStlThemes(): void;
}

export function createPreviewRuntime(options: CreatePreviewRuntimeOptions): PreviewRuntime {
  const documentRef = options.documentRef ?? document;
  const windowRef = options.windowRef ?? window;
  const consoleRef = options.consoleRef ?? console;
  const requestAnimationFrameFn = options.requestAnimationFrameFn ?? requestAnimationFrame;
  const cancelAnimationFrameFn = options.cancelAnimationFrameFn ?? cancelAnimationFrame;
  const activeStlViews = new Map<string, any>();
  let pendingPreviewRenderCancel: (() => void) | null = null;

  const previewSegmentRenderer = createPreviewSegmentRenderer({
    sanitizeHtml: options.sanitizePreviewHtml,
    escapeAttribute: options.escapeHtmlAttribute,
    reuseLimit: PREVIEW_BLOCK_REUSE_LIMIT
  });
  const previewWorkerClient = createPreviewWorkerClient({
    enabled: PREVIEW_ENGINE_V2_ENABLED,
    threshold: PREVIEW_WORKER_THRESHOLD,
    timeoutMs: PREVIEW_WORKER_TIMEOUT,
    minimumBlocks: PREVIEW_SEGMENT_MIN_BLOCKS
  });

  function clearPendingPreviewWork(): void {
    if (pendingPreviewRenderCancel) {
      pendingPreviewRenderCancel();
      pendingPreviewRenderCancel = null;
    }
  }

  function commitPreviewHtml(
    sanitizedHtml: string,
    referenceData: Pick<ExtractedReferenceDefinitions, 'definitions'>,
    rawVal: string,
    context: Record<string, any>
  ) {
    const containsSkeleton = previewContainsSkeleton(options.markdownPreview);
    const shouldRestoreScroll = options.previewRenderState.shouldRestoreScroll(containsSkeleton);
    const scrollSnapshot = shouldRestoreScroll ? capturePreviewScroll(options.previewPane) : null;
    const patchResult = patchPreviewDom(options.markdownPreview, sanitizedHtml, {
      hasCommittedRender: options.previewRenderState.snapshot.hasCommittedRender,
      containsSkeleton,
      reusePreviewBlocks: context.previewEngineMode === 'segmented' && !context.force
    });
    applyReferencePreviewLinks(options.markdownPreview, referenceData.definitions);
    enhanceGitHubAlerts(options.markdownPreview);
    options.previewRenderState.markCommitted(rawVal, context.previewDocumentId);
    options.markdownPreview.removeAttribute('aria-busy');
    options.markdownPreview.dataset.renderState = 'ready';
    restorePreviewScroll(options.previewPane, scrollSnapshot);
    return patchResult;
  }

  function disposeStlView(viewId: string): void {
    const view = activeStlViews.get(viewId);
    if (!view) return;
    disposeStlViewResources(view, {
      cancelAnimationFrameFn
    });
    activeStlViews.delete(viewId);
  }

  function renderMapNode(node: Element, isTopo: boolean): void {
    renderLeafletMapNode(node, {
      isTopo,
      getTheme: options.getTheme,
      leaflet: options.getLeaflet(),
      topojsonAdapter: options.getTopojson(),
      error: consoleRef.error
    });
  }

  function renderStlInContainer(container: HTMLElement, code: string, viewId: string) {
    return renderStlModelInContainer(container, code, viewId, {
      three: options.getTHREE(),
      getTheme: options.getTheme,
      devicePixelRatio: options.devicePixelRatio ?? windowRef.devicePixelRatio,
      getActiveView: (id) => activeStlViews.get(id),
      setActiveView: (id, view) => activeStlViews.set(id, view),
      requestAnimationFrameFn
    });
  }

  function exportStlImage(view: any, isDownload: boolean, button: HTMLElement, originalText: string): void {
    void exportStlViewImage(view, isDownload, button, originalText, {
      error: consoleRef.error,
      writeClipboard: options.writeClipboard
    });
  }

  const stlZoomModalController = createStlZoomModalController({
    createVector: () => new (options.getTHREE()).Vector3(),
    disposeView: disposeStlView,
    exportViewImage: exportStlImage,
    renderView: renderStlInContainer
  });

  function addStlToolbar(container: Element | null, _node: Element, code: string, view: any): void {
    addStlPreviewToolbar(container, {
      onMode: (mode, activeButton, buttons) => {
        if (applyStlMaterialMode(view, mode)) {
          setActiveStlModeButton(Object.values(buttons), activeButton);
        }
      },
      onZoom: () => {
        stlZoomModalController.open(code);
      },
      onCopy: (button) => {
        exportStlImage(view, false, button, button.innerHTML);
      },
      onPng: (button) => {
        exportStlImage(view, true, button, button.innerHTML);
      }
    });
  }

  function renderStlNode(node: Element): void {
    const originalCode = node.getAttribute('data-original-code');
    if (!originalCode) return;
    const decodedCode = decodeURIComponent(originalCode);
    const container = node.closest('.stl-container');
    const nodeId = (node as HTMLElement).id;
    if (activeStlViews.has(nodeId)) {
      disposeStlView(nodeId);
    }
    try {
      node.innerHTML = '';
      const view = renderStlInContainer(node as HTMLElement, decodedCode, nodeId);
      if (container) container.classList.remove('is-loading');
      addStlToolbar(container, node, decodedCode, view);
    } catch (err) {
      consoleRef.error('STL rendering failed:', err);
      node.innerHTML = `<div class="render-error-msg" style="padding: 2em; color: var(--text-color); text-align: center;">Error rendering 3D model: ${escapeHtml(err instanceof Error ? err.message : String(err))}</div>`;
      if (container) container.classList.remove('is-loading');
    }
  }

  function updateMapThemes(): void {
    const leaflet = options.getLeaflet();
    if (!leaflet) return;
    applyMapThemeToLeafletMaps(
      Array.from(options.markdownPreview.querySelectorAll('.geojson-map, .topojson-map')),
      options.getTheme(),
      (layer) => layer instanceof leaflet.TileLayer
    );
  }

  function updateStlThemes(): void {
    const three = options.getTHREE();
    if (!three) return;
    const stlNodes = options.markdownPreview.querySelectorAll('.stl-viewer');
    stlNodes.forEach((node) => {
      const view = activeStlViews.get((node as HTMLElement).id);
      updateStlViewTheme(view, options.getTheme(), three);
    });
  }

  function markContainersReady(nodes: Element[], selector: string): void {
    nodes.forEach((node) => {
      const container = node.closest(selector);
      if (container) container.classList.remove('is-loading');
    });
  }

  function postProcessPreview(rawVal: string, context: Record<string, any>, patchResult: PreviewDomPatchResult): void {
    const roots = getPreviewPostProcessRoots(patchResult, options.markdownPreview);
    activeStlViews.forEach((view, id) => {
      if (!documentRef.body.contains(view.container)) {
        disposeStlView(id);
      }
    });
    roots.forEach((root) => {
      options.processEmojis(root);
    });
    queryPreviewRoots(roots, 'input[type="checkbox"]').forEach((input) => {
      if (!input.hasAttribute('aria-label')) {
        const parentText = input.parentElement ? input.parentElement.textContent?.trim() : '';
        input.setAttribute('aria-label', parentText || 'Task item');
      }
    });

    try {
      const mermaidNodes = queryPreviewRoots(roots, '.mermaid');
      if (mermaidNodes.length > 0) {
        const renderMermaidNodes = () => {
          if (!options.previewRenderState.isCurrent(context.renderId)) return;
          options.initMermaid(false);
          Promise.resolve(options.getMermaid().init(undefined, mermaidNodes))
            .then(() => {
              if (!options.previewRenderState.isCurrent(context.renderId)) return;
              markPreviewRootsReady(roots);
              options.addMermaidToolbars();
            })
            .catch((error) => {
              if (!options.previewRenderState.isCurrent(context.renderId)) return;
              consoleRef.warn('Mermaid rendering failed:', error);
              markPreviewRootsReady(roots);
              options.addMermaidToolbars();
            });
        };
        if (!options.getMermaid()) {
          options.loadScript(options.cdn.mermaid).then(() => {
            if (!options.previewRenderState.isCurrent(context.renderId)) return;
            options.initMermaid(true);
            renderMermaidNodes();
          }).catch((error) => { consoleRef.warn('Failed to load mermaid:', error); });
        } else {
          renderMermaidNodes();
        }
      }
    } catch (error) {
      consoleRef.warn('Mermaid rendering failed:', error);
    }

    try {
      const abcNodes = queryPreviewRoots(roots, '.abc-notation');
      if (abcNodes.length > 0) {
        const renderAbcNodes = () => {
          if (!options.previewRenderState.isCurrent(context.renderId)) return;
          const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const node = entry.target as HTMLElement;
                obs.unobserve(node);
                setTimeout(() => {
                  if (!options.previewRenderState.isCurrent(context.renderId)) return;
                  const originalCode = node.getAttribute('data-original-code');
                  if (!originalCode) return;
                  const decodedCode = decodeURIComponent(originalCode);
                  const container = node.closest('.abc-container');
                  try {
                    node.innerHTML = '';
                    const visualObj = options.getABCJS().renderAbc(node.id, decodedCode, {
                      responsive: 'resize',
                      add_classes: true
                    });
                    node.innerHTML = options.domPurify.sanitize(node.innerHTML, PREVIEW_SANITIZE_OPTIONS);
                    finalizeAbcRender({
                      code: decodedCode,
                      container,
                      node,
                      visualObj,
                      actions: {
                        onListen: (visualObj, button, container) => options.toggleAbcPlay(visualObj, button, container as HTMLElement),
                        onCopy: (container, button) => options.copyAbcImage(container as HTMLElement, button),
                        onPng: (container, button) => options.downloadAbcPng(container as HTMLElement, button),
                        onSvg: (container, button) => options.downloadAbcSvg(container as HTMLElement, button)
                      }
                    });
                  } catch (err) {
                    consoleRef.error('ABCJS rendering failed:', err);
                    if (container) container.classList.remove('is-loading');
                  }
                }, 0);
              }
            });
          }, { rootMargin: '150px 0px' });
          abcNodes.forEach((node) => observer.observe(node));
        };
        if (!options.getABCJS()) {
          options.loadScript(options.cdn.abcjs).then(() => {
            if (!options.previewRenderState.isCurrent(context.renderId)) return;
            renderAbcNodes();
          }).catch((error) => {
            consoleRef.warn('Failed to load abcjs:', error);
            markContainersReady(abcNodes, '.abc-container');
          });
        } else {
          renderAbcNodes();
        }
      }
    } catch (error) {
      consoleRef.warn('ABC notation processing failed:', error);
    }

    try {
      const geojsonNodes = queryPreviewRoots(roots, '.geojson-map');
      const topojsonNodes = queryPreviewRoots(roots, '.topojson-map');
      if (geojsonNodes.length > 0 || topojsonNodes.length > 0) {
        const renderAllMaps = () => {
          if (!options.previewRenderState.isCurrent(context.renderId)) return;
          geojsonNodes.forEach((node) => renderMapNode(node, false));
          topojsonNodes.forEach((node) => renderMapNode(node, true));
        };
        const promises: Array<Promise<unknown>> = [];
        if (!options.getLeaflet()) {
          promises.push(options.loadStyle(options.cdn.leaflet_css));
          promises.push(options.loadScript(options.cdn.leaflet_js));
        }
        if (topojsonNodes.length > 0 && !options.getTopojson()) {
          promises.push(options.loadScript(options.cdn.topojson));
        }
        if (promises.length > 0) {
          Promise.all(promises).then(renderAllMaps).catch((error) => {
            consoleRef.warn('Failed to load map libraries:', error);
            markContainersReady(geojsonNodes.concat(topojsonNodes), '.geojson-container, .topojson-container');
          });
        } else {
          renderAllMaps();
        }
      }
    } catch (error) {
      consoleRef.warn('GeoJSON/TopoJSON processing failed:', error);
    }

    try {
      const stlNodes = queryPreviewRoots(roots, '.stl-viewer');
      if (stlNodes.length > 0) {
        const renderAllStls = () => {
          if (!options.previewRenderState.isCurrent(context.renderId)) return;
          stlNodes.forEach((node) => renderStlNode(node));
        };
        const loadLoaderAndControls = (): Promise<void> => {
          const three = options.getTHREE();
          const subPromises: Array<Promise<unknown>> = [];
          if (!three?.STLLoader) {
            subPromises.push(options.loadScript(options.cdn.stlLoader));
          }
          if (!three?.OrbitControls) {
            subPromises.push(options.loadScript(options.cdn.orbitControls));
          }
          return subPromises.length > 0 ? Promise.all(subPromises).then(() => undefined) : Promise.resolve();
        };
        if (!options.getTHREE()) {
          options.loadScript(options.cdn.three).then(() => loadLoaderAndControls()).then(() => renderAllStls()).catch((error) => {
            consoleRef.warn('Failed to load Three.js libraries:', error);
            markContainersReady(stlNodes, '.stl-container');
          });
        } else {
          loadLoaderAndControls().then(renderAllStls).catch((error) => {
            consoleRef.warn('Failed to load Three.js addons:', error);
            markContainersReady(stlNodes, '.stl-container');
          });
        }
      }
    } catch (error) {
      consoleRef.warn('STL processing failed:', error);
    }

    try {
      processRemoteImageDiagrams({
        nodes: queryPreviewRoots(roots, '.plantuml-diagram'),
        config: {
          containerSelector: '.plantuml-container',
          imageClassName: 'plantuml-img',
          imageAlt: 'PlantUML Diagram',
          endpointBaseUrl: 'https://www.plantuml.com/plantuml/svg/',
          offlineMessage: 'Offline or unable to connect to PlantUML server',
          encodingErrorLabel: 'PlantUML',
          loadErrorMessage: 'Failed to load pako for PlantUML:',
          encode: encodePlantUML,
          prepareCode: ensurePlantUmlTransparentBackground,
          onToolbarReady: options.addPlantumlToolbars
        },
        renderId: context.renderId,
        isCurrentRender: (renderId) => options.previewRenderState.isCurrent(renderId as number),
        getPako: options.getPako,
        loadPako: () => options.loadScript(options.cdn.pako),
        warn: consoleRef.warn,
        error: consoleRef.error
      });
    } catch (error) {
      consoleRef.warn('PlantUML processing failed:', error);
    }

    try {
      processRemoteImageDiagrams({
        nodes: queryPreviewRoots(roots, '.d2-diagram'),
        config: {
          containerSelector: '.d2-container',
          imageClassName: 'd2-img',
          imageAlt: 'D2 Diagram',
          endpointBaseUrl: 'https://kroki.io/d2/svg/',
          offlineMessage: 'Offline or unable to connect to Kroki server',
          encodingErrorLabel: 'D2',
          loadErrorMessage: 'Failed to load pako for D2:',
          encode: encodeKrokiD2,
          prepareCode: ensureD2TransparentFill,
          onToolbarReady: options.addD2Toolbars,
          renderMethodName: 'renderD2',
          addLoadingBeforeRender: true
        },
        renderId: context.renderId,
        isCurrentRender: (renderId) => options.previewRenderState.isCurrent(renderId as number),
        getPako: options.getPako,
        loadPako: () => options.loadScript(options.cdn.pako),
        warn: consoleRef.warn,
        error: consoleRef.error
      });
    } catch (error) {
      consoleRef.warn('D2 processing failed:', error);
    }

    try {
      processRemoteImageDiagrams({
        nodes: queryPreviewRoots(roots, '.graphviz-diagram'),
        config: {
          containerSelector: '.graphviz-container',
          imageClassName: 'graphviz-img',
          imageAlt: 'Graphviz Diagram',
          endpointBaseUrl: 'https://kroki.io/graphviz/svg/',
          offlineMessage: 'Offline or unable to connect to Kroki server',
          encodingErrorLabel: 'Graphviz',
          loadErrorMessage: 'Failed to load pako for Graphviz:',
          encode: encodeKrokiD2,
          onToolbarReady: options.addGraphvizToolbars,
          renderMethodName: 'renderGraphviz',
          addLoadingBeforeRender: true
        },
        renderId: context.renderId,
        isCurrentRender: (renderId) => options.previewRenderState.isCurrent(renderId as number),
        getPako: options.getPako,
        loadPako: () => options.loadScript(options.cdn.pako),
        warn: consoleRef.warn,
        error: consoleRef.error
      });
    } catch (error) {
      consoleRef.warn('Graphviz processing failed:', error);
    }

    processPreviewMath({
      rawMarkdown: rawVal,
      roots,
      renderId: context.renderId,
      isCurrentRender: (renderId) => options.previewRenderState.isCurrent(renderId as number),
      loadScript: options.loadScript,
      mathjaxUrl: options.cdn.mathjax,
      windowRef: windowRef as any,
      warn: consoleRef.warn
    });
    options.updateDocumentStats();
    options.updateFindHighlights();
    options.cleanupImageObjectUrls();
    options.scheduleLineNumberUpdate();
  }

  function executeMainThreadRender(rawVal: string, context: Record<string, any>): void {
    const { sanitizedHtml, referenceData } = buildMainThreadPreviewHtml({
      markdown: rawVal,
      marked: options.marked,
      sanitizeHtml: options.sanitizePreviewHtml,
      yaml: options.jsYaml
    });
    if (!options.previewRenderState.isCurrentContent(context.renderId, options.editor.value, rawVal)) return;
    previewSegmentRenderer.clear();
    const patchResult = commitPreviewHtml(sanitizedHtml, referenceData, rawVal, context);
    postProcessPreview(rawVal, context, patchResult);
  }

  function executeWorkerRender(rawVal: string, context: Record<string, any>): void {
    previewWorkerClient.render(rawVal, context)
      .then((result) => {
        if (!options.previewRenderState.isCurrentContent(context.renderId, options.editor.value, rawVal)) return;
        if (!result || result.mode !== 'segmented' || !Array.isArray(result.blocks) || result.blocks.length < PREVIEW_SEGMENT_MIN_BLOCKS) {
          executeMainThreadRender(rawVal, Object.assign({}, context, { disableWorker: true }));
          return;
        }
        const segmentedHtml = previewSegmentRenderer.buildHtml(result.blocks, context.previewDocumentId);
        if (!options.previewRenderState.isCurrentContent(context.renderId, options.editor.value, rawVal)) return;
        const patchResult = commitPreviewHtml(segmentedHtml, { definitions: new Map() }, rawVal, Object.assign({}, context, {
          previewEngineMode: 'segmented'
        }));
        postProcessPreview(rawVal, context, patchResult);
      })
      .catch((error) => {
        if (!options.previewRenderState.isCurrentContent(context.renderId, options.editor.value, rawVal)) return;
        consoleRef.warn('Preview worker unavailable; falling back to main-thread renderer:', error);
        executeMainThreadRender(rawVal, Object.assign({}, context, { disableWorker: true }));
      });
  }

  function executeRender(rawVal: string, context: Record<string, any> = {}): void {
    if (options.previewRenderState.shouldSkipExecute(rawVal, context, previewContainsSkeleton(options.markdownPreview))) {
      options.markdownPreview.removeAttribute('aria-busy');
      options.markdownPreview.dataset.renderState = 'ready';
      return;
    }
    try {
      if (previewWorkerClient.shouldUse(rawVal, context)) {
        executeWorkerRender(rawVal, context);
      } else {
        executeMainThreadRender(rawVal, context);
      }
    } catch (error) {
      consoleRef.error('Markdown rendering failed:', error);
      const safeMessage = escapeHtml(error instanceof Error ? error.message : 'Unknown error');
      const safeMarkdown = escapeHtml(rawVal);
      options.markdownPreview.removeAttribute('aria-busy');
      options.markdownPreview.dataset.renderState = 'error';
      if (options.previewRenderState.shouldReplaceErrorPreview(previewContainsSkeleton(options.markdownPreview))) {
        options.markdownPreview.innerHTML = `<div class="alert alert-danger">
              <strong>Error rendering markdown:</strong> ${safeMessage}
          </div>
          <pre>${safeMarkdown}</pre>`;
      }
    }
  }

  function renderMarkdown(renderOptions: PreviewRuntimeRenderOptions = {}): void {
    options.stopActiveAbcPlayback();
    const rawVal = options.editor.value;
    const force = renderOptions.force === true;
    const previewDocumentId = options.getActivePreviewDocumentId();
    const renderPlan = options.previewRenderState.prepareRender({
      content: rawVal,
      documentId: previewDocumentId,
      force,
      showSkeleton: renderOptions.showSkeleton === true,
      containsSkeleton: previewContainsSkeleton(options.markdownPreview),
      largeDocumentThreshold: LARGE_DOCUMENT_THRESHOLD
    });
    if (renderPlan.skip) return;
    clearPendingPreviewWork();
    const renderId = renderPlan.renderId;
    if (renderPlan.shouldShowSkeleton) {
      showPreviewSkeleton(options.markdownPreview);
    } else if (options.markdownPreview) {
      options.markdownPreview.setAttribute('aria-busy', 'true');
      options.markdownPreview.dataset.renderState = 'refreshing';
    }
    const runRender = () => {
      pendingPreviewRenderCancel = null;
      if (!options.previewRenderState.isCurrentContent(renderId, options.editor.value, rawVal)) return;
      executeRender(rawVal, {
        force,
        renderId,
        previewDocumentId,
        reason: renderOptions.reason || 'direct'
      });
    };
    if (renderPlan.isLargeDocument) {
      pendingPreviewRenderCancel = deferPreviewWork(runRender, rawVal.length, {
        hugeDocumentThreshold: HUGE_DOCUMENT_THRESHOLD
      });
    } else {
      runRender();
    }
  }

  return {
    clearPendingPreviewWork,
    renderMarkdown,
    updateMapThemes,
    updateStlThemes
  };
}
