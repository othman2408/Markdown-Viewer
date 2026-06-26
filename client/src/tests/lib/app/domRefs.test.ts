// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { collectMarkdownViewerDomRefs } from '../../../lib/app/domRefs';

describe('markdown viewer DOM refs', () => {
  it('collects the app mount points by stable ids and selectors', () => {
    document.body.innerHTML = `
      <textarea id="markdown-editor"></textarea>
      <div id="markdown-preview"></div>
      <div id="markdown-format-toolbar"></div>
      <button id="direction-toggle"></button>
      <input id="file-input" type="file" />
      <button id="export-md"></button>
      <button id="export-html"></button>
      <button id="export-pdf"></button>
      <button id="export-png"></button>
      <button id="copy-markdown-button"></button>
      <div id="drag-overlay"></div>
      <section class="editor-pane"></section>
      <section class="preview-pane"></section>
      <main class="content-container"></main>
      <button id="mobile-export-pdf"></button>
      <button id="mobile-export-png"></button>
      <div id="github-import-modal"></div>
      <h2 id="github-import-title"></h2>
      <input id="github-import-url" />
      <select id="github-import-file-select"></select>
      <div id="github-import-selection-toolbar"></div>
      <span id="github-import-selected-count"></span>
      <button id="github-import-select-all"></button>
      <div id="github-import-tree"></div>
      <div id="github-import-error"></div>
      <button id="github-import-cancel"></button>
      <button id="github-import-submit"></button>
      <div id="editor-highlight-layer"></div>
      <div id="line-numbers"></div>
      <div id="clear-formatting-modal"></div>
      <button id="clear-formatting-confirm"></button>
      <button id="clear-formatting-cancel"></button>
      <button id="clear-formatting-close"></button>
      <div id="find-replace-modal"></div>
      <div id="find-replace-drag-handle"></div>
      <button id="find-replace-dock"></button>
      <select id="find-replace-scope"></select>
      <input id="find-replace-diff-toggle" />
      <select id="find-replace-history"></select>
      <input id="find-replace-input" />
      <input id="find-replace-with" />
      <button id="find-replace-close"></button>
      <button id="find-replace-close-icon"></button>
      <div id="help-modal"></div>
      <button id="help-modal-close"></button>
      <button id="help-modal-close-icon"></button>
      <div id="about-modal"></div>
      <button id="about-modal-close"></button>
      <button id="about-modal-close-icon"></button>
      <span id="about-version"></span>
    `;

    const refs = collectMarkdownViewerDomRefs();

    expect(refs.markdownEditor).toBe(document.getElementById('markdown-editor'));
    expect(refs.editorPane).toBe(refs.markdownEditor);
    expect(refs.editorPaneContainer).toBe(document.querySelector('.editor-pane'));
    expect(refs.previewPane).toBe(document.querySelector('.preview-pane'));
    expect(refs.contentContainer).toBe(document.querySelector('.content-container'));
    expect(refs.findReplaceDock).toBe(document.getElementById('find-replace-dock'));
    expect(refs.findReplaceScope).toBe(document.getElementById('find-replace-scope'));
    expect(refs.githubImportUrlInput).toBe(document.getElementById('github-import-url'));
    expect(refs.aboutVersion).toBe(document.getElementById('about-version'));
  });

  it('keeps missing optional elements nullable', () => {
    document.body.innerHTML = '<textarea id="markdown-editor"></textarea>';

    const refs = collectMarkdownViewerDomRefs();

    expect(refs.markdownEditor).toBeInstanceOf(HTMLTextAreaElement);
    expect(refs.markdownPreview).toBeNull();
    expect(refs.previewPane).toBeNull();
    expect(refs.aboutVersion).toBeNull();
  });
});
