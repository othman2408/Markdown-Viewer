import { describe, expect, it, vi } from 'vitest';
import {
  buildMainThreadPreviewHtml,
  sanitizePreviewHtmlWithPurifier
} from '../../../lib/preview/previewPreparation';
import type { YamlAdapter } from '../../../lib/markdown/frontmatter';

const yaml: YamlAdapter = {
  load(source: string) {
    return Object.fromEntries(
      source
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          const [key, ...rest] = line.split(':');
          return [key.trim(), rest.join(':').trim()];
        })
    );
  },
  dump(value: unknown) {
    return JSON.stringify(value, null, 2);
  }
};

describe('preview preparation helpers', () => {
  it('wraps DOMPurify sanitization and preserves the missing-runtime error', () => {
    expect(() => sanitizePreviewHtmlWithPurifier('<p>x</p>', undefined, {}))
      .toThrow('DOMPurify is not defined. Secure rendering aborted.');

    const purifier = {
      sanitize: vi.fn((html: string) => html.replace('<script>x</script>', ''))
    };

    expect(sanitizePreviewHtmlWithPurifier('<p>x</p><script>x</script>', purifier, { SAFE: true }))
      .toBe('<p>x</p>');
    expect(purifier.sanitize).toHaveBeenCalledWith('<p>x</p><script>x</script>', { SAFE: true });
  });

  it('builds sanitized preview HTML with frontmatter and reference metadata', () => {
    const marked = {
      parse: vi.fn((markdown: string) => `<article>${markdown}</article>`)
    };
    const sanitizeHtml = vi.fn((html: string) => html.replace('unsafe', 'safe'));

    const result = buildMainThreadPreviewHtml({
      markdown: '---\ntitle: unsafe\n---\n# Body\n\n[1]: https://example.com "Example"',
      marked,
      sanitizeHtml,
      yaml
    });

    expect(marked.parse).toHaveBeenCalledWith('# Body\n\n');
    expect(result.referenceData.cleanedMarkdown).toBe('# Body\n\n');
    expect(result.referenceData.definitions.get(1)).toEqual({
      url: 'https://example.com',
      title: 'Example'
    });
    expect(result.sanitizedHtml).toContain('<table class="frontmatter-table">');
    expect(result.sanitizedHtml).toContain('safe');
    expect(sanitizeHtml).toHaveBeenCalledOnce();
  });
});
