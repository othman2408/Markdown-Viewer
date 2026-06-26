import {
  GITHUB_ALERT_META,
  type GitHubAlertMeta,
  type GitHubAlertType
} from '../modals/insertAlertModal';
import {
  isSafeReferenceUrl,
  type ReferenceDefinition
} from './editing';

const GITHUB_ALERT_MARKER_REGEX = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:(?:\s|&nbsp;|<br\s*\/?>)+|$)/i;
const REFERENCE_LINK_TEXT_REGEX = /^\[(\d+)\]$/;
const REFERENCE_TEXT_REGEX = /\[(\d+)\](?!\s*:)/g;

export function enhanceGitHubAlerts(container: ParentNode | null | undefined): void {
  if (!container) return;

  const blockquotes = container.querySelectorAll('blockquote');
  blockquotes.forEach((blockquote) => {
    const firstParagraph = Array.from(blockquote.children)
      .find((child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'P');
    if (!firstParagraph) return;

    const firstParagraphHtml = firstParagraph.innerHTML.trim();
    const markerMatch = firstParagraphHtml.match(GITHUB_ALERT_MARKER_REGEX);
    if (!markerMatch) return;

    const alertType = markerMatch[1].toLowerCase() as GitHubAlertType;
    blockquote.classList.add('markdown-alert', `markdown-alert-${alertType}`);

    const title = createGitHubAlertTitle(
      blockquote.ownerDocument,
      GITHUB_ALERT_META[alertType] || { label: markerMatch[1], path: '' }
    );
    blockquote.insertBefore(title, blockquote.firstChild);

    const remainingHtml = firstParagraphHtml
      .replace(GITHUB_ALERT_MARKER_REGEX, '')
      .trim();
    if (remainingHtml) {
      firstParagraph.innerHTML = remainingHtml;
    } else {
      firstParagraph.remove();
    }
  });
}

function createGitHubAlertTitle(documentRef: Document, alertMeta: GitHubAlertMeta): HTMLParagraphElement {
  const title = documentRef.createElement('p');
  title.className = 'markdown-alert-title';

  const icon = documentRef.createElement('span');
  icon.className = 'markdown-alert-icon';
  icon.setAttribute('aria-hidden', 'true');

  if (alertMeta.path) {
    const svg = documentRef.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', alertMeta.viewBox || '0 0 512 512');
    const path = documentRef.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', alertMeta.path);
    svg.appendChild(path);
    icon.appendChild(svg);
  }

  const label = documentRef.createElement('span');
  label.textContent = alertMeta.label;
  title.appendChild(icon);
  title.appendChild(label);
  return title;
}

export function applyReferencePreviewLinks(
  container: ParentNode | null | undefined,
  referenceDefinitions: ReadonlyMap<number, ReferenceDefinition> | null | undefined
): void {
  if (!container || !referenceDefinitions || referenceDefinitions.size === 0) return;

  container.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
    const number = getReferenceNumberFromLinkText(link.textContent?.trim() || '');
    if (number && referenceDefinitions.has(number)) {
      applyReferenceStyle(link, number, referenceDefinitions);
    }
  });

  const documentRef = getOwnerDocument(container);
  const nodesToProcess: Text[] = [];
  const walker = documentRef.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || !node.nodeValue) continue;
    if (parent.closest('a, code, pre, script, style, mjx-container')) continue;
    REFERENCE_TEXT_REGEX.lastIndex = 0;
    if (REFERENCE_TEXT_REGEX.test(node.nodeValue)) {
      nodesToProcess.push(node);
    }
  }

  nodesToProcess.forEach((node) => {
    replaceTextReferences(node, referenceDefinitions);
  });
}

function getOwnerDocument(container: ParentNode): Document {
  return container instanceof Document
    ? container
    : (container as Node).ownerDocument || document;
}

function getReferenceNumberFromLinkText(text: string): number | null {
  if (/^\d+$/.test(text)) {
    return parseInt(text, 10);
  }

  const match = text.match(REFERENCE_LINK_TEXT_REGEX);
  return match ? parseInt(match[1], 10) : null;
}

function applyReferenceStyle(
  link: HTMLAnchorElement,
  number: number,
  referenceDefinitions: ReadonlyMap<number, ReferenceDefinition>
): void {
  const definition = referenceDefinitions.get(number);
  if (definition?.url && isSafeReferenceUrl(definition.url)) {
    link.setAttribute('href', definition.url);
    if (definition.title) {
      link.setAttribute('title', definition.title);
    } else {
      link.removeAttribute('title');
    }
  } else {
    link.removeAttribute('href');
  }

  link.textContent = `[${number}]`;
  link.classList.add('reference-link');
}

function replaceTextReferences(
  node: Text,
  referenceDefinitions: ReadonlyMap<number, ReferenceDefinition>
): void {
  const text = node.nodeValue || '';
  REFERENCE_TEXT_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  const fragment = node.ownerDocument.createDocumentFragment();

  while ((match = REFERENCE_TEXT_REGEX.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) fragment.appendChild(node.ownerDocument.createTextNode(before));

    const number = parseInt(match[1], 10);
    const definition = referenceDefinitions.get(number);
    if (definition?.url && isSafeReferenceUrl(definition.url)) {
      const link = node.ownerDocument.createElement('a');
      link.href = definition.url;
      if (definition.title) link.title = definition.title;
      link.textContent = `[${number}]`;
      link.classList.add('reference-link');
      fragment.appendChild(link);
    } else {
      fragment.appendChild(node.ownerDocument.createTextNode(match[0]));
    }
    lastIndex = match.index + match[0].length;
  }

  const after = text.slice(lastIndex);
  if (after) fragment.appendChild(node.ownerDocument.createTextNode(after));
  node.parentNode?.replaceChild(fragment, node);
}
