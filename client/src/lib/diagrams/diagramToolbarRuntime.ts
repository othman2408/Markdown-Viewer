import {
  copyModalDiagramImage,
  copySvgDiagramImage,
  downloadModalDiagramPng,
  downloadModalDiagramSvg,
  downloadSvgDiagramPng,
  downloadSvgDiagramSource
} from './svgDiagramActions';
import {
  downloadSvgWithFallback,
  fetchSvgOriginalDimensions,
  getDiagramPngUrlFromSvgUrl
} from './diagramExport';
import { rasterizeDiagramImageToPngBlob } from './diagramRaster';
import { addRemoteDiagramToolbars } from './diagramToolbar';
import { createDiagramZoomModalController } from './diagramZoomModalController';
import {
  copyRemoteDiagramImage,
  downloadRemoteDiagramPng,
  downloadRemoteDiagramSvg,
  openRemoteImageZoomModal
} from './remoteDiagramActions';

type ClipboardWriter = (items: ClipboardItem[]) => Promise<void>;

export type DiagramToolbarRuntimeOptions = {
  consoleRef?: Pick<Console, 'error' | 'warn'>;
  documentRef?: Document;
  markdownPreview: HTMLElement;
  writeClipboard?: ClipboardWriter;
};

export type DiagramToolbarRuntime = {
  addD2Toolbars(): void;
  addGraphvizToolbars(): void;
  addMermaidToolbars(): void;
  addPlantumlToolbars(): void;
  closeMermaidModal(): void;
  copyAbcImage(container: HTMLElement, button: HTMLElement): Promise<void>;
  downloadAbcPng(container: HTMLElement, button: HTMLElement): Promise<void>;
  downloadAbcSvg(container: HTMLElement, button: HTMLElement): void;
};

