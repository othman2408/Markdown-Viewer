export interface PdfPageTarget {
  addImage(
    imageData: string,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void;
  addPage(): void;
}

export interface RenderCanvasToPdfPagesOptions {
  contentWidth: number;
  documentRef?: Document;
  imageFormat?: string;
  margin: number;
  pageHeight: number;
  progressStart?: number;
  progressSpan?: number;
  throwIfAborted?: () => void;
  updateProgress?: (percent: number, step: string) => void;
  waitForPage?: () => Promise<void>;
}

export interface RenderCanvasToPdfPagesResult {
  imageHeight: number;
  pagesCount: number;
  scaleFactor: number;
}

export async function renderCanvasToPdfPages(
  canvas: HTMLCanvasElement,
  pdf: PdfPageTarget,
  options: RenderCanvasToPdfPagesOptions
): Promise<RenderCanvasToPdfPagesResult> {
  const documentRef = options.documentRef ?? document;
  const imageFormat = options.imageFormat ?? 'PNG';
  const progressStart = options.progressStart ?? 76;
  const progressSpan = options.progressSpan ?? 18;
  const pageContentHeight = options.pageHeight - options.margin * 2;
  const scaleFactor = canvas.width / options.contentWidth;
  const imageHeight = canvas.height / scaleFactor;
  const pagesCount = Math.ceil((imageHeight - 0.5) / pageContentHeight);

  for (let page = 0; page < pagesCount; page += 1) {
    options.throwIfAborted?.();
    options.updateProgress?.(
      progressStart + ((page + 1) / pagesCount) * progressSpan,
      `Rendering page ${page + 1} of ${pagesCount}`
    );
    if (page > 0) pdf.addPage();

    const sourceY = page * pageContentHeight * scaleFactor;
    const sourceHeight = Math.min(canvas.height - sourceY, pageContentHeight * scaleFactor);
    const destHeight = sourceHeight / scaleFactor;
    const pageCanvas = documentRef.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sourceHeight;
    const context = pageCanvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context is not available.');
    }

    context.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
    pdf.addImage(
      pageCanvas.toDataURL('image/png'),
      imageFormat,
      options.margin,
      options.margin,
      options.contentWidth,
      destHeight
    );
    await options.waitForPage?.();
  }

  return {
    imageHeight,
    pagesCount,
    scaleFactor
  };
}
