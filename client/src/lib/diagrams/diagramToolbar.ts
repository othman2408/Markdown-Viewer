export interface RemoteDiagramToolbarConfig {
  containerSelector: string;
  toolbarClassName: string;
  buttonClassName: string;
  renderedTargetSelector?: string;
  onZoom: (container: Element, button: HTMLButtonElement) => void;
  onCopy: (container: Element, button: HTMLButtonElement) => void;
  onPng: (container: Element, button: HTMLButtonElement) => void;
  onSvg: (container: Element, button: HTMLButtonElement) => void;
}

interface ToolbarButtonConfig {
  title: string;
  ariaLabel: string;
  html: string;
  onClick: (button: HTMLButtonElement) => void;
}

function createToolbarButton(
  documentRef: Document,
  buttonClassName: string,
  config: ToolbarButtonConfig
): HTMLButtonElement {
  const button = documentRef.createElement('button');
  button.className = buttonClassName;
  button.title = config.title;
  button.setAttribute('aria-label', config.ariaLabel);
  button.innerHTML = config.html;
  button.addEventListener('click', () => config.onClick(button));
  return button;
}

export function addRemoteDiagramToolbars(
  root: ParentNode | null | undefined,
  config: RemoteDiagramToolbarConfig
): void {
  if (!root) return;

  root.querySelectorAll(config.containerSelector).forEach((container) => {
    if (container.querySelector(`.${config.toolbarClassName}`)) return;
    if (!container.querySelector(config.renderedTargetSelector ?? 'img')) return;

    const documentRef = container.ownerDocument;
    const toolbar = documentRef.createElement('div');
    toolbar.className = config.toolbarClassName;
    toolbar.setAttribute('aria-label', 'Diagram actions');

    const zoomButton = createToolbarButton(documentRef, config.buttonClassName, {
      title: 'Zoom diagram',
      ariaLabel: 'Zoom diagram',
      html: '<i class="bi bi-arrows-fullscreen"></i>',
      onClick: (button) => config.onZoom(container, button)
    });
    const copyButton = createToolbarButton(documentRef, config.buttonClassName, {
      title: 'Copy image to clipboard',
      ariaLabel: 'Copy image to clipboard',
      html: '<i class="bi bi-clipboard-image"></i> Copy',
      onClick: (button) => config.onCopy(container, button)
    });
    const pngButton = createToolbarButton(documentRef, config.buttonClassName, {
      title: 'Download PNG',
      ariaLabel: 'Download PNG',
      html: '<i class="bi bi-file-image"></i> PNG',
      onClick: (button) => config.onPng(container, button)
    });
    const svgButton = createToolbarButton(documentRef, config.buttonClassName, {
      title: 'Download SVG',
      ariaLabel: 'Download SVG',
      html: '<i class="bi bi-filetype-svg"></i> SVG',
      onClick: (button) => config.onSvg(container, button)
    });

    toolbar.appendChild(zoomButton);
    toolbar.appendChild(copyButton);
    toolbar.appendChild(pngButton);
    toolbar.appendChild(svgButton);
    container.appendChild(toolbar);
  });
}
