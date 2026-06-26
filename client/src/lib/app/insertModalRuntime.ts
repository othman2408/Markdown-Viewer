import { copyTextToClipboardOrThrow } from '../header/documentActions';
import { cleanupTrackedImageObjectUrls, openInsertImageModal } from '../modals/insertImageModal';
import { openInsertLinkModal } from '../modals/insertLinkModal';
import { openInsertReferenceModal } from '../modals/insertReferenceModal';
import { openInsertTableModal } from '../modals/insertTableModal';
import { openInsertEmojiModal } from '../modals/insertEmojiModal';
import { openInsertSymbolsModal } from '../modals/insertSymbolsModal';
import { openInsertAlertModal } from '../modals/insertAlertModal';

export interface InsertModalEditor {
  dispatchEvent(event: Event): boolean;
  focus(): void;
  selectionEnd: number;
  selectionStart: number;
  setSelectionRange(start: number, end: number): void;
  value: string;
}

export interface InsertModalCloudStorage {
  enabled: boolean;
}

export interface InsertModalEmojiPostProcessor {
  hasLookupLoaded(): boolean;
  loadEntries(): Promise<Array<{
    name: string;
    search: string;
    shortcode: string;
    url: string;
  }>>;
}

export interface CreateInsertModalRuntimeOptions {
  alertRef?: (message?: unknown) => void;
  announce(message: string): void;
  cloudApi(path: string, init?: RequestInit): Promise<{ url: string }>;
  cloudStorage: InsertModalCloudStorage;
  consoleRef?: Pick<Console, 'error'>;
  copyText?: typeof copyTextToClipboardOrThrow;
  createObjectUrl?: (file: File) => string;
  documentRef?: Document;
  editor: InsertModalEditor;
  emojiPostProcessor: InsertModalEmojiPostProcessor;
  getTrackedContents(): string[];
  insertMarkdownBlock(block: string, start: number, end: number): void;
  replaceEditorRange(
    start: number,
    end: number,
    replacement: string,
    selectionStart?: number,
    selectionEnd?: number
  ): void;
  requestFrame?: (callback: FrameRequestCallback) => number;
  revokeObjectUrl?: (url: string) => void;
  windowRef?: Pick<Window, 'clearTimeout' | 'setTimeout'>;
}

export interface InsertModalRuntime {
  cleanupImageObjectUrls(): void;
  insertMarkdownImage(): void;
  insertMarkdownLink(): void;
  insertMarkdownReference(): void;
  openAlertModal(): void;
  openEmojiModal(): void;
  openSymbolsModal(): void;
  openTableModal(): void;
}

type CopyButton = HTMLElement & {
  copyTimeout?: ReturnType<typeof setTimeout>;
};

