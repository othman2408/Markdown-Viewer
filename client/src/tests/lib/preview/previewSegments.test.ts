import { describe, expect, it, vi } from 'vitest';
import {
  createPreviewSegmentRenderer,
  getLoadedScriptUrl,
  getPreviewWorkerLibraryUrls,
  getPreviewWorkerUrl,
  isSegmentedPreviewSafe,
  shouldUsePreviewWorker
} from '../../../lib/preview/previewSegments';

function fakeDocument(scriptSrcs: string[]) {
  return {
    getElementsByTagName(tag: string) {
      if (tag !== 'script') return [] as unknown as HTMLCollectionOf<HTMLScriptElement>;
      return scriptSrcs.map((src) => ({
        getAttribute(name: string) {
          return name === 'src' ? src : null;
        }
      })) as unknown as HTMLCollectionOf<HTMLScriptElement>;
    }
  };
}

describe('preview segments helpers', () => {
  it('resolves loaded script URLs against the current page URL', () => {
    const doc = fakeDocument(['/vendor/marked/marked.min.js']);

    expect(getLoadedScriptUrl('marked', 'fallback.js', doc, 'https://example.test/app/')).toBe(
      'https://example.test/vendor/marked/marked.min.js'
    );
  });

  it('falls back when a script is not present', () => {
    expect(getLoadedScriptUrl('missing', 'https://cdn.example/missing.js', fakeDocument([]))).toBe(
      'https://cdn.example/missing.js'
    );
  });

  it('builds preview worker URLs and library URL maps', () => {
    const doc = fakeDocument([
      '/vendor/marked/marked.min.js',
      '/vendor/highlight.js/highlight.min.js',
      '/vendor/highlight.js/languages/powershell.min.js'
    ]);

    expect(getPreviewWorkerUrl('https://example.test')).toBe('https://example.test/preview-worker.js');
    expect(getPreviewWorkerLibraryUrls(doc, 'https://example.test/app/')).toEqual({
      marked: 'https://example.test/vendor/marked/marked.min.js',
      highlight: 'https://example.test/vendor/highlight.js/highlight.min.js',
      powershell: 'https://example.test/vendor/highlight.js/languages/powershell.min.js'
    });
  });

  it('rejects markdown that is unsafe for segmented worker rendering', () => {
    const largePlain = `${'# Title\n\ntext\n'.repeat(100)}`;

    expect(isSegmentedPreviewSafe('', 10)).toBe(false);
    expect(isSegmentedPreviewSafe('short', 10)).toBe(false);
    expect(isSegmentedPreviewSafe(`---\ntitle: Test\n---\n${largePlain}`, 10)).toBe(false);
    expect(isSegmentedPreviewSafe(`[ref]: https://example.com\n${largePlain}`, 10)).toBe(false);
    expect(isSegmentedPreviewSafe(`${largePlain}\n[^1]: footnote`, 10)).toBe(false);
    expect(isSegmentedPreviewSafe(`${largePlain}\n: definition`, 10)).toBe(false);
    expect(isSegmentedPreviewSafe(`<div>html</div>\n${largePlain}`, 10)).toBe(false);
    expect(isSegmentedPreviewSafe(largePlain, 10)).toBe(true);
  });

  it('honors worker feature gates before allowing segmented rendering', () => {
    const markdown = '# Title\n\n'.repeat(100);

    expect(shouldUsePreviewWorker(markdown, {}, {
      enabled: true,
      workerUnavailable: false,
      hasWorkerRuntime: true,
      threshold: 10
    })).toBe(true);
    expect(shouldUsePreviewWorker(markdown, { disableWorker: true }, {
      enabled: true,
      workerUnavailable: false,
      hasWorkerRuntime: true,
      threshold: 10
    })).toBe(false);
    expect(shouldUsePreviewWorker(markdown, {}, {
      enabled: false,
      workerUnavailable: false,
      hasWorkerRuntime: true,
      threshold: 10
    })).toBe(false);
  });

  it('sanitizes, wraps, caches, clears, and trims segmented preview blocks', () => {
    const sanitizeHtml = vi.fn((html: string) => html.replace(/<script>.*?<\/script>/g, ''));
    const renderer = createPreviewSegmentRenderer({
      sanitizeHtml,
      escapeAttribute(value) {
        return value.replace(/"/g, '&quot;').replace(/</g, '&lt;');
      },
      reuseLimit: 1
    });

    const first = renderer.buildHtml([
      { id: 'a"<', hash: 'hash', sourceLength: 4, htmlLength: 28, html: '<p>A</p><script>x</script>' },
      { id: 'b', hash: 'hash', sourceLength: 4, htmlLength: 28, html: '<p>A</p><script>x</script>' }
    ], 'tab-a');

    expect(first).toContain('data-preview-block-id="a&quot;&lt;"');
    expect(first).toContain('<p>A</p>');
    expect(first).not.toContain('<script>');
    expect(sanitizeHtml).toHaveBeenCalledOnce();

    renderer.buildHtml([
      { id: 'c', hash: 'other', sourceLength: 5, htmlLength: 8, html: '<p>C</p>' }
    ], 'tab-a');
    expect(renderer.getCacheSize()).toBe(1);

    renderer.clear();
    expect(renderer.getCacheSize()).toBe(0);
    renderer.buildHtml([
      { hash: 'hash', sourceLength: 4, htmlLength: 28, html: '<p>A</p><script>x</script>' }
    ], 'tab-a');
    expect(sanitizeHtml).toHaveBeenCalledTimes(3);
  });
});
