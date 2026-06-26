export type FrontmatterData = Record<string, unknown>;

export type FrontmatterParseResult = {
  frontmatter: FrontmatterData | null;
  body: string;
};

export type YamlAdapter = {
  load(source: string): unknown;
  dump(value: unknown): string;
};

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function parseFrontmatter(
  markdown: string,
  yaml: YamlAdapter,
  consoleRef: Pick<Console, 'warn'> = console
): FrontmatterParseResult {
  const match = markdown.match(/^\s*---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!match) return { frontmatter: null, body: markdown };

  try {
    const data = yaml.load(match[1]) || {};
    return {
      frontmatter: typeof data === 'object' && data !== null ? data as FrontmatterData : {},
      body: markdown.slice(match[0].length)
    };
  } catch (e) {
    consoleRef.warn('Frontmatter YAML parse error:', e);
    return { frontmatter: null, body: markdown };
  }
}

export function renderFrontmatterValue(value: unknown, yaml: YamlAdapter): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (Array.isArray(value)) {
    const allPrimitive = value.every((item) => item === null || typeof item !== 'object');
    if (allPrimitive) {
      return value
        .map((item) => `<span class="fm-tag">${escapeHtml(String(item ?? ''))}</span>`)
        .join('');
    }
    return `<pre class="fm-complex">${escapeHtml(yaml.dump(value).trimEnd())}</pre>`;
  }
  if (typeof value === 'object') {
    return `<pre class="fm-complex">${escapeHtml(yaml.dump(value).trimEnd())}</pre>`;
  }
  return escapeHtml(String(value));
}

export function renderFrontmatterTable(data: FrontmatterData, yaml: YamlAdapter): string {
  const rows = Object.entries(data).map(([key, value]) =>
    `<tr><th>${escapeHtml(key)}</th><td>${renderFrontmatterValue(value, yaml)}</td></tr>`
  );
  return `<table class="frontmatter-table"><tbody>${rows.join('')}</tbody></table>`;
}
