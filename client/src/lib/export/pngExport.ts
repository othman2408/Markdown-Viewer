export type SaveAsFn = (blob: Blob, filename: string) => void;

export interface SaveCanvasAsPngOptions {
  saveAsFn?: SaveAsFn;
}

function getGlobalSaveAs(): SaveAsFn {
  const globalSaveAs = (globalThis as typeof globalThis & { saveAs?: SaveAsFn }).saveAs;
  if (!globalSaveAs) {
    throw new Error('saveAs is not available.');
  }

  return globalSaveAs;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
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

export async function saveCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string,
  options: SaveCanvasAsPngOptions = {}
): Promise<void> {
  const blob = await canvasToPngBlob(canvas);
  const saveAsFn = options.saveAsFn ?? getGlobalSaveAs();
  saveAsFn(blob, filename);
}