export function createDiagramToolbarRuntime(
  options: DiagramToolbarRuntimeOptions
): DiagramToolbarRuntime {
  const consoleRef = options.consoleRef ?? console;
  const writeClipboard = options.writeClipboard ?? ((items) => navigator.clipboard.write(items));
  const diagramZoomModalController = createDiagramZoomModalController({
    documentRef: options.documentRef ?? document,
    async onDownloadPng(element, button) {
      await downloadModalDiagramPng(element, button, {
        getPngUrl: getDiagramPngUrlFromSvgUrl,
        error: consoleRef.error
      });
    },
    async onCopy(element, button) {
      await copyModalDiagramImage(element, button, {
        getPngUrl: getDiagramPngUrlFromSvgUrl,
        error: consoleRef.error,
        writeClipboard
      });
    },
    onDownloadSvg(element) {
      void downloadModalDiagramSvg(element, {
        error: consoleRef.error
      });
    }
  });

  async function downloadAbcPng(container: HTMLElement, btn: HTMLElement): Promise<void> {
    await downloadSvgDiagramPng(container, btn, {
      filenamePrefix: 'score',
      label: 'ABC',
      error: consoleRef.error
    });
  }

  async function copyAbcImage(container: HTMLElement, btn: HTMLElement): Promise<void> {
    await copySvgDiagramImage(container, btn, {
      filenamePrefix: 'score',
      label: 'ABC',
      error: consoleRef.error,
      writeClipboard
    });
  }

  function downloadAbcSvg(container: HTMLElement, btn: HTMLElement): void {
    downloadSvgDiagramSource(container, btn, {
      filenamePrefix: 'score',
      label: 'ABC'
    });
  }

  async function downloadMermaidPng(container: HTMLElement, btn: HTMLElement): Promise<void> {
    await downloadSvgDiagramPng(container, btn, {
      filenamePrefix: 'diagram',
      label: 'Mermaid',
      error: consoleRef.error
    });
  }

  async function copyMermaidImage(container: HTMLElement, btn: HTMLElement): Promise<void> {
    await copySvgDiagramImage(container, btn, {
      filenamePrefix: 'diagram',
      label: 'Mermaid',
      error: consoleRef.error,
      writeClipboard
    });
  }

  function downloadMermaidSvg(container: HTMLElement, btn: HTMLElement): void {
    downloadSvgDiagramSource(container, btn, {
      filenamePrefix: 'diagram',
      label: 'Mermaid'
    });
  }

  function closeMermaidModal(): void {
    diagramZoomModalController?.close();
  }

  function openMermaidZoomModal(container: Element): void {
    diagramZoomModalController?.openSvgFromContainer(container);
  }

  async function getDiagramPngBlob(imgEl: HTMLImageElement): Promise<Blob> {
    return rasterizeDiagramImageToPngBlob(imgEl, {
      fetchSvgDimensions: (url) => fetchSvgOriginalDimensions(url, {
        warn: consoleRef.warn
      })
    });
  }

  async function downloadSvgHelper(
    imgEl: HTMLImageElement,
    filename: string,
    btn: HTMLElement,
    originalHtml: string
  ): Promise<void> {
    await downloadSvgWithFallback(imgEl, filename, btn, originalHtml, {
      warn: consoleRef.warn,
      error: consoleRef.error
    });
  }

  const remoteDiagramPngOptions = {
    getPngUrl: getDiagramPngUrlFromSvgUrl,
    getPngBlob: getDiagramPngBlob,
    error: consoleRef.error
  };
  const remoteDiagramCopyOptions = {
    ...remoteDiagramPngOptions,
    writeClipboard
  };

  function openRemoteDiagramZoom(container: Element): void {
    diagramZoomModalController?.openRemoteImageFromContainer(container, openRemoteImageZoomModal);
  }

  function addRemoteToolbarSet(input: {
    buttonClassName: string;
    containerSelector: string;
    label: 'PlantUML' | 'D2' | 'Graphviz';
    toolbarClassName: string;
  }): void {
    addRemoteDiagramToolbars(options.markdownPreview, {
      containerSelector: input.containerSelector,
      toolbarClassName: input.toolbarClassName,
      buttonClassName: input.buttonClassName,
      onZoom: openRemoteDiagramZoom,
      onCopy: (container, button) => copyRemoteDiagramImage(container, button, input.label, remoteDiagramCopyOptions),
      onPng: (container, button) => downloadRemoteDiagramPng(container, button, input.label, remoteDiagramPngOptions),
      onSvg: (container, button) => downloadRemoteDiagramSvg(container, button, {
        downloadSvg: downloadSvgHelper
      })
    });
  }

  function addMermaidToolbars(): void {
    addRemoteDiagramToolbars(options.markdownPreview, {
      containerSelector: '.mermaid-container',
      toolbarClassName: 'mermaid-toolbar',
      buttonClassName: 'mermaid-toolbar-btn',
      renderedTargetSelector: 'svg',
      onZoom: openMermaidZoomModal,
      onCopy: (container, button) => copyMermaidImage(container as HTMLElement, button),
      onPng: (container, button) => downloadMermaidPng(container as HTMLElement, button),
      onSvg: (container, button) => downloadMermaidSvg(container as HTMLElement, button)
    });
  }

  return {
    addD2Toolbars() {
      addRemoteToolbarSet({
        containerSelector: '.d2-container',
        toolbarClassName: 'd2-toolbar',
        buttonClassName: 'd2-toolbar-btn',
        label: 'D2'
      });
    },
    addGraphvizToolbars() {
      addRemoteToolbarSet({
        containerSelector: '.graphviz-container',
        toolbarClassName: 'graphviz-toolbar',
        buttonClassName: 'graphviz-toolbar-btn',
        label: 'Graphviz'
      });
    },
    addMermaidToolbars,
    addPlantumlToolbars() {
      addRemoteToolbarSet({
        containerSelector: '.plantuml-container',
        toolbarClassName: 'plantuml-toolbar',
        buttonClassName: 'plantuml-toolbar-btn',
        label: 'PlantUML'
      });
    },
    closeMermaidModal,
    copyAbcImage,
    downloadAbcPng,
    downloadAbcSvg
  };
}
