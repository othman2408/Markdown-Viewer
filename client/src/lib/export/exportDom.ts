export type ExportTempElementMode = 'pdf' | 'png';

export interface CreateExportTempElementOptions {
  documentRef?: Document;
  enhance?: (element: HTMLElement) => void;
  getTheme?: () => string | null;
  html: string;
  mode: ExportTempElementMode;
}

export interface ReplaceExportSvgContainersOptions {
  containerSelector: string;
  defaultHeight?: number;
  defaultWidth?: number;
  imageClassName?: string;
  preserveSvgId?: boolean;
  setClonedSvgInlineSize?: boolean;
  setImageMaxWidth?: boolean;
  storeOriginalSize?: boolean;
  useAttributeSizeFallback?: boolean;
  useClientSizeFallback?: boolean;
}

interface ExportTempElementStyle {
  fontSize: string;
  padding: string;
  width: string;
}

const exportElementStyles: Record<ExportTempElementMode, ExportTempElementStyle> = {
  pdf: {
    fontSize: '14px',
    padding: '0px',
    width: '210mm'
  },
  png: {
    fontSize: '16px',
    padding: '40px',
    width: '1000px'
  }
};

function resolveExportTheme(options: CreateExportTempElementOptions, documentRef: Document): string | null {
  return options.getTheme?.() ?? documentRef.documentElement.getAttribute('data-theme');
}

export function createExportTempElement(options: CreateExportTempElementOptions): HTMLElement {
  const documentRef = options.documentRef ?? document;
  const modeStyle = exportElementStyles[options.mode];
  const currentTheme = resolveExportTheme(options, documentRef);
  const isDarkTheme = currentTheme === 'dark';
  const element = documentRef.createElement('div');

  element.className = 'markdown-body pdf-export';
  element.innerHTML = options.html;
  options.enhance?.(element);

  element.style.padding = modeStyle.padding;
  element.style.width = modeStyle.width;
  element.style.margin = '0 auto';
  element.style.fontSize = modeStyle.fontSize;
  element.style.position = 'fixed';
  element.style.left = '-9999px';
  element.style.top = '0';
  element.style.backgroundColor = isDarkTheme ? '#0d1117' : '#ffffff';
  element.style.color = isDarkTheme ? '#c9d1d9' : '#24292e';

  return element;
}

function readSvgDimension(svgElement: SVGSVGElement, attributeName: 'height' | 'width'): number {
  return Number.parseFloat(svgElement.getAttribute(attributeName) ?? '');
}

function getSvgExportSize(svgElement: SVGSVGElement, options: ReplaceExportSvgContainersOptions) {
  const rect = svgElement.getBoundingClientRect();
  const defaultWidth = options.defaultWidth ?? 600;
  const defaultHeight = options.defaultHeight ?? 400;
  const clientWidth = options.useClientSizeFallback ? svgElement.clientWidth : 0;
  const clientHeight = options.useClientSizeFallback ? svgElement.clientHeight : 0;
  const attributeWidth = options.useAttributeSizeFallback ? readSvgDimension(svgElement, 'width') : 0;
  const attributeHeight = options.useAttributeSizeFallback ? readSvgDimension(svgElement, 'height') : 0;

  return {
    height: rect.height || clientHeight || attributeHeight || defaultHeight,
    width: rect.width || clientWidth || attributeWidth || defaultWidth
  };
}

function encodeSvgForDataUrl(svgElement: SVGSVGElement): string {
  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));

  return `data:image/svg+xml;base64,${svgBase64}`;
}

export function replaceExportSvgContainersWithImages(
  root: ParentNode,
  options: ReplaceExportSvgContainersOptions
): number {
  let replacedCount = 0;

  root.querySelectorAll(options.containerSelector).forEach((container) => {
    const svgElement = container.querySelector<SVGSVGElement>('svg');

    if (!svgElement) {
      return;
    }

    const { height, width } = getSvgExportSize(svgElement, options);
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('width', String(width));
    clonedSvg.setAttribute('height', String(height));

    if (!clonedSvg.getAttribute('viewBox')) {
      clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    if (options.setClonedSvgInlineSize) {
      clonedSvg.style.width = `${width}px`;
      clonedSvg.style.height = `${height}px`;
    }

    const img = svgElement.ownerDocument.createElement('img');

    if (options.imageClassName) {
      img.className = options.imageClassName;
    }

    if (options.preserveSvgId && svgElement.id) {
      img.id = `${svgElement.id}-img`;
    }

    img.src = encodeSvgForDataUrl(clonedSvg);
    img.style.width = `${width}px`;
    img.style.height = `${height}px`;

    if (options.setImageMaxWidth) {
      img.style.maxWidth = '100%';
    }

    img.style.display = 'block';
    img.style.margin = '0 auto';

    if (options.storeOriginalSize) {
      img.dataset.originalWidth = String(width);
      img.dataset.originalHeight = String(height);
    }

    container.innerHTML = '';
    container.appendChild(img);
    replacedCount += 1;
  });

  return replacedCount;
}

export interface RemovedMathJaxArtifacts {
  assistiveElements: number;
  scripts: number;
}

export function removeExportMathJaxArtifacts(root: ParentNode): RemovedMathJaxArtifacts {
  let assistiveElements = 0;
  let scripts = 0;

  root.querySelectorAll<HTMLElement>('mjx-assistive-mml').forEach((element) => {
    element.style.display = 'none';
    element.style.visibility = 'hidden';
    element.style.position = 'absolute';
    element.style.width = '0';
    element.style.height = '0';
    element.style.overflow = 'hidden';
    element.remove();
    assistiveElements += 1;
  });

  root.querySelectorAll('script[type*="math"], script[type*="tex"]').forEach((element) => {
    element.remove();
    scripts += 1;
  });

  return {
    assistiveElements,
    scripts
  };
}
