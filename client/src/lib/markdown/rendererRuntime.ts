import { PREVIEW_SANITIZE_OPTIONS } from '../config/appConfig';
import { sanitizePreviewHtmlWithPurifier } from '../preview/previewPreparation';

type MarkdownRendererRuntimeOptions = {
  getDomPurify(): { sanitize(html: string, options?: unknown): string } | undefined;
  highlightRef: {
    getLanguage(language: string): unknown;
    highlight(code: string, options: { language: string }): { value: string };
  };
  markedRef: {
    Renderer: new () => any;
    parseInline(text: string): string;
    setOptions(options: Record<string, unknown>): void;
    use(options: Record<string, unknown>): void;
  };
};

export type MarkdownRendererRuntime = {
  escapeHtmlAttribute(value: unknown): string;
  sanitizePreviewHtml(html: string): string;
};

const BLOCK_MATH_MARKER_PATTERN = /^\$\$/m;
const BLOCK_MATH_PATTERN = /^\$\$[ \t]*\n?([\s\S]*?)\n?\$\$[ \t]*(?:\n|$)/;
const DEFINITION_LIST_ITEM_PATTERN = /^:[ \t]+(.*)$/;
const SUPERSCRIPT_PATTERN = /^\^(?!\s)([^^\n]*?\S)\^(?!\^)/;
const SUBSCRIPT_PATTERN = /^~(?!~)(?!\s)([^~\n]*?\S)~(?!~)/;
const HIGHLIGHT_PATTERN = /^==(?=\S)([\s\S]*?\S)==/;
const MARKDOWN_LIST_MARKER_PATTERN = /^(\s*)(?:[-*+]\s+|\d+\.\s+|>\s+)/;
const EMPTY_LINE_PATTERN = /^\s*$/;

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function createMarkdownRendererRuntime(
  options: MarkdownRendererRuntimeOptions
): MarkdownRendererRuntime {
  const marked = options.markedRef;
  const hljs = options.highlightRef;
  const renderer = new marked.Renderer();
  const footnoteDefinitions = new Map<string, string>();
  const footnoteOrder: string[] = [];
  const footnoteRefCounts = new Map<string, number>();
  const footnoteFirstRefId = new Map<string, string>();
  let anonymousFootnoteCounter = 0;
  let suppressFootnotePreprocess = false;

  function resetExtendedMarkdownState(): void {
    footnoteDefinitions.clear();
    footnoteOrder.length = 0;
    footnoteRefCounts.clear();
    footnoteFirstRefId.clear();
    anonymousFootnoteCounter = 0;
  }

  function normalizeFootnoteId(id: unknown): string {
    const normalized = String(id || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (normalized) return normalized;

    anonymousFootnoteCounter += 1;
    return `footnote-${anonymousFootnoteCounter}`;
  }

  function escapeHtmlAttribute(value: unknown): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function sanitizePreviewHtml(html: string): string {
    return sanitizePreviewHtmlWithPurifier(
      html,
      options.getDomPurify(),
      PREVIEW_SANITIZE_OPTIONS
    );
  }

  function parseInlineWithoutFootnotes(text: string): string {
    suppressFootnotePreprocess = true;
    try {
      return marked.parseInline(text);
    } finally {
      suppressFootnotePreprocess = false;
    }
  }

  function renderDefinitionContent(content: string, renderOptions: { appendHtml?: string } = {}): string {
    const { appendHtml = '' } = renderOptions;
    const paragraphs = String(content || '')
      .split(/\n(?:[ \t]*\n)+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    if (appendHtml) {
      if (paragraphs.length === 0) {
        paragraphs.push(appendHtml);
      } else {
        paragraphs[paragraphs.length - 1] = `${paragraphs[paragraphs.length - 1]} ${appendHtml}`;
      }
    }

    return paragraphs
      .map((paragraph) => {
        const domPurify = options.getDomPurify();
        if (!domPurify) {
          throw new ReferenceError('DOMPurify is not defined. Secure rendering aborted.');
        }

        const renderedParagraph = parseInlineWithoutFootnotes(paragraph);
        const safeParagraph = domPurify.sanitize(renderedParagraph);
        return `<p>${safeParagraph}</p>`;
      })
      .join('');
  }

  function extractFootnoteDefinitions(markdown: string): string {
    const lines = markdown.split('\n');
    const preservedLines: string[] = [];
    let index = 0;

    while (index < lines.length) {
      const match = /^([ \t]{0,3})\[\^([^\]\n]+)\]:[ \t]*(.*)$/.exec(lines[index]);
      if (!match) {
        preservedLines.push(lines[index]);
        index += 1;
        continue;
      }

      const baseIndent = match[1] || '';
      const id = match[2].trim();
      const definitionLines = [match[3] || ''];
      index += 1;

      while (index < lines.length) {
        const line = lines[index];
        if (!line.startsWith(baseIndent)) break;

        const lineAfterBase = line.slice(baseIndent.length);
        const indentedMatch = /^(?: {2,}|\t)(.*)$/.exec(lineAfterBase);
        if (indentedMatch) {
          definitionLines.push(indentedMatch[1]);
          index += 1;
          continue;
        }

        if (lineAfterBase.trim() === '') {
          const nextLine = lines[index + 1] || '';
          const nextAfterBase = nextLine.startsWith(baseIndent)
            ? nextLine.slice(baseIndent.length)
            : '';
          if (/^(?: {2,}|\t)/.test(nextAfterBase)) {
            definitionLines.push('');
            index += 1;
            continue;
          }
        }

        break;
      }

      footnoteDefinitions.set(id, definitionLines.join('\n').trim());
    }

    return preservedLines.join('\n');
  }

  function applyFootnotes(markdown: string): string {
    const markdownWithReferences = markdown.replace(/\[\^([^\]\n]+)\]/g, (match, idText) => {
      const id = idText.trim();
      if (!id) return match;

      if (!footnoteOrder.includes(id)) {
        footnoteOrder.push(id);
      }

      const refCount = (footnoteRefCounts.get(id) || 0) + 1;
      footnoteRefCounts.set(id, refCount);
      const normalizedId = normalizeFootnoteId(id);
      const refId = `fnref-${normalizedId}${refCount > 1 ? `-${refCount}` : ''}`;
      if (!footnoteFirstRefId.has(id)) {
        footnoteFirstRefId.set(id, refId);
      }

      const noteNumber = footnoteOrder.indexOf(id) + 1;
      const safeRefId = escapeHtmlAttribute(refId);
      const safeNormalizedId = escapeHtmlAttribute(normalizedId);
      return `<sup id="${safeRefId}" class="footnote-ref"><a href="#fn-${safeNormalizedId}" aria-label="Footnote ${noteNumber}">[${noteNumber}]</a></sup>`;
    });

    const footnotesHtml = footnoteOrder
      .filter((id) => footnoteDefinitions.has(id))
      .map((id) => {
        const normalizedId = normalizeFootnoteId(id);
        const backRefId = footnoteFirstRefId.get(id) || `fnref-${normalizedId}`;
        const safeNormalizedId = escapeHtmlAttribute(normalizedId);
        const safeBackRefId = escapeHtmlAttribute(backRefId);
        const backRefHtml = `<a href="#${safeBackRefId}" class="footnote-backref" aria-label="Back to content">&#8592;</a>`;
        const noteHtml = renderDefinitionContent(
          footnoteDefinitions.get(id) || '',
          { appendHtml: backRefHtml }
        );
        return `<li id="fn-${safeNormalizedId}">${noteHtml}</li>`;
      })
      .join('');

    if (!footnotesHtml) {
      return markdownWithReferences;
    }

    return `${markdownWithReferences}\n\n<section class="footnotes"><hr><ol>${footnotesHtml}</ol></section>`;
  }

  const blockMathExtension = {
    name: 'blockMath',
    level: 'block',
    start(src: string) {
      const match = src.match(BLOCK_MATH_MARKER_PATTERN);
      return match ? match.index : undefined;
    },
    tokenizer(src: string) {
      const match = BLOCK_MATH_PATTERN.exec(src);
      if (!match) return undefined;

      return {
        type: 'blockMath',
        raw: match[0],
        text: match[1]
      };
    },
    renderer(token: { text: string }) {
      return `<div class="math-block">$$\n${token.text}\n$$</div>\n`;
    }
  };

  const definitionListExtension = {
    name: 'definitionList',
    level: 'block',
    start(src: string) {
      const match = src.match(/\n:[ \t]+/);
      return match ? (match.index ?? 0) + 1 : undefined;
    },
    tokenizer(src: string) {
      const lines = src.split('\n');
      if (lines.length < 2) return undefined;

      const term = lines[0];
      if (EMPTY_LINE_PATTERN.test(term) || MARKDOWN_LIST_MARKER_PATTERN.test(term)) {
        return undefined;
      }
      if (!DEFINITION_LIST_ITEM_PATTERN.test(lines[1])) {
        return undefined;
      }

      const definitions: string[] = [];
      const rawLines = [term];
      let index = 1;
      while (index < lines.length) {
        const itemMatch = DEFINITION_LIST_ITEM_PATTERN.exec(lines[index]);
        if (!itemMatch) break;

        rawLines.push(lines[index]);
        const definitionLines = [itemMatch[1]];
        index += 1;

        while (index < lines.length) {
          const line = lines[index];
          if (DEFINITION_LIST_ITEM_PATTERN.test(line)) break;

          if (EMPTY_LINE_PATTERN.test(line)) {
            const nextLine = lines[index + 1] || '';
            if (/^(?: {2,}|\t)/.test(nextLine)) {
              rawLines.push(line);
              definitionLines.push('');
              index += 1;
              continue;
            }
            break;
          }

          const continuationMatch = /^(?: {2,}|\t)(.*)$/.exec(line);
          if (!continuationMatch) break;

          rawLines.push(line);
          definitionLines.push(continuationMatch[1]);
          index += 1;
        }

        definitions.push(definitionLines.join('\n').trim());
      }

      if (definitions.length === 0) return undefined;

      let raw = rawLines.join('\n');
      if (src.startsWith(raw + '\n')) {
        raw += '\n';
      }

      return {
        type: 'definitionList',
        raw,
        term: term.trim(),
        definitions
      };
    },
    renderer(token: { term: string; definitions: string[] }) {
      const termHtml = parseInlineWithoutFootnotes(token.term);
      const definitionHtml = token.definitions
        .map((definition) => `<dd>${renderDefinitionContent(definition)}</dd>`)
        .join('');
      return `<dl><dt>${termHtml}</dt>${definitionHtml}</dl>\n`;
    }
  };

  const superscriptExtension = {
    name: 'superscript',
    level: 'inline',
    start(src: string) {
      const index = src.indexOf('^');
      return index >= 0 ? index : undefined;
    },
    tokenizer(src: string) {
      const match = SUPERSCRIPT_PATTERN.exec(src);
      if (!match) return undefined;

      return {
        type: 'superscript',
        raw: match[0],
        text: match[1]
      };
    },
    renderer(token: { text: string }) {
      return `<sup>${marked.parseInline(token.text)}</sup>`;
    }
  };

  const subscriptExtension = {
    name: 'subscript',
    level: 'inline',
    start(src: string) {
      const index = src.indexOf('~');
      return index >= 0 ? index : undefined;
    },
    tokenizer(src: string) {
      const match = SUBSCRIPT_PATTERN.exec(src);
      if (!match) return undefined;

      return {
        type: 'subscript',
        raw: match[0],
        text: match[1]
      };
    },
    renderer(token: { text: string }) {
      return `<sub>${marked.parseInline(token.text)}</sub>`;
    }
  };

  const highlightExtension = {
    name: 'highlight',
    level: 'inline',
    start(src: string) {
      const index = src.indexOf('==');
      return index >= 0 ? index : undefined;
    },
    tokenizer(src: string) {
      const match = HIGHLIGHT_PATTERN.exec(src);
      if (!match) return undefined;

      return {
        type: 'highlight',
        raw: match[0],
        text: match[1]
      };
    },
    renderer(token: { text: string }) {
      return `<mark>${marked.parseInline(token.text)}</mark>`;
    }
  };

  renderer.code = function renderCodeBlock(code: string, language: string) {
    if (language === 'mermaid') {
      const uniqueId = 'mermaid-diagram-' + Math.random().toString(36).substr(2, 9);
      return `<div class="mermaid-container is-loading"><div class="mermaid" id="${uniqueId}" data-original-code="${encodeURIComponent(code)}">${escapeHtml(code)}</div></div>`;
    }
    if (language === 'abc') {
      const uniqueId = 'abc-notation-' + Math.random().toString(36).substr(2, 9);
      return `<div class="abc-container is-loading"><div class="abc-notation" id="${uniqueId}" data-original-code="${encodeURIComponent(code)}">${escapeHtml(code)}</div></div>`;
    }
    if (language === 'geojson') {
      const uniqueId = 'geojson-map-' + Math.random().toString(36).substr(2, 9);
      return `<div class="geojson-container is-loading"><div class="geojson-map" id="${uniqueId}" data-original-code="${encodeURIComponent(code)}">${escapeHtml(code)}</div></div>`;
    }
    if (language === 'topojson') {
      const uniqueId = 'topojson-map-' + Math.random().toString(36).substr(2, 9);
      return `<div class="topojson-container is-loading"><div class="topojson-map" id="${uniqueId}" data-original-code="${encodeURIComponent(code)}">${escapeHtml(code)}</div></div>`;
    }
    if (language === 'stl') {
      const uniqueId = 'stl-viewer-' + Math.random().toString(36).substr(2, 9);
      return `<div class="stl-container is-loading"><div class="stl-viewer" id="${uniqueId}" data-original-code="${encodeURIComponent(code)}">${escapeHtml(code)}</div></div>`;
    }
    if (language === 'plantuml') {
      const uniqueId = 'plantuml-diagram-' + Math.random().toString(36).substr(2, 9);
      return `<div class="plantuml-container is-loading"><div class="plantuml-diagram" id="${uniqueId}" data-original-code="${encodeURIComponent(code)}">${escapeHtml(code)}</div></div>`;
    }
    if (language === 'd2') {
      const uniqueId = 'd2-diagram-' + Math.random().toString(36).substr(2, 9);
      return `<div class="d2-container is-loading"><div class="d2-diagram" id="${uniqueId}" data-original-code="${encodeURIComponent(code)}">${escapeHtml(code)}</div></div>`;
    }
    if (language === 'graphviz' || language === 'dot') {
      const uniqueId = 'graphviz-diagram-' + Math.random().toString(36).substr(2, 9);
      return `<div class="graphviz-container is-loading"><div class="graphviz-diagram" id="${uniqueId}" data-original-code="${encodeURIComponent(code)}">${escapeHtml(code)}</div></div>`;
    }
    if (language === 'math') {
      return `<div class="math-block">$$\n${code}\n$$</div>\n`;
    }

    const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
    const highlightedCode = hljs.highlight(code, {
      language: validLanguage
    }).value;
    return `<pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>`;
  };

  renderer.heading = function renderHeading(text: string, level: number, raw: string) {
    let id = raw
      .toLowerCase()
      .trim()
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/-+/g, '-');
    if (!id) {
      id = 'heading-' + Math.random().toString(36).substr(2, 9);
    }
    return `<h${level} id="${id}">${text}</h${level}>`;
  };

  marked.use({
    extensions: [
      blockMathExtension,
      definitionListExtension,
      superscriptExtension,
      subscriptExtension,
      highlightExtension
    ],
    hooks: {
      preprocess(markdown: string) {
        if (suppressFootnotePreprocess) {
          return markdown;
        }
        resetExtendedMarkdownState();
        const protectedMarkdown = markdown.replace(/\\\$/g, '&#36;');
        return applyFootnotes(extractFootnoteDefinitions(protectedMarkdown));
      }
    }
  });
  marked.setOptions({
    gfm: true,
    breaks: true,
    pedantic: false,
    sanitize: false,
    smartypants: false,
    xhtml: false,
    headerIds: true,
    mangle: false,
    renderer
  });

  return {
    escapeHtmlAttribute,
    sanitizePreviewHtml
  };
}
