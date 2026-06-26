import { describe, expect, it, vi } from 'vitest';
import { createMarkdownRendererRuntime } from '../../../lib/markdown/rendererRuntime';

function createMarkedStub() {
  class Renderer {}

  return {
    Renderer,
    parseInline: vi.fn((text: string) => `<span>${text}</span>`),
    setOptions: vi.fn(),
    use: vi.fn()
  };
}

describe('markdown renderer runtime', () => {
  it('registers marked extensions, renderer options, and diagram code wrappers', () => {
    const markedRef = createMarkedStub();
    const highlightRef = {
      getLanguage: vi.fn((language: string) => language === 'javascript'),
      highlight: vi.fn((code: string) => ({ value: `highlighted:${code}` }))
    };

    const runtime = createMarkdownRendererRuntime({
      getDomPurify: () => ({ sanitize: (html) => html }),
      highlightRef,
      markedRef
    });

    expect(markedRef.use).toHaveBeenCalledOnce();
    expect(markedRef.setOptions).toHaveBeenCalledOnce();
    const renderer = markedRef.setOptions.mock.calls[0][0].renderer as Record<string, CallableFunction>;

    expect(renderer.code('graph TD', 'mermaid')).toContain('mermaid-container is-loading');
    expect(renderer.code('x < y', 'unknown')).toBe('<pre><code class="hljs plaintext">highlighted:x < y</code></pre>');
    expect(renderer.heading('Hello', 2, 'Hello World!')).toBe('<h2 id="hello-world">Hello</h2>');
    expect(runtime.escapeHtmlAttribute('"quote"')).toBe('&quot;quote&quot;');
  });

  it('preprocesses footnotes and sanitizes definition content', () => {
    const markedRef = createMarkedStub();
    const sanitize = vi.fn((html: string) => html.replace('<script>', ''));

    createMarkdownRendererRuntime({
      getDomPurify: () => ({ sanitize }),
      highlightRef: {
        getLanguage: vi.fn(),
        highlight: vi.fn((code: string) => ({ value: code }))
      },
      markedRef
    });

    const preprocess = (markedRef.use.mock.calls[0][0].hooks as { preprocess(markdown: string): string }).preprocess;
    const html = preprocess('See [^a]\n\n[^a]: Note <script>');

    expect(html).toContain('class="footnote-ref"');
    expect(html).toContain('class="footnotes"');
    expect(sanitize).toHaveBeenCalled();
  });
});
