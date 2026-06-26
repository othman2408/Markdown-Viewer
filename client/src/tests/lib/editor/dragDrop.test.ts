// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  attachFileDragDropController,
  createFileDragDropController,
  dataTransferHasFiles,
  type FileDragEventLike
} from '../../../lib/editor/dragDrop';

function createEvent(file?: File, types: string[] = ['Files']): FileDragEventLike {
  return {
    dataTransfer: {
      files: file ? [file] : [],
      types
    },
    preventDefault: vi.fn()
  };
}

function createDocumentDragEvent(type: string, file?: File, types: string[] = ['Files']): DragEvent {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true
  }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      files: file ? [file] : [],
      types
    }
  });
  return event;
}

describe('file drag/drop controller', () => {
  it('detects file drags across array-like DataTransfer types', () => {
    expect(dataTransferHasFiles({ types: ['Files'] })).toBe(true);
    expect(dataTransferHasFiles({ types: ['text/plain'] })).toBe(false);
    expect(dataTransferHasFiles({ types: { 0: 'Files', length: 1 } })).toBe(true);
    expect(dataTransferHasFiles(null)).toBe(false);
  });

  it('tracks nested drag depth and toggles overlay state', () => {
    const overlay = document.createElement('div');
    const controller = createFileDragDropController({
      overlay,
      isMarkdownUploadFile: () => true,
      importMarkdownFile: vi.fn()
    });
    const enterEvent = createEvent();
    const leaveEvent = createEvent();

    controller.handleDragEnter(enterEvent);
    controller.handleDragEnter(createEvent());

    expect(enterEvent.preventDefault).toHaveBeenCalledOnce();
    expect(controller.getDragDepth()).toBe(2);
    expect(overlay.classList.contains('active')).toBe(true);
    expect(overlay.getAttribute('aria-hidden')).toBe('false');

    controller.handleDragLeave(leaveEvent);
    expect(controller.getDragDepth()).toBe(1);
    expect(overlay.classList.contains('active')).toBe(true);

    controller.handleDragLeave(createEvent());
    expect(controller.getDragDepth()).toBe(0);
    expect(overlay.classList.contains('active')).toBe(false);
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });

  it('imports markdown files on drop and resets overlay state', () => {
    const overlay = document.createElement('div');
    const file = new File(['# Note'], 'note.md', { type: 'text/markdown' });
    const importMarkdownFile = vi.fn();
    const controller = createFileDragDropController({
      overlay,
      isMarkdownUploadFile: () => true,
      importMarkdownFile
    });

    controller.handleDragEnter(createEvent(file));
    controller.handleDrop(createEvent(file));

    expect(controller.getDragDepth()).toBe(0);
    expect(overlay.classList.contains('active')).toBe(false);
    expect(importMarkdownFile).toHaveBeenCalledWith(file);
  });

  it('alerts for non-markdown drops', () => {
    const file = new File(['plain'], 'note.txt', { type: 'text/plain' });
    const alertRef = vi.fn();
    const importMarkdownFile = vi.fn();
    const controller = createFileDragDropController({
      overlay: null,
      isMarkdownUploadFile: () => false,
      importMarkdownFile,
      alertRef
    });

    controller.handleDrop(createEvent(file));

    expect(importMarkdownFile).not.toHaveBeenCalled();
    expect(alertRef).toHaveBeenCalledWith('Please upload a Markdown file (.md or .markdown)');
  });

  it('attaches and detaches document drag/drop listeners', () => {
    const overlay = document.createElement('div');
    const file = new File(['# Note'], 'note.md', { type: 'text/markdown' });
    const importMarkdownFile = vi.fn();
    const controller = createFileDragDropController({
      overlay,
      isMarkdownUploadFile: () => true,
      importMarkdownFile
    });
    const attachment = attachFileDragDropController(document, controller);

    document.dispatchEvent(createDocumentDragEvent('dragenter', file));
    expect(overlay.classList.contains('active')).toBe(true);

    document.dispatchEvent(createDocumentDragEvent('drop', file));
    expect(importMarkdownFile).toHaveBeenCalledWith(file);
    expect(overlay.classList.contains('active')).toBe(false);

    attachment.detach();
    document.dispatchEvent(createDocumentDragEvent('dragenter', file));
    expect(overlay.classList.contains('active')).toBe(false);
  });
});
