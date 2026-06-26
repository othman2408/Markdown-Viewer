export interface AbcHeaders {
  composer: string;
  key: string;
  meter: string;
  title: string;
}

export interface AbcToolbarActions<TVisual = unknown> {
  onListen: (visualObj: TVisual, button: HTMLButtonElement, container: Element) => void;
  onCopy: (container: Element, button: HTMLButtonElement) => void;
  onPng: (container: Element, button: HTMLButtonElement) => void;
  onSvg: (container: Element, button: HTMLButtonElement) => void;
}

export interface FinalizeAbcRenderOptions<TVisual = unknown> {
  code: string;
  container: Element | null;
  node: Element;
  visualObj: TVisual;
  actions: AbcToolbarActions<TVisual>;
}

interface AbcButtonConfig {
  ariaLabel: string;
  html: string;
  title: string;
  onClick: (button: HTMLButtonElement) => void;
}

export function parseAbcHeaders(abcString: string): AbcHeaders {
  const titleMatch = /^T:\s*(.*)$/m.exec(abcString);
  const composerMatch = /^C:\s*(.*)$/m.exec(abcString);
  const keyMatch = /^K:\s*(.*)$/m.exec(abcString);
  const meterMatch = /^M:\s*(.*)$/m.exec(abcString);

  return {
    title: titleMatch ? titleMatch[1].trim() : 'Music notation block',
    composer: composerMatch ? composerMatch[1].trim() : 'Traditional',
    key: keyMatch ? keyMatch[1].trim() : 'C',
    meter: meterMatch ? meterMatch[1].trim() : '4/4'
  };
}

function createAbcToolbarButton(documentRef: Document, config: AbcButtonConfig): HTMLButtonElement {
  const button = documentRef.createElement('button');
  button.type = 'button';
  button.className = 'abc-toolbar-btn';
  button.title = config.title;
  button.setAttribute('aria-label', config.ariaLabel);
  button.innerHTML = config.html;
  button.addEventListener('click', () => config.onClick(button));
  return button;
}

export function decorateAbcSvg(node: Element, code: string): void {
  const svgElement = node.querySelector('svg');
  if (!svgElement) return;

  const headers = parseAbcHeaders(code);
  svgElement.setAttribute('role', 'img');
  const titleId = `abc-title-${node.id}`;
  const descId = `abc-desc-${node.id}`;
  svgElement.setAttribute('aria-labelledby', `${titleId} ${descId}`);
  svgElement.setAttribute('aria-describedby', `abc-source-${node.id}`);

  const svgTitle = node.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'title');
  svgTitle.id = titleId;
  svgTitle.textContent = `Sheet music for: ${headers.title}`;
  const svgDesc = node.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'desc');
  svgDesc.id = descId;
  svgDesc.textContent = `Score in ${headers.key}, ${headers.meter} meter, composed by ${headers.composer}.`;

  svgElement.insertBefore(svgDesc, svgElement.firstChild);
  svgElement.insertBefore(svgTitle, svgElement.firstChild);
}

export function finalizeAbcRender<TVisual = unknown>(options: FinalizeAbcRenderOptions<TVisual>): void {
  const { code, container, node, visualObj, actions } = options;
  decorateAbcSvg(node, code);
  if (!container) return;

  container.classList.remove('is-loading');
  container.querySelector('.abc-toolbar')?.remove();
  container.querySelector('.abc-raw-code')?.remove();
  container.querySelector('.abc-sr-only')?.remove();

  const documentRef = node.ownerDocument;
  const toolbar = documentRef.createElement('div');
  toolbar.className = 'abc-toolbar';
  toolbar.setAttribute('aria-label', 'ABC notation actions');
  const listenButton = createAbcToolbarButton(documentRef, {
    title: 'Listen to score',
    ariaLabel: 'Listen to score',
    html: '<i class="bi bi-play-fill"></i> Listen',
    onClick: (button) => actions.onListen(visualObj, button, container)
  });
  const copyButton = createAbcToolbarButton(documentRef, {
    title: 'Copy image to clipboard',
    ariaLabel: 'Copy image to clipboard',
    html: '<i class="bi bi-clipboard-image"></i> Copy',
    onClick: (button) => actions.onCopy(container, button)
  });
  const pngButton = createAbcToolbarButton(documentRef, {
    title: 'Download PNG',
    ariaLabel: 'Download PNG',
    html: '<i class="bi bi-file-image"></i> PNG',
    onClick: (button) => actions.onPng(container, button)
  });
  const svgButton = createAbcToolbarButton(documentRef, {
    title: 'Download SVG',
    ariaLabel: 'Download SVG',
    html: '<i class="bi bi-filetype-svg"></i> SVG',
    onClick: (button) => actions.onSvg(container, button)
  });

  toolbar.appendChild(listenButton);
  toolbar.appendChild(copyButton);
  toolbar.appendChild(pngButton);
  toolbar.appendChild(svgButton);

  const srOnlyDiv = documentRef.createElement('div');
  srOnlyDiv.className = 'abc-sr-only';
  srOnlyDiv.id = `abc-source-${node.id}`;
  srOnlyDiv.textContent = code;

  container.insertBefore(toolbar, node);
  container.appendChild(srOnlyDiv);
}
