// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  copyMarkdownDocument,
  copyTextToClipboardOrThrow,
  createMarkdownExportBlob,
  exportMarkdownDocument,
  openImportGithubAction,
  openShareAction,
  triggerFileImport
} from '../../../lib/header/documentActions';

describe('header document actions', () => {
  const originalExecCommand = document.execCommand;

  afterEach(() => {
    if (originalExecCommand) {
      Object.defineProperty(document, 'execCommand', {
        configurable: true,
        value: originalExecCommand
      });
    } else {
      delete (document as unknown as { execCommand?: unknown }).execCommand;
    }
    document.body.innerHTML = '';
  });

  it('opens the hidden file input and prevents navigation', () => {
    const event = new MouseEvent('click', { cancelable: true });
    const fileInput = { click: vi.fn() };

    triggerFileImport(fileInput, event);

    expect(event.defaultPrevented).toBe(true);
    expect(fileInput.click).toHaveBeenCalledOnce();
  });

  it('exports markdown using the current filename', async () => {
    const event = new MouseEvent('click', { cancelable: true });
    const saveAs = vi.fn();

    const exported = exportMarkdownDocument({
      event,
      markdown: '# Title',
      filename: 'notes.md',
      saveAs
    });

    expect(exported).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(saveAs).toHaveBeenCalledOnce();

    const [blob, filename] = saveAs.mock.calls[0] as [Blob, string];
    expect(filename).toBe('notes.md');
    expect(blob.type).toBe('text/markdown;charset=utf-8');
    expect(await blob.text()).toBe('# Title');
  });

  it('reports markdown export failures without throwing', () => {
    const consoleRef = { error: vi.fn() };
    const alertRef = vi.fn();

    const exported = exportMarkdownDocument({
      markdown: '# Title',
      filename: 'notes.md',
      saveAs: () => {
        throw new Error('disk denied');
      },
      consoleRef,
      alertRef
    });

    expect(exported).toBe(false);
    expect(consoleRef.error).toHaveBeenCalledWith('Export failed:', expect.any(Error));
    expect(alertRef).toHaveBeenCalledWith('Export failed: disk denied');
  });

  it('creates the markdown export blob shape', async () => {
    const blob = createMarkdownExportBlob('');

    expect(blob.type).toBe('text/markdown;charset=utf-8');
    expect(await blob.text()).toBe('');
  });

  it('copies markdown and restores transient button feedback', async () => {
    const event = new MouseEvent('click', { cancelable: true });
    const copyText = vi.fn(async () => {});
    const timers: Array<() => void> = [];
    const setTimer = vi.fn((callback: () => void) => {
      timers.push(callback);
      return 1;
    });
    const button = document.createElement('button');
    button.innerHTML = '<i class="bi bi-clipboard"></i> Copy';

    const copied = await copyMarkdownDocument({
      event,
      markdown: '# Title',
      button,
      copyText,
      setTimer,
      restoreDelayMs: 5
    });

    expect(copied).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(copyText).toHaveBeenCalledWith('# Title');
    expect(button.innerHTML).toBe('<i class="bi bi-check-lg"></i> Copied!');
    expect(setTimer).toHaveBeenCalledWith(expect.any(Function), 5);

    timers[0]();
    expect(button.innerHTML).toBe('<i class="bi bi-clipboard"></i> Copy');
  });

  it('reports markdown copy failures without throwing', async () => {
    const consoleRef = { error: vi.fn() };
    const alertRef = vi.fn();

    const copied = await copyMarkdownDocument({
      markdown: '# Title',
      copyText: async () => {
        throw new Error('clipboard denied');
      },
      consoleRef,
      alertRef
    });

    expect(copied).toBe(false);
    expect(consoleRef.error).toHaveBeenCalledWith('Copy failed:', expect.any(Error));
    expect(alertRef).toHaveBeenCalledWith('Failed to copy Markdown: clipboard denied');
  });

  it('rejects clipboard helper failures for older callers', async () => {
    const execCommand = vi.fn(() => false);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand
    });

    await expect(copyTextToClipboardOrThrow('symbol', {
      documentRef: document,
      isSecureContext: false,
      navigatorRef: {}
    })).rejects.toThrow('Copy command was unsuccessful');
  });

  it('closes the mobile menu before opening GitHub import from mobile actions', () => {
    const event = new MouseEvent('click', { cancelable: true });
    const closeMobileMenu = vi.fn();
    const openGitHubImportModal = vi.fn();

    openImportGithubAction({
      event,
      variant: 'mobile',
      closeMobileMenu,
      openGitHubImportModal
    });

    expect(event.defaultPrevented).toBe(true);
    expect(closeMobileMenu).toHaveBeenCalledOnce();
    expect(openGitHubImportModal).toHaveBeenCalledOnce();
  });

  it('opens share modal through the injected share command', () => {
    const event = new MouseEvent('click', { cancelable: true });
    const openShareModal = vi.fn();

    openShareAction({ event, openShareModal });

    expect(event.defaultPrevented).toBe(true);
    expect(openShareModal).toHaveBeenCalledOnce();
  });
});
