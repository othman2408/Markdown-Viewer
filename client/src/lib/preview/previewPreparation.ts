import {
  extractReferenceDefinitions,
  type ExtractedReferenceDefinitions
} from '../markdown/editing';
import {
  parseFrontmatter,
  renderFrontmatterTable,
  type YamlAdapter
} from '../markdown/frontmatter';

export interface MarkedParser {
  parse(markdown: string): string;
}

export interface HtmlPurifier {
  sanitize(html: string, options: unknown): string;
}

export interface BuildMainThreadPreviewHtmlOptions {
  markdown: string;
  marked: MarkedParser;
  sanitizeHtml: (html: string) => string;
  yaml: YamlAdapter;
}

export interface MainThreadPreviewHtml {
  referenceData: ExtractedReferenceDefinitions;
  sanitizedHtml: string;
}

export function sanitizePreviewHtmlWithPurifier(
  html: string,
  purifier: HtmlPurifier | undefined,
  sanitizeOptions: unknown
): string {
  if (!purifier) {
    throw new ReferenceError('DOMPurify is not defined. Secure rendering aborted.');
  }

  return purifier.sanitize(html, sanitizeOptions);
}

export function buildMainThreadPreviewHtml(
  options: BuildMainThreadPreviewHtmlOptions
): MainThreadPreviewHtml {
  const { frontmatter, body } = parseFrontmatter(options.markdown, options.yaml);
  const tableHtml = frontmatter ? renderFrontmatterTable(frontmatter, options.yaml) : '';
  const referenceData = extractReferenceDefinitions(body);
  const html = tableHtml + options.marked.parse(referenceData.cleanedMarkdown);

  return {
    referenceData,
    sanitizedHtml: options.sanitizeHtml(html)
  };
}