export function createInsertModalRuntime(options: CreateInsertModalRuntimeOptions): InsertModalRuntime {
  const documentRef = options.documentRef ?? document;
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const consoleRef = options.consoleRef ?? console;
  const alertRef = options.alertRef ?? alert;
  const copyText = options.copyText ?? copyTextToClipboardOrThrow;
  const createObjectUrl = options.createObjectUrl ?? URL.createObjectURL;
  const revokeObjectUrl = options.revokeObjectUrl ?? URL.revokeObjectURL;
  const windowRef = options.windowRef ?? window;
  const imageObjectUrls = new Set<string>();
  let referenceCounter = 1;

  function getSelection() {
    return {
      start: options.editor.selectionStart,
      end: options.editor.selectionEnd
    };
  }

  function replaceRange(input: {
    end: number;
    replacement: string;
    selectionEnd: number;
    selectionStart: number;
    start: number;
  }): void {
    options.replaceEditorRange(
      input.start,
      input.end,
      input.replacement,
      input.selectionStart,
      input.selectionEnd
    );
  }

  function insertBlock(input: {
    block: string;
    end: number;
    start: number;
  }): void {
    options.insertMarkdownBlock(input.block, input.start, input.end);
  }

  function cleanupImageObjectUrls(): void {
    cleanupTrackedImageObjectUrls({
      contents: options.getTrackedContents(),
      objectUrls: imageObjectUrls,
      revokeObjectUrl
    });
  }

  function flashCopyButton(button: HTMLElement): void {
    const copyButton = button as CopyButton;
    const icon = copyButton.querySelector('i');
    if (!icon) return;
    icon.className = 'bi bi-check-lg';
    copyButton.classList.add('is-copied');
    windowRef.clearTimeout(copyButton.copyTimeout);
    copyButton.copyTimeout = windowRef.setTimeout(() => {
      icon.className = 'bi bi-clipboard';
      copyButton.classList.remove('is-copied');
    }, 1200);
  }

  function openTableModal(): void {
    const { start, end } = getSelection();
    openInsertTableModal({
      documentRef,
      requestFrame,
      selectionEnd: end,
      selectionStart: start,
      insertBlock
    });
  }

  function openEmojiModal(): void {
    const { start, end } = getSelection();
    openInsertEmojiModal({
      announce: options.announce,
      consoleRef,
      copyText,
      documentRef,
      flashCopyButton,
      hasLookupLoaded: options.emojiPostProcessor.hasLookupLoaded(),
      loadEntries: options.emojiPostProcessor.loadEntries,
      replaceRange,
      requestFrame,
      selectionEnd: end,
      selectionStart: start
    });
  }

  function openSymbolsModal(): void {
    const { start, end } = getSelection();
    openInsertSymbolsModal({
      consoleRef,
      copyText,
      documentRef,
      flashCopyButton,
      replaceRange,
      requestFrame,
      selectionEnd: end,
      selectionStart: start
    });
  }

  function openAlertModal(): void {
    const { start, end } = getSelection();
    openInsertAlertModal({
      documentRef,
      selectionEnd: end,
      selectionStart: start,
      insertBlock
    });
  }

  function insertMarkdownLink(): void {
    const { start, end } = getSelection();
    const selected = options.editor.value.slice(start, end);
    openInsertLinkModal({
      documentRef,
      requestFrame,
      selectedText: selected,
      selectionEnd: end,
      selectionStart: start,
      replaceRange
    });
  }

  function insertMarkdownImage(): void {
    const { start, end } = getSelection();
    const selected = options.editor.value.slice(start, end);
    openInsertImageModal({
      alertMessage: (message) => alertRef(message),
      cloudStorageEnabled: options.cloudStorage.enabled,
      consoleRef,
      createObjectUrl,
      documentRef,
      replaceRange,
      requestFrame,
      selectedText: selected,
      selectionEnd: end,
      selectionStart: start,
      trackObjectUrl: (url) => imageObjectUrls.add(url),
      uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        return options.cloudApi('/api/assets', {
          method: 'POST',
          body: formData
        }).then((result) => result.url);
      }
    });
  }

  function insertMarkdownReference(): void {
    const { start, end } = getSelection();
    const suggestion = openInsertReferenceModal({
      documentRef,
      getMarkdownValue: () => options.editor.value,
      referenceCounter,
      requestFrame,
      selectionEnd: end,
      selectionStart: start,
      applyReference(input) {
        options.editor.value = input.updatedValue;
        options.editor.focus();
        options.editor.setSelectionRange(input.caret, input.caret);
        options.editor.dispatchEvent(new Event('input', { bubbles: true }));
        referenceCounter = Math.max(referenceCounter, input.finalNumber + 1);
      }
    });

    if (suggestion) {
      referenceCounter = suggestion.referenceCounter;
    }
  }

  return {
    cleanupImageObjectUrls,
    insertMarkdownImage,
    insertMarkdownLink,
    insertMarkdownReference,
    openAlertModal,
    openEmojiModal,
    openSymbolsModal,
    openTableModal
  };
}
