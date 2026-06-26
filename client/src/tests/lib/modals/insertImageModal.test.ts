// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import type { OpenInsertImageModalOptions } from '../../../lib/modals/insertImageModal';
import {
  cleanupTrackedImageObjectUrls,
  openInsertImageModal
} from '../../../lib/modals/insertImageModal';

function setImageModalDom(): void {
  document.body.innerHTML = `
    <div id="image-modal" style="display:none">
      <input type="radio" name="image-source" id="image-source-upload" value="upload">
      <input type="radio" name="image-source" id="image-source-url" value="url" checked>
      <div id="image-upload-fields" style="display:none">
        <input type="file" id="image-modal-file" />
      </div>
      <div id="image-url-fields">
        <input type="url" id="image-modal-url" value="https://" />
      </div>
      <input type="text" id="image-modal-alt" />
      <button id="image-modal-insert">Insert</button>
      <button id="image-modal-cancel">Cancel</button>
    </div>
  `;
}

function immediateFrame(callback: FrameRequestCallback): number {
  callback(0);
  return 1;
}

function setFileInputFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files
  });
}

function openImageModal(overrides: Partial<OpenInsertImageModalOptions> = {}): boolean {
  return openInsertImageModal({
    alertMessage: vi.fn(),
    cloudStorageEnabled: false,
    createObjectUrl: vi.fn(() => 'blob:local-image'),
    documentRef: document,
    replaceRange: vi.fn(),
    requestFrame: immediateFrame,
    selectedText: '',
    selectionEnd: 0,
    selectionStart: 0,
    trackObjectUrl: vi.fn(),
    ...overrides
  });
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('insert image modal helper', () => {
  it('opens with URL mode defaults and focuses the URL input', () => {
    setImageModalDom();
    const modal = document.getElementById('image-modal') as HTMLDivElement;
    const uploadOption = document.getElementById('image-source-upload') as HTMLInputElement;
    const urlOption = document.getElementById('image-source-url') as HTMLInputElement;
    const uploadFields = document.getElementById('image-upload-fields') as HTMLDivElement;
    const urlFields = document.getElementById('image-url-fields') as HTMLDivElement;
    const urlInput = document.getElementById('image-modal-url') as HTMLInputElement;
    const altInput = document.getElementById('image-modal-alt') as HTMLInputElement;

    expect(openImageModal({
      selectedText: 'Selected alt'
    })).toBe(true);

    expect(modal.style.display).toBe('flex');
    expect(urlOption.checked).toBe(true);
    expect(uploadOption.checked).toBe(false);
    expect(uploadFields.style.display).toBe('none');
    expect(urlFields.style.display).toBe('flex');
    expect(urlInput.value).toBe('https://');
    expect(altInput.value).toBe('Selected alt');
    expect(document.activeElement).toBe(urlInput);
  });

  it('inserts URL markdown with alt text and sanitized title', () => {
    setImageModalDom();
    const modal = document.getElementById('image-modal') as HTMLDivElement;
    const urlInput = document.getElementById('image-modal-url') as HTMLInputElement;
    const altInput = document.getElementById('image-modal-alt') as HTMLInputElement;
    const confirmButton = document.getElementById('image-modal-insert') as HTMLButtonElement;
    const replaceRange = vi.fn();

    openImageModal({
      replaceRange,
      selectionEnd: 12,
      selectionStart: 4
    });

    urlInput.value = 'https://img.test/p.png';
    altInput.value = 'Caption "x"';
    confirmButton.click();

    const replacement = '![Caption "x"](https://img.test/p.png "Caption \\"x\\"")';
    expect(modal.style.display).toBe('none');
    expect(replaceRange).toHaveBeenCalledWith({
      start: 4,
      end: 12,
      replacement,
      selectionStart: 4 + replacement.length,
      selectionEnd: 4 + replacement.length
    });

    confirmButton.click();
    expect(replaceRange).toHaveBeenCalledOnce();
  });

  it('uses fallback URL and alt text when URL mode inputs are blank', () => {
    setImageModalDom();
    const urlInput = document.getElementById('image-modal-url') as HTMLInputElement;
    const altInput = document.getElementById('image-modal-alt') as HTMLInputElement;
    const replaceRange = vi.fn();

    openImageModal({
      replaceRange
    });

    urlInput.value = '   ';
    altInput.value = '   ';
    document.getElementById('image-modal-insert')?.click();

    expect(replaceRange).toHaveBeenCalledWith({
      start: 0,
      end: 0,
      replacement: '![alt text](https://)',
      selectionStart: 21,
      selectionEnd: 21
    });
  });

  it('switches between URL and upload fields with focus', () => {
    setImageModalDom();
    const uploadOption = document.getElementById('image-source-upload') as HTMLInputElement;
    const urlOption = document.getElementById('image-source-url') as HTMLInputElement;
    const uploadFields = document.getElementById('image-upload-fields') as HTMLDivElement;
    const urlFields = document.getElementById('image-url-fields') as HTMLDivElement;
    const fileInput = document.getElementById('image-modal-file') as HTMLInputElement;
    const urlInput = document.getElementById('image-modal-url') as HTMLInputElement;

    openImageModal();

    uploadOption.checked = true;
    urlOption.checked = false;
    uploadOption.dispatchEvent(new Event('change'));
    expect(uploadFields.style.display).toBe('flex');
    expect(urlFields.style.display).toBe('none');
    expect(document.activeElement).toBe(fileInput);

    uploadOption.checked = false;
    urlOption.checked = true;
    urlOption.dispatchEvent(new Event('change'));
    expect(uploadFields.style.display).toBe('none');
    expect(urlFields.style.display).toBe('flex');
    expect(document.activeElement).toBe(urlInput);
  });

  it('inserts a local object URL and tracks it for cleanup', () => {
    setImageModalDom();
    const uploadOption = document.getElementById('image-source-upload') as HTMLInputElement;
    const urlOption = document.getElementById('image-source-url') as HTMLInputElement;
    const fileInput = document.getElementById('image-modal-file') as HTMLInputElement;
    const file = new File(['image'], 'image.png', { type: 'image/png' });
    const createObjectUrl = vi.fn(() => 'blob:tracked-image');
    const trackObjectUrl = vi.fn();
    const replaceRange = vi.fn();

    openImageModal({
      createObjectUrl,
      replaceRange,
      selectedText: 'Local image',
      trackObjectUrl
    });
    uploadOption.checked = true;
    urlOption.checked = false;
    uploadOption.dispatchEvent(new Event('change'));
    setFileInputFiles(fileInput, [file]);
    fileInput.dispatchEvent(new Event('change'));

    const replacement = '![Local image](blob:tracked-image "Local image")';
    expect(createObjectUrl).toHaveBeenCalledWith(file);
    expect(trackObjectUrl).toHaveBeenCalledWith('blob:tracked-image');
    expect(replaceRange).toHaveBeenCalledWith({
      start: 0,
      end: 0,
      replacement,
      selectionStart: replacement.length,
      selectionEnd: replacement.length
    });
  });

  it('uploads cloud images once while busy and inserts the returned URL', async () => {
    setImageModalDom();
    const uploadOption = document.getElementById('image-source-upload') as HTMLInputElement;
    const urlOption = document.getElementById('image-source-url') as HTMLInputElement;
    const fileInput = document.getElementById('image-modal-file') as HTMLInputElement;
    const confirmButton = document.getElementById('image-modal-insert') as HTMLButtonElement;
    const file = new File(['image'], 'cloud.png', { type: 'image/png' });
    const replaceRange = vi.fn();
    let resolveUpload: (url: string) => void = () => {};
    const uploadFile = vi.fn(() => new Promise<string>((resolve) => {
      resolveUpload = resolve;
    }));

    openImageModal({
      cloudStorageEnabled: true,
      replaceRange,
      selectedText: 'Cloud image',
      uploadFile
    });
    uploadOption.checked = true;
    urlOption.checked = false;
    uploadOption.dispatchEvent(new Event('change'));
    setFileInputFiles(fileInput, [file]);

    confirmButton.click();
    confirmButton.click();
    expect(uploadFile).toHaveBeenCalledOnce();
    expect(confirmButton.disabled).toBe(true);

    resolveUpload('https://assets.test/cloud.png');
    await flushPromises();

    const replacement = '![Cloud image](https://assets.test/cloud.png "Cloud image")';
    expect(replaceRange).toHaveBeenCalledWith({
      start: 0,
      end: 0,
      replacement,
      selectionStart: replacement.length,
      selectionEnd: replacement.length
    });
    expect(confirmButton.disabled).toBe(false);
  });

  it('reports cloud upload failures', async () => {
    setImageModalDom();
    const uploadOption = document.getElementById('image-source-upload') as HTMLInputElement;
    const urlOption = document.getElementById('image-source-url') as HTMLInputElement;
    const fileInput = document.getElementById('image-modal-file') as HTMLInputElement;
    const file = new File(['image'], 'cloud.png', { type: 'image/png' });
    const alertMessage = vi.fn();
    const consoleRef = {
      error: vi.fn()
    };

    openImageModal({
      alertMessage,
      cloudStorageEnabled: true,
      consoleRef,
      uploadFile: vi.fn(() => Promise.reject(new Error('denied')))
    });
    uploadOption.checked = true;
    urlOption.checked = false;
    uploadOption.dispatchEvent(new Event('change'));
    setFileInputFiles(fileInput, [file]);
    document.getElementById('image-modal-insert')?.click();
    await flushPromises();

    expect(consoleRef.error).toHaveBeenCalled();
    expect(alertMessage).toHaveBeenCalledWith('Image upload failed: denied');
  });

  it('closes on Escape and Cancel without insertion', () => {
    setImageModalDom();
    const modal = document.getElementById('image-modal') as HTMLDivElement;
    const urlInput = document.getElementById('image-modal-url') as HTMLInputElement;
    const replaceRange = vi.fn();

    openImageModal({
      replaceRange
    });
    urlInput.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Escape'
    }));
    expect(modal.style.display).toBe('none');

    openImageModal({
      replaceRange
    });
    document.getElementById('image-modal-cancel')?.click();
    expect(modal.style.display).toBe('none');
    expect(replaceRange).not.toHaveBeenCalled();
  });

  it('returns false when required elements are missing', () => {
    document.body.innerHTML = '<div id="image-modal"></div>';

    expect(openImageModal()).toBe(false);
  });

  it('revokes only unreferenced tracked object URLs', () => {
    const objectUrls = new Set([
      'blob:keep',
      'blob:remove-a',
      'blob:remove-b'
    ]);
    const revokeObjectUrl = vi.fn();

    expect(cleanupTrackedImageObjectUrls({
      contents: [
        '![image](blob:keep)',
        'other tab content'
      ],
      objectUrls,
      revokeObjectUrl
    })).toEqual(['blob:remove-a', 'blob:remove-b']);

    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:remove-a');
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:remove-b');
    expect(objectUrls.has('blob:keep')).toBe(true);
    expect(objectUrls.has('blob:remove-a')).toBe(false);
    expect(objectUrls.has('blob:remove-b')).toBe(false);
  });

  it('does nothing when there are no tracked object URLs', () => {
    const revokeObjectUrl = vi.fn();

    expect(cleanupTrackedImageObjectUrls({
      contents: ['content'],
      objectUrls: new Set(),
      revokeObjectUrl
    })).toEqual([]);
    expect(revokeObjectUrl).not.toHaveBeenCalled();
  });
});
