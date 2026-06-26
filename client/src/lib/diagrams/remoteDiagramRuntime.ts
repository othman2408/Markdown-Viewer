export interface RemoteDiagramPako {
  deflate(input: Uint8Array, options?: { level?: number; raw?: boolean }): Uint8Array;
}

export interface RemoteImageDiagramConfig {
  containerSelector: string;
  imageClassName: string;
  imageAlt: string;
  endpointBaseUrl: string;
  offlineMessage: string;
  encodingErrorLabel: string;
  loadErrorMessage: string;
  encode(code: string, pako: RemoteDiagramPako): string;
  prepareCode?: (code: string) => string;
  onToolbarReady?: () => void;
  renderMethodName?: string;
  addLoadingBeforeRender?: boolean;
}

export interface ProcessRemoteImageDiagramsOptions {
  nodes: Element[];
  config: RemoteImageDiagramConfig;
  renderId: unknown;
  isCurrentRender: (renderId: unknown) => boolean;
  getPako: () => RemoteDiagramPako | undefined;
  loadPako: () => Promise<unknown>;
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setContainerLoading(container: Element | null, isLoading: boolean): void {
  if (!container) return;
  container.classList.toggle('is-loading', isLoading);
}

function clearContainerLoading(container: Element | null): void {
  if (container) {
    container.classList.remove('is-loading');
  }
}

export function ensurePlantUmlTransparentBackground(code: string): string {
  if (code.toLowerCase().includes('backgroundcolor')) {
    return code;
  }

  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('@start')) {
      lines.splice(i + 1, 0, 'skinparam backgroundColor transparent');
      return lines.join('\n');
    }
  }

  return `skinparam backgroundColor transparent\n${code}`;
}

export function ensureD2TransparentFill(code: string): string {
  if (code.includes('style.fill') || /style\s*:\s*\{[^}]*fill/.test(code)) {
    return code;
  }

  return `style.fill: transparent\n${code}`;
}

export function renderRemoteImageDiagramNode(
  node: Element,
  pako: RemoteDiagramPako,
  config: RemoteImageDiagramConfig
): void {
  const container = node.closest(config.containerSelector);
  const originalCode = node.getAttribute('data-original-code');
  if (!originalCode) return;

  const decodedCode = decodeURIComponent(originalCode);
  if (config.addLoadingBeforeRender) {
    setContainerLoading(container, true);
  }

  try {
    const preparedCode = config.prepareCode ? config.prepareCode(decodedCode) : decodedCode;
    const encoded = config.encode(preparedCode, pako);
    const url = `${config.endpointBaseUrl}${encoded}`;
    node.innerHTML = '';

    const img = node.ownerDocument.createElement('img');
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.alt = config.imageAlt;
    img.className = config.imageClassName;
    img.draggable = false;
    img.addEventListener('dragstart', (event) => event.preventDefault());
    img.onload = () => {
      clearContainerLoading(container);
      config.onToolbarReady?.();
    };
    img.onerror = () => {
      node.innerHTML = `<div class="render-error-msg" style="padding: 1.5em; text-align: center; color: var(--text-color);"><i class="bi bi-wifi-off me-2"></i>${config.offlineMessage}</div>`;
      clearContainerLoading(container);
    };

    node.appendChild(img);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    node.innerHTML = `<div class="render-error-msg" style="padding: 1.5em; text-align: center; color: var(--text-color);">Error encoding diagram: ${escapeHtml(message)}</div>`;
    clearContainerLoading(container);
    throw err;
  }
}

export function processRemoteImageDiagrams(options: ProcessRemoteImageDiagramsOptions): void {
  const { nodes, config } = options;
  if (nodes.length === 0) return;

  const renderSingleNode = (node: Element): void => {
    try {
      const pako = options.getPako();
      if (!pako) {
        throw new Error('pako is not loaded');
      }
      renderRemoteImageDiagramNode(node, pako, config);
    } catch (err) {
      options.error?.(`${config.encodingErrorLabel} encoding failed:`, err);
    }
  };

  if (config.renderMethodName) {
    nodes.forEach((node) => {
      (node as Element & Record<string, () => void>)[config.renderMethodName as string] = () => renderSingleNode(node);
    });
  }

  const renderAllNodes = (): void => {
    if (!options.isCurrentRender(options.renderId)) return;
    nodes.forEach((node) => {
      if (config.renderMethodName) {
        (node as Element & Record<string, () => void>)[config.renderMethodName as string]?.();
      } else {
        renderSingleNode(node);
      }
    });
  };

  if (options.getPako()) {
    renderAllNodes();
    return;
  }

  options.loadPako()
    .then(() => {
      if (!options.isCurrentRender(options.renderId)) return;
      renderAllNodes();
    })
    .catch((e) => {
      options.warn?.(config.loadErrorMessage, e);
      nodes.forEach((node) => clearContainerLoading(node.closest(config.containerSelector)));
    });
}
