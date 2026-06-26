import {
  fetchSvgOriginalDimensions,
  type SvgOriginalDimensions
} from './diagramExport';

export interface DiagramRasterOptions {
  createCanvas?: (documentRef: Document) => HTMLCanvasElement;
  createImage?: () => HTMLImageElement;
  createObjectUrl?: (blob: Blob) => string;
  documentRef?: Document;
  fetchSvgDimensions?: (url: string) => Promise<SvgOriginalDimensions | null>;
  scale?: number;
}

function resolveSize(imgEl: HTMLImageElement, originalDim: SvgOriginalDimensions | null): { height: number; width: number } {
  if (originalDim) {
    return {
      height: originalDim.height,
      width: originalDim.width
    };
  }

  return {
    height: imgEl.naturalHeight || imgEl.height || 600,
    width: imgEl.naturalWidth || imgEl.width || 800
  };
}

function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

export async function rasterizeDiagramImageToPngBlob(
  imgEl: HTMLImageElement,
  options: DiagramRasterOptions = {}
): Promise<Blob> {
  const fetchSvgDimensions = options.fetchSvgDimensions ?? fetchSvgOriginalDimensions;
  const originalDim = await fetchSvgDimensions(imgEl.src);
  const documentRef = options.documentRef ?? document;
  const canvas = options.createCanvas
    ? options.createCanvas(documentRef)
    : documentRef.createElement('canvas');
  const scale = options.scale ?? 2;
  const { height, width } = resolveSize(imgEl, originalDim);

  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not available.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.scale(scale, scale);

  const image = options.createImage ? options.createImage() : new Image();
  const createObjectUrl = options.createObjectUrl ?? ((blob: Blob) => URL.createObjectURL(blob));

  return new Promise((resolve, reject) => {
    image.onload = () => {
      context.drawImage(image, 0, 0, width, height);
      toPngBlob(canvas).then(resolve, reject);
    };

    image.onerror = () => {
      try {
        context.drawImage(imgEl, 0, 0, width, height);
        toPngBlob(canvas).then(resolve, reject);
      } catch (error) {
        reject(error);
      }
    };

    if (originalDim?.text) {
      const blob = new Blob([originalDim.text], { type: 'image/svg+xml;charset=utf-8' });
      image.src = createObjectUrl(blob);
      return;
    }

    image.src = imgEl.src;
  });
}
