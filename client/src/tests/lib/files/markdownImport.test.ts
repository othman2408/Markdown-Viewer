// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  MARKDOWN_IMPORT_ERRORS,
  MAX_MARKDOWN_IMPORT_BYTES,
  attachMarkdownFileInputController,
  getLocalMarkdownImportTitle,
  hasBinaryNullByte,
  importMarkdownFileToTab,
  isMarkdownUploadFile,
  readMarkdownImportFile
} from '../../../lib/files/markdownImport';

function createFile(name: string, text = '# Title', type = 'text/markdown'): File {
  return new File([text], name, { type });
}

function setInputFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files
  });
}

describe('markdown file import helpers', () => {
  it('detects markdown upload files by type or extension', () => {
    expect(isMarkdownUploadFile(createFile('notes.txt'))).toBe(true);
    expect(isMarkdownUploadFile(createFile('notes.MARKDOWN', '', ''))).toBe(true);
    expect(isMarkdownUploadFile(createFile('notes.txt', '', 'text/plain'))).toBe(false);
  });

  it('keeps the local import title behavior', () => {
    expect(getLocalMarkdownImportTitle('notes.md')).toBe('notes');
    expect(getLocalMarkdownImportTitle('notes.MD')).toBe('notes');
    expect(getLocalMarkdownImportTitle('notes.markdown')).toBe('notes.markdown');
  });

  it('detects null bytes in the first checked text window', () => {
    expect(hasBinaryNullByte('abc\u0000def')).toBe(true);
    expect(hasBinaryNullByte('abcdef')).toBe(false);
    expect(hasBinaryNullByte('abc\u0000def', 3)).toBe(false);
  });

  it('reads valid markdown import payloads', async () => {
    const file = createFile('guide.md');

    const payload = await readMarkdownImportFile(file, {
      readFileText: vi.fn(async () => '# Imported')
    });

    expect(payload).toEqual({
      text: '# Imported',
      title: 'guide'
    });
  });

  it('rejects oversized files before reading text', async () => {
    const file = createFile('large.md');
    const readFileText = vi.fn(async () => '# Large');
    Object.defineProperty(file, 'size', {
      configurable: true,
      value: MAX_MARKDOWN_IMPORT_BYTES + 1
    });

    await expect(readMarkdownImportFile(file, { readFileText }))
      .rejects.toThrow(MARKDOWN_IMPORT_ERRORS.tooLarge);
    expect(readFileText).not.toHaveBeenCalled();
  });

  it('alerts and skips tab creation for invalid imports', async () => {
    const alertRef = vi.fn();
    const createTab = vi.fn();

    const imported = await importMarkdownFileToTab(createFile('binary.md'), {
      readFileText: vi.fn(async () => 'abc\u0000def'),
      alertRef,
      createTab
    });

    expect(imported).toBe(false);
    expect(alertRef).toHaveBeenCalledWith(MARKDOWN_IMPORT_ERRORS.binary);
    expect(createTab).not.toHaveBeenCalled();
  });

  it('creates a new tab for valid imports', async () => {
    const alertRef = vi.fn();
    const createTab = vi.fn();

    const imported = await importMarkdownFileToTab(createFile('notes.md'), {
      readFileText: vi.fn(async () => '# Notes'),
      alertRef,
      createTab
    });

    expect(imported).toBe(true);
    expect(alertRef).not.toHaveBeenCalled();
    expect(createTab).toHaveBeenCalledWith('# Notes', 'notes');
  });

  it('attaches file input change handling and clears the input value', () => {
    const file = createFile('notes.md');
    const fileInput = document.createElement('input');
    const importMarkdownFile = vi.fn<(selectedFile: File) => void>();
    fileInput.value = 'selected';
    setInputFiles(fileInput, [file]);

    attachMarkdownFileInputController({
      fileInput,
      importMarkdownFile
    });

    fileInput.dispatchEvent(new Event('change'));

    expect(importMarkdownFile).toHaveBeenCalledWith(file);
    expect(fileInput.value).toBe('');
  });

  it('clears file input changes without a selected file and supports detach', () => {
    const file = createFile('notes.md');
    const fileInput = document.createElement('input');
    const importMarkdownFile = vi.fn<(selectedFile: File) => void>();
    setInputFiles(fileInput, []);

    const attachment = attachMarkdownFileInputController({
      fileInput,
      importMarkdownFile
    });

    fileInput.dispatchEvent(new Event('change'));
    expect(importMarkdownFile).not.toHaveBeenCalled();

    attachment.detach();
    setInputFiles(fileInput, [file]);
    fileInput.dispatchEvent(new Event('change'));

    expect(importMarkdownFile).not.toHaveBeenCalled();
  });
});
