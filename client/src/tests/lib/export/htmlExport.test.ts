import { describe, expect, it } from 'vitest';
import { buildStandaloneHtmlExportDocument } from '../../../lib/export/htmlExport';

describe('standalone HTML export document', () => {
  it('builds a light themed standalone document around the provided body HTML', () => {
    const documentHtml = buildStandaloneHtmlExportDocument({
      bodyHtml: '<h1>Hello</h1><p>World</p>',
      darkTheme: false
    });

    expect(documentHtml).toContain('<!DOCTYPE html>');
    expect(documentHtml).toContain('<html lang="en">');
    expect(documentHtml).toContain('github-markdown.min.css');
    expect(documentHtml).not.toContain('github-markdown-dark.min.css');
    expect(documentHtml).toContain('<h1>Hello</h1><p>World</p>');
    expect(documentHtml).toContain('background-color: #ffffff');
    expect(documentHtml).toContain('color: #24292e');
    expect(documentHtml).toContain("window.mermaid.initialize({ startOnLoad: true, theme: 'default' });");
  });

  it('builds a dark themed standalone document with retained export runtimes', () => {
    const documentHtml = buildStandaloneHtmlExportDocument({
      bodyHtml: '<div class="abc-notation" data-original-code="X%3A1"></div>',
      darkTheme: true
    });

    expect(documentHtml).toContain('github-markdown-dark.min.css');
    expect(documentHtml).toContain('background-color: #0d1117');
    expect(documentHtml).toContain('color: #c9d1d9');
    expect(documentHtml).toContain("window.mermaid.initialize({ startOnLoad: true, theme: 'dark' });");
    expect(documentHtml).toContain('tex-mml-chtml.min.js');
    expect(documentHtml).toContain('mermaid@11.6.0/dist/mermaid.min.js');
    expect(documentHtml).toContain('abcjs/6.5.2/abcjs-basic-min.js');
    expect(documentHtml).toContain('ABCJS.renderAbc');
  });
});
