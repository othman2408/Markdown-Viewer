import {
  copyTextToClipboard,
  type CopyTextToClipboardOptions
} from '../modals/shareClipboard';
import type { HeaderActionVariant } from './headerActionBridge';

type AlertFn = (message: string) => void;
type ConsoleErrorLike = Pick<Console, 'error'>;
type SaveAsFn = (blob: Blob, filename: string) => void;
type TimerFn = (callback: () => void, delayMs: number) => unknown;

export interface ExportMarkdownDocumentOptions {
  event?: Event;
  markdown: string;
  filename: string;
  saveAs: SaveAsFn;
  alertRef?: AlertFn;
  consoleRef?: ConsoleErrorLike;
}

export interface CopyMarkdownDocumentOptions {
  event?: Event;
  markdown: string;
  button?: HTMLElement | null;
  copyText?: (text: string) => Promise<void>;
  restoreDelayMs?: number;
  setTimer?: TimerFn;
  alertRef?: AlertFn;
  consoleRef?: ConsoleErrorLike;
}

export interface ImportGithubActionOptions {
  event?: Event;
  variant?: HeaderActionVariant;
  closeMobileMenu: () => void;
  openGitHubImportModal: () => void;
}

export interface ShareActionOptions {
  event?: Event;
  openShareModal: () => void;
}

function preventDefault(event?: Event): void {
  event?.preventDefault();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getRuntimeAlert(): AlertFn | undefined {
  if (typeof window === 'undefined' || typeof window.alert !== 'function') {
    return undefined;
  }

  return window.alert.bind(window);
}

function getRuntimeTimer(): TimerFn {
  return (callback, delayMs) => globalThis.setTimeout(callback, delayMs);
}

function showCopiedMessage(
  button: HTMLElement | null | undefined,
  setTimer: TimerFn,
  restoreDelayMs: number
): void {
  if (!button) return;

  const originalText = button.innerHTML;
  button.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
  setTimer(() => {
    button.innerHTML = originalText;
  }, restoreDelayMs);
}

export function triggerFileImport(
  fileInput: Pick<HTMLInputElement, 'click'> | null | undefined,
  event?: Event
): void {
  preventDefault(event);
  fileInput?.click();
}

export function createMarkdownExportBlob(markdown: string): Blob {
  return new Blob([markdown], {
    type: 'text/markdown;charset=utf-8'
  });
}

export function exportMarkdownDocument(options: ExportMarkdownDocumentOptions): boolean {
  preventDefault(options.event);

  try {
    options.saveAs(createMarkdownExportBlob(options.markdown), options.filename);
    return true;
  } catch (error) {
    const consoleRef = options.consoleRef ?? console;
    const alertRef = options.alertRef ?? getRuntimeAlert();
    consoleRef.error('Export failed:', error);
    alertRef?.(`Export failed: ${getErrorMessage(error)}`);
    return false;
  }
}

export async function copyTextToClipboardOrThrow(
  text: string,
  options?: CopyTextToClipboardOptions
): Promise<void> {
  const copied = await copyTextToClipboard(text, options);
  if (!copied) {
    throw new Error('Copy command was unsuccessful');
  }
}

export async function copyMarkdownDocument(options: CopyMarkdownDocumentOptions): Promise<boolean> {
  preventDefault(options.event);

  try {
    await (options.copyText ?? copyTextToClipboardOrThrow)(options.markdown);
    showCopiedMessage(
      options.button,
      options.setTimer ?? getRuntimeTimer(),
      options.restoreDelayMs ?? 2000
    );
    return true;
  } catch (error) {
    const consoleRef = options.consoleRef ?? console;
    const alertRef = options.alertRef ?? getRuntimeAlert();
    consoleRef.error('Copy failed:', error);
    alertRef?.(`Failed to copy Markdown: ${getErrorMessage(error)}`);
    return false;
  }
}

export function openImportGithubAction(options: ImportGithubActionOptions): void {
  preventDefault(options.event);
  if (options.variant === 'mobile') options.closeMobileMenu();
  options.openGitHubImportModal();
}

export function openShareAction(options: ShareActionOptions): void {
  preventDefault(options.event);
  options.openShareModal();
}
