// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  applyReferencePreviewLinks,
  enhanceGitHubAlerts
} from '../../../lib/markdown/previewPostProcessing';
import type { ReferenceDefinition } from '../../../lib/markdown/editing';

function createReferenceDefinitions(entries: Array<[number, ReferenceDefinition]>): Map<number, ReferenceDefinition> {
  return new Map(entries);
}

describe('preview post-processing helpers', () => {
  it('enhances GitHub alert blockquotes and preserves remaining paragraph HTML', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <blockquote><p>[!WARNING] <strong>Careful</strong></p><p>Details</p></blockquote>
      <blockquote><p>Regular quote</p></blockquote>
    `;

    enhanceGitHubAlerts(container);

    const alert = container.querySelector('blockquote');
    expect(alert?.classList.contains('markdown-alert')).toBe(true);
    expect(alert?.classList.contains('markdown-alert-warning')).toBe(true);
    expect(alert?.querySelector('.markdown-alert-title')?.textContent).toBe('Warning');
    expect(alert?.querySelector('.markdown-alert-icon svg')).not.toBeNull();
    expect(alert?.querySelectorAll('p')[1]?.innerHTML).toBe('<strong>Careful</strong>');
    expect(container.querySelectorAll('.markdown-alert')).toHaveLength(1);
  });

  it('removes empty marker paragraphs when GitHub alert content starts on the next paragraph', () => {
    const container = document.createElement('div');
    container.innerHTML = '<blockquote><p>[!NOTE]</p><p>Body</p></blockquote>';

    enhanceGitHubAlerts(container);

    const paragraphs = Array.from(container.querySelectorAll('blockquote > p'));
    expect(paragraphs.map((paragraph) => paragraph.textContent)).toEqual(['Note', 'Body']);
  });

  it('updates existing reference anchors from definitions', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p><a href="/old" title="Old">1</a> <a href="/old">[2]</a></p>';

    applyReferencePreviewLinks(container, createReferenceDefinitions([
      [1, { url: 'https://example.test/one', title: 'One' }],
      [2, { url: 'javascript:alert(1)', title: 'Unsafe' }]
    ]));

    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('a'));
    expect(links[0].href).toBe('https://example.test/one');
    expect(links[0].title).toBe('One');
    expect(links[0].textContent).toBe('[1]');
    expect(links[0].classList.contains('reference-link')).toBe(true);
    expect(links[1].hasAttribute('href')).toBe(false);
    expect(links[1].textContent).toBe('[2]');
    expect(links[1].classList.contains('reference-link')).toBe(true);
  });

  it('expands plain reference text while skipping protected containers', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>See [1] and [2].</p><code>[1]</code><a>Link [1]</a><p>[1]: definition</p>';

    applyReferencePreviewLinks(container, createReferenceDefinitions([
      [1, { url: 'https://example.test/ref', title: '' }]
    ]));

    const paragraphLinks = container.querySelectorAll<HTMLAnchorElement>('p .reference-link');
    expect(paragraphLinks).toHaveLength(1);
    expect(paragraphLinks[0].href).toBe('https://example.test/ref');
    expect(container.querySelector('p')?.textContent).toBe('See [1] and [2].');
    expect(container.querySelector('code')?.textContent).toBe('[1]');
    expect(container.querySelector('a:not(.reference-link)')?.textContent).toBe('Link [1]');
    expect(container.querySelectorAll('p')[1]?.textContent).toBe('[1]: definition');
  });

  it('does nothing when reference definitions are empty or missing', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>See [1].</p>';

    applyReferencePreviewLinks(container, new Map());
    expect(container.innerHTML).toBe('<p>See [1].</p>');

    applyReferencePreviewLinks(null, createReferenceDefinitions([
      [1, { url: 'https://example.test/ref', title: '' }]
    ]));
  });
});
