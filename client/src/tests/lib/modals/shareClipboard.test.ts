// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyTextToClipboard } from '../../../lib/modals/shareClipboard';

describe('share clipboard helper', () => {
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

  it('writes through navigator.clipboard when the context is secure', async () => {
    const writeText = vi.fn(async () => {});

    const copied = await copyTextToClipboard('https://example.com/share/token', {
      isSecureContext: true,
      navigatorRef: { clipboard: { writeText } }
    });

    expect(copied).toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://example.com/share/token');
  });

  it('keeps secure clipboard failures silent without falling back', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('clipboard denied');
    });
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand
    });

    const copied = await copyTextToClipboard('https://example.com/share/token', {
      documentRef: document,
      isSecureContext: true,
      navigatorRef: { clipboard: { writeText } }
    });

    expect(copied).toBe(false);
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('uses a temporary textarea fallback outside secure clipboard contexts', async () => {
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand
    });

    const copied = await copyTextToClipboard('https://example.com/share/token', {
      documentRef: document,
      isSecureContext: false,
      navigatorRef: {}
    });

    expect(copied).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('reports a failed temporary textarea fallback', async () => {
    const execCommand = vi.fn(() => false);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand
    });

    const copied = await copyTextToClipboard('https://example.com/share/token', {
      documentRef: document,
      isSecureContext: false,
      navigatorRef: {}
    });

    expect(copied).toBe(false);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('allows copying an empty string', async () => {
    const writeText = vi.fn(async () => {});

    const copied = await copyTextToClipboard('', {
      isSecureContext: true,
      navigatorRef: { clipboard: { writeText } }
    });

    expect(copied).toBe(true);
    expect(writeText).toHaveBeenCalledWith('');
  });
});
