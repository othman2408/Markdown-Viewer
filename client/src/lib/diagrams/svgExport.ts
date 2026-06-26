export interface SvgCanvasSize {
  height: number;
  width: number;
}

export interface SvgToCanvasOptions {
  documentRef?: Document;
  getBackgroundColor?: () => string;
  imageFactory?: () => HTMLImageElement;
  scale?: number;
}

function getSvgPixelSize(svgElement: SVGElement): SvgCanvasSize {
  const bbox = svgElement.getBoundingClientRect();
  return {
    width: Math.max(Math.round(bbox.width), 1),
    height: Math.max(Math.round(bbox.height), 1)
  };
}

export function svgToDataUrl(svgElement: SVGElement): string {
  const clone = svgElement.cloneNode(true) as SVGElement;
  const size = getSvgPixelSize(svgElement);
  if (!clone.getAttribute('width')) clone.setAttribute('width', String(size.width));
  if (!clone.getAttribute('height')) clone.setAttribute('height', String(size.height));
  const serialized = new XMLSerializer().serializeToString(clone);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
}

function getRuntimeBackgroundColor(): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--bg-color')
    .trim() || '#ffffff';
}

export function svgToCanvas(
  svgElement: SVGElement,
  options: SvgToCanvasOptions = {}
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const documentRef = options.documentRef ?? document;
    const scale = options.scale ?? 2;
    const size = getSvgPixelSize(svgElement);
    const canvas = documentRef.createElement('canvas');
    canvas.width = size.width * scale;
    canvas.height = size.height * scale;
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('Canvas 2D context is not available.'));
      return;
    }

    context.scale(scale, scale);
    context.fillStyle = options.getBackgroundColor
      ? options.getBackgroundColor()
      : getRuntimeBackgroundColor();
    context.fillRect(0, 0, size.width, size.height);

    const image = options.imageFactory ? options.imageFactory() : new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, size.width, size.height);
      resolve(canvas);
    };
    image.onerror = reject;
    image.src = svgToDataUrl(svgElement);
  });
}
