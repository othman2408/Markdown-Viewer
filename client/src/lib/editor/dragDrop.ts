type AlertFn = (message: string) => void;

export interface DataTransferLike {
  files?: ArrayLike<File>;
  types?: ArrayLike<string> & {
    contains?: (value: string) => boolean;
    includes?: (value: string) => boolean;
  };
}

export interface FileDragEventLike {
  dataTransfer?: DataTransferLike | null;
  preventDefault(): void;
}

export interface FileDragDropControllerOptions {
  alertRef?: AlertFn;
  importMarkdownFile: (file: File) => void;
  isMarkdownUploadFile: (file: File) => boolean;
  overlay: HTMLElement | null;
}

export interface FileDragDropController {
  getDragDepth(): number;
  handleDragEnter(event: FileDragEventLike): void;
  handleDragLeave(event: FileDragEventLike): void;
  handleDragOver(event: FileDragEventLike): void;
  handleDrop(event: FileDragEventLike): void;
}

export interface FileDragDropAttachment {
  detach(): void;
}

function getRuntimeAlert(): AlertFn | undefined {
  if (typeof window === 'undefined' || typeof window.alert !== 'function') {
    return undefined;
  }

  return window.alert.bind(window);
}

export function dataTransferHasFiles(dataTransfer?: DataTransferLike | null): boolean {
  const types = dataTransfer?.types;
  if (!types) return false;
  if (typeof types.includes === 'function') return types.includes('Files');
  if (typeof types.contains === 'function') return types.contains('Files');

  return Array.prototype.includes.call(types, 'Files');
}

function setOverlayActive(overlay: HTMLElement | null, active: boolean): void {
  if (!overlay) return;
  overlay.classList.toggle('active', active);
  overlay.setAttribute('aria-hidden', active ? 'false' : 'true');
}

function getFirstFile(dataTransfer?: DataTransferLike | null): File | null {
  const files = dataTransfer?.files;
  return files && files.length ? files[0] : null;
}

export function createFileDragDropController(
  options: FileDragDropControllerOptions
): FileDragDropController {
  let dragDepth = 0;

  return {
    getDragDepth() {
      return dragDepth;
    },

    handleDragEnter(event) {
      if (!dataTransferHasFiles(event.dataTransfer)) return;
      event.preventDefault();
      dragDepth += 1;
      setOverlayActive(options.overlay, true);
    },

    handleDragOver(event) {
      if (!dataTransferHasFiles(event.dataTransfer)) return;
      event.preventDefault();
    },

    handleDragLeave(event) {
      if (!dataTransferHasFiles(event.dataTransfer)) return;
      dragDepth -= 1;
      if (dragDepth <= 0) {
        dragDepth = 0;
        setOverlayActive(options.overlay, false);
      }
    },

    handleDrop(event) {
      event.preventDefault();
      dragDepth = 0;
      setOverlayActive(options.overlay, false);
      const file = getFirstFile(event.dataTransfer);
      if (!file) return;

      if (options.isMarkdownUploadFile(file)) {
        options.importMarkdownFile(file);
      } else {
        const alertRef = options.alertRef ?? getRuntimeAlert();
        alertRef?.('Please upload a Markdown file (.md or .markdown)');
      }
    }
  };
}

export function attachFileDragDropController(
  documentRef: Document,
  controller: FileDragDropController
): FileDragDropAttachment {
  const handleDragEnter = (event: DragEvent) => controller.handleDragEnter(event);
  const handleDragOver = (event: DragEvent) => controller.handleDragOver(event);
  const handleDragLeave = (event: DragEvent) => controller.handleDragLeave(event);
  const handleDrop = (event: DragEvent) => controller.handleDrop(event);

  documentRef.addEventListener('dragenter', handleDragEnter);
  documentRef.addEventListener('dragover', handleDragOver);
  documentRef.addEventListener('dragleave', handleDragLeave);
  documentRef.addEventListener('drop', handleDrop);

  return {
    detach() {
      documentRef.removeEventListener('dragenter', handleDragEnter);
      documentRef.removeEventListener('dragover', handleDragOver);
      documentRef.removeEventListener('dragleave', handleDragLeave);
      documentRef.removeEventListener('drop', handleDrop);
    }
  };
}
