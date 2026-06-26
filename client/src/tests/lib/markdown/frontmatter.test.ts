import { describe, expect, it, vi } from 'vitest';
import {
  escapeHtml,
  parseFrontmatter,
  renderFrontmatterTable,
  renderFrontmatterValue,
  type YamlAdapter
} from '../../../lib/markdown/frontmatter';

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

describe('markdown frontmatter helpers', () => {
  it('escapes HTML for render fragments', () => {
    expect(escapeHtml('<img alt="x" & bad>')).toBe('&lt;img alt=&quot;x&quot; &amp; bad&gt;');
  });

  it('parses YAML frontmatter and returns the remaining markdown body', () => {
    const result = parseFrontmatter('---\ntitle: Hello\nauthor: Codex\n---\n# Body', yaml);

    expect(result.frontmatter).toEqual({ title: 'Hello', author: 'Codex' });
    expect(result.body).toBe('# Body');
  });

  it('falls back to original markdown when YAML parsing fails', () => {
    const consoleRef = { warn: vi.fn() };
    const brokenYaml: YamlAdapter = {
      load() {
        throw new Error('bad yaml');
      },
      dump: yaml.dump
    };
    const markdown = '---\n: bad\n---\n# Body';

    expect(parseFrontmatter(markdown, brokenYaml, consoleRef)).toEqual({
      frontmatter: null,
      body: markdown
    });
    expect(consoleRef.warn).toHaveBeenCalledOnce();
  });

  it('renders primitive arrays as frontmatter tags and complex values as escaped blocks', () => {
    expect(renderFrontmatterValue(['one', '<two>'], yaml)).toBe(
      '<span class="fm-tag">one</span><span class="fm-tag">&lt;two&gt;</span>'
    );
    expect(renderFrontmatterValue([{ nested: '<value>' }], yaml)).toContain('&lt;value&gt;');
  });

  it('renders frontmatter tables with escaped keys and normalized dates', () => {
    const html = renderFrontmatterTable({
      'bad<key>': new Date(Date.UTC(2026, 5, 25)),
      tags: ['svelte', 'markdown']
    }, yaml);

    expect(html).toContain('<th>bad&lt;key&gt;</th><td>2026-06-25</td>');
    expect(html).toContain('<span class="fm-tag">svelte</span>');
  });
});
