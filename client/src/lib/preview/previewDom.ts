export const PREVIEW_SKELETON_ID = 'markdown-preview-skeleton';

export interface PreviewScrollSnapshot {
  top: number;
  left: number;
}

export interface PreviewDomPatchOptions {
  hasCommittedRender?: boolean;
  containsSkeleton?: boolean;
  reusePreviewBlocks?: boolean;
  maxNodeCount?: number;
}

export interface PreviewDomPatchResult {
  fullReplace: boolean;
  updatedNodes: Node[];
}

export function showPreviewSkeleton(container: HTMLElement | null | undefined): void {
  if (!container || container.querySelector(`#${PREVIEW_SKELETON_ID}`)) return;

  container.setAttribute('aria-busy', 'true');
  container.dataset.renderState = 'loading';
  container.innerHTML = `
        <div class="skeleton-preview-container" id="${PREVIEW_SKELETON_ID}" aria-hidden="true">
            <div class="skeleton-placeholder skeleton-title"></div>
            <div class="skeleton-placeholder skeleton-line skeleton-w90"></div>
            <div class="skeleton-placeholder skeleton-line skeleton-w85"></div>
            <div class="skeleton-placeholder skeleton-line skeleton-w60"></div>
            <div class="skeleton-placeholder skeleton-subtitle"></div>
            <div class="skeleton-placeholder skeleton-line skeleton-w88"></div>
            <div class="skeleton-placeholder skeleton-line skeleton-w92"></div>
            <div class="skeleton-placeholder skeleton-line skeleton-w45"></div>
        </div>
      `;
}

export function previewContainsSkeleton(container: ParentNode | null | undefined): boolean {
  return Boolean(container?.querySelector(`#${PREVIEW_SKELETON_ID}`));
}

export function capturePreviewScroll(previewPane: HTMLElement | null | undefined): PreviewScrollSnapshot | null {
  if (!previewPane) return null;

  return {
    top: previewPane.scrollTop,
    left: previewPane.scrollLeft
  };
}

export function restorePreviewScroll(
  previewPane: HTMLElement | null | undefined,
  snapshot: PreviewScrollSnapshot | null,
  requestFrame: (callback: FrameRequestCallback) => number = globalThis.requestAnimationFrame
): void {
  if (!snapshot || !previewPane) return;

  const run = requestFrame || ((callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });

  run(() => {
    const maxTop = Math.max(0, previewPane.scrollHeight - previewPane.clientHeight);
    previewPane.scrollTop = Math.min(maxTop, snapshot.top);
    previewPane.scrollLeft = snapshot.left;
  });
}

export function canReusePreviewNode(
  currentNode: Node | null | undefined,
  nextNode: Node | null | undefined,
  options: Pick<PreviewDomPatchOptions, 'reusePreviewBlocks'> = {}
): boolean {
  if (!currentNode || !nextNode || currentNode.nodeType !== nextNode.nodeType) return false;

  if (currentNode.nodeType === Node.TEXT_NODE) {
    if (currentNode.nodeValue !== nextNode.nodeValue) {
      currentNode.nodeValue = nextNode.nodeValue;
    }
    return true;
  }

  if (currentNode.nodeType !== Node.ELEMENT_NODE) {
    return currentNode.nodeValue === nextNode.nodeValue;
  }

  if (currentNode.nodeName !== nextNode.nodeName) return false;

  const currentEl = currentNode as HTMLElement;
  const nextEl = nextNode as HTMLElement;
  if ((currentEl.id || nextEl.id) && currentEl.id !== nextEl.id) return false;

  if (
    options.reusePreviewBlocks &&
    currentEl.dataset.previewBlockHash &&
    currentEl.dataset.previewBlockHash === nextEl.dataset.previewBlockHash
  ) {
    return true;
  }

  if (currentEl.outerHTML === nextEl.outerHTML) return true;

  if (currentEl.tagName === 'DETAILS' && nextEl.tagName === 'DETAILS' && currentEl.hasAttribute('open')) {
    nextEl.setAttribute('open', '');
  }

  return false;
}

export function patchPreviewDom(
  container: HTMLElement,
  html: string,
  options: PreviewDomPatchOptions = {}
): PreviewDomPatchResult {
  const result: PreviewDomPatchResult = {
    fullReplace: false,
    updatedNodes: []
  };

  if (!options.hasCommittedRender || options.containsSkeleton) {
    container.innerHTML = html;
    result.fullReplace = true;
    result.updatedNodes = [container];
    return result;
  }

  const template = container.ownerDocument.createElement('template');
  template.innerHTML = html;
  const nextNodes = Array.from(template.content.childNodes);
  const currentNodeCount = container.childNodes.length;
  const maxNodeCount = options.maxNodeCount ?? 6000;

  if (nextNodes.length > maxNodeCount || currentNodeCount > maxNodeCount) {
    container.replaceChildren(...nextNodes);
    result.fullReplace = true;
    result.updatedNodes = [container];
    return result;
  }

  let index = 0;
  while (index < nextNodes.length || index < container.childNodes.length) {
    const currentNode = container.childNodes[index];
    const nextNode = nextNodes[index];

    if (!nextNode) {
      currentNode.remove();
      continue;
    }

    if (!currentNode) {
      container.appendChild(nextNode);
      result.updatedNodes.push(nextNode);
      index += 1;
      continue;
    }

    if (canReusePreviewNode(currentNode, nextNode, options)) {
      index += 1;
      continue;
    }

    result.updatedNodes.push(nextNode);
    currentNode.replaceWith(nextNode);
    index += 1;
  }

  return result;
}

export function getPreviewPostProcessRoots(
  patchResult: PreviewDomPatchResult | null | undefined,
  fallbackRoot: HTMLElement | null | undefined
): Element[] {
  if (!patchResult || patchResult.fullReplace || !patchResult.updatedNodes.length) {
    return fallbackRoot ? [fallbackRoot] : [];
  }

  const roots: Element[] = [];
  const seen = new Set<Element>();

  patchResult.updatedNodes.forEach((node) => {
    const root = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
    if (root && !seen.has(root)) {
      seen.add(root);
      roots.push(root);
    }
  });

  return roots.length ? roots : (fallbackRoot ? [fallbackRoot] : []);
}

export function queryPreviewRoots(roots: Array<Element | null | undefined>, selector: string): Element[] {
  const matches: Element[] = [];
  const seen = new Set<Element>();

  roots.forEach((root) => {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;

    if (root.matches(selector) && !seen.has(root)) {
      seen.add(root);
      matches.push(root);
    }

    root.querySelectorAll(selector).forEach((node) => {
      if (!seen.has(node)) {
        seen.add(node);
        matches.push(node);
      }
    });
  });

  return matches;
}

export function markPreviewRootsReady(roots: Element[]): void {
  queryPreviewRoots(roots, '.mermaid-container.is-loading').forEach((container) => {
    container.classList.remove('is-loading');
  });
  queryPreviewRoots(roots, '.abc-container.is-loading').forEach((container) => {
    container.classList.remove('is-loading');
  });
}
