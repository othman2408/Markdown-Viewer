export type ReferenceDefinition = {
  url: string;
  title: string;
};

export type ExtractedReferenceDefinitions = {
  definitions: Map<number, ReferenceDefinition>;
  cleanedMarkdown: string;
};

export type MarkdownAlignment = 'left' | 'center' | 'right';

export type PreparedEditorReplacement = {
  end: number;
  replacement: string;
  selectionEnd: number;
  selectionStart: number;
  start: number;
};

export type PrepareClearDocumentReplacementInput = {
  value: string;
};

export type PrepareMarkdownBlockInsertionInput = {
  block: string;
  end: number;
  start: number;
  value: string;
};

export type PrepareWrappedSelectionInput = {
  end: number;
  placeholder: string;
  prefix: string;
  start: number;
  suffix: string;
  value: string;
};

export type PrepareAlignmentBlockInsertionInput = {
  align: string;
  end: number;
  start: number;
  value: string;
};

export type MarkdownLineRange = {
  end: number;
  start: number;
  text: string;
};

export type MarkdownListItem = {
  body: string;
  bullet: string | null;
  indent: string;
  marker: string;
  number: number | null;
  prefix: string;
  type: 'ordered' | 'unordered';
};

export type MarkdownListType = 'ordered' | 'unordered';

export type StrippedMarkdownListLine = {
  body: string;
  indent: string;
};

export type PrepareMarkdownListApplicationInput = {
  selectionEnd: number;
  selectionStart: number;
  type: MarkdownListType;
  value: string;
};

export type PreparedOrderedListRenumber = {
  nextNumber: number;
  position: number;
};

export type PreparedMarkdownListEnter = PreparedEditorReplacement & {
  renumber?: PreparedOrderedListRenumber;
};

export type PrepareMarkdownListEnterInput = {
  selectionEnd: number;
  selectionStart: number;
  value: string;
};

export type PrepareLineTransformInput = {
  end: number;
  start: number;
  transformer: (line: string) => string;
  value: string;
};

export type PrepareSelectionOrCurrentLineTransformInput = {
  selectionEnd: number;
  selectionStart: number;
  transformer: (text: string) => string;
  value: string;
};

const allowedMarkdownAlignments = new Set<MarkdownAlignment>(['left', 'center', 'right']);

export function getUsedReferenceNumbers(text: string): Set<number> {
  const used = new Set<number>();
  const regex = /^\[(\d+)\]:/gm;
  let match = regex.exec(text);
  while (match) {
    const num = parseInt(match[1], 10);
    if (!Number.isNaN(num)) used.add(num);
    match = regex.exec(text);
  }
  return used;
}

export function extractReferenceDefinitions(markdown: string): ExtractedReferenceDefinitions {
  const definitions = new Map<number, ReferenceDefinition>();
  const definitionRegex = /^\[(\d+)\]:\s*(?:<([^>\s]+)>|(\S+))(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]+)\)))?\s*$/gm;
  const cleanedMarkdown = markdown.replace(
    definitionRegex,
    (match, numberText, angleUrl, plainUrl, titleDouble, titleSingle, titleParen) => {
      const number = parseInt(numberText, 10);
      if (Number.isNaN(number)) return match;
      const url = (angleUrl || plainUrl || '').trim();
      if (!url) return match;
      const title = titleDouble || titleSingle || titleParen || '';
      definitions.set(number, { url, title });
      return '';
    }
  );
  return { definitions, cleanedMarkdown };
}

export function getNextAvailableReferenceNumber(used: ReadonlySet<number>, startNumber?: number): number {
  let next = Math.max(1, startNumber || 1);
  while (used.has(next)) next += 1;
  return next;
}

export function sanitizeMarkdownTitle(title: string): string {
  return title
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

export function isSafeReferenceUrl(
  url: string | null | undefined,
  baseUrl = globalThis.location?.href || 'http://localhost/'
): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url, baseUrl);
    return ['http:', 'https:', 'mailto:', 'tel:', 'blob:'].includes(parsed.protocol);
  } catch (_) {
    return false;
  }
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function buildMarkdownTable(columns: number, rows: number): string {
  const header = Array.from({ length: columns }, (_, index) => `Column ${index + 1}`).join(' | ');
  const divider = Array.from({ length: columns }, () => '---').join(' | ');
  const bodyRows = Array.from({ length: rows }, () => `| ${Array.from({ length: columns }, () => 'Value').join(' | ')} |`);
  return `| ${header} |\n| ${divider} |\n${bodyRows.join('\n')}\n`;
}

export function prepareClearDocumentReplacement(
  input: PrepareClearDocumentReplacementInput
): PreparedEditorReplacement {
  return {
    end: input.value.length,
    replacement: '',
    selectionEnd: 0,
    selectionStart: 0,
    start: 0
  };
}

export function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export function getMarkdownListLineRange(value: string, start: number, end: number): MarkdownLineRange {
  const effectiveEnd = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  let lineEnd = value.indexOf('\n', effectiveEnd);

  if (lineEnd === -1) lineEnd = value.length;

  return {
    end: lineEnd,
    start: lineStart,
    text: value.slice(lineStart, lineEnd)
  };
}

export function getMarkdownCurrentLineRange(value: string, start: number): MarkdownLineRange {
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  let lineEnd = value.indexOf('\n', start);

  if (lineEnd === -1) lineEnd = value.length;

  return {
    end: lineEnd,
    start: lineStart,
    text: value.slice(lineStart, lineEnd)
  };
}

export function getMarkdownSelectedLineRange(value: string, start: number, end: number): MarkdownLineRange {
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  let lineEnd = value.indexOf('\n', end);

  if (lineEnd === -1) lineEnd = value.length;

  return {
    end: lineEnd,
    start: lineStart,
    text: value.slice(lineStart, lineEnd)
  };
}

export function parseMarkdownListItem(line: string): MarkdownListItem | null {
  const match = line.match(/^(\s*)((\d+)\.|[-*+])(?:\s+|$)(.*)$/);
  if (!match) return null;

  const isOrdered = typeof match[3] !== 'undefined';

  return {
    body: match[4] || '',
    bullet: isOrdered ? null : match[2],
    indent: match[1],
    marker: match[2],
    number: isOrdered ? parseInt(match[3], 10) : null,
    prefix: `${match[1]}${match[2]} `,
    type: isOrdered ? 'ordered' : 'unordered'
  };
}

export function stripMarkdownListMarkerForApply(line: string): StrippedMarkdownListLine {
  const parsed = parseMarkdownListItem(line);
  if (parsed) {
    return {
      body: parsed.body,
      indent: parsed.indent
    };
  }

  const match = line.match(/^(\s*)(.*)$/);

  return {
    body: match ? match[2] : line,
    indent: match ? match[1] : ''
  };
}

function getPreviousMarkdownLine(value: string, lineStart: number): MarkdownLineRange | null {
  if (lineStart <= 0) return null;

  const previousEnd = lineStart - 1;
  const previousStart = previousEnd > 0 ? value.lastIndexOf('\n', previousEnd - 1) + 1 : 0;

  return {
    end: previousEnd,
    start: previousStart,
    text: value.slice(previousStart, previousEnd)
  };
}

export function getOrderedListStartNumberForValue(value: string, lineStart: number): number {
  const previousLine = getPreviousMarkdownLine(value, lineStart);
  if (!previousLine || !previousLine.text.trim()) return 1;

  const parsed = parseMarkdownListItem(previousLine.text);

  return parsed && parsed.type === 'ordered' && parsed.number !== null ? parsed.number + 1 : 1;
}

export function prepareMarkdownListApplication(input: PrepareMarkdownListApplicationInput): PreparedEditorReplacement {
  const range = getMarkdownListLineRange(input.value, input.selectionStart, input.selectionEnd);
  const hadSelection = input.selectionStart !== input.selectionEnd;
  const lines = range.text.split('\n');
  let nextNumber = input.type === 'ordered' ? getOrderedListStartNumberForValue(input.value, range.start) : 1;
  let firstPrefixLength: number | null = null;
  const replacement = lines.map((line) => {
    const stripped = stripMarkdownListMarkerForApply(line);
    const prefix = input.type === 'ordered'
      ? `${stripped.indent}${nextNumber++}. `
      : `${stripped.indent}- `;

    if (firstPrefixLength === null) firstPrefixLength = prefix.length;

    return `${prefix}${stripped.body}`;
  }).join('\n');
  const isSingleLine = lines.length === 1;
  const caret = (!hadSelection || isSingleLine)
    ? range.start + (firstPrefixLength || 0)
    : range.start + replacement.length;

  return {
    end: range.end,
    replacement,
    selectionEnd: caret,
    selectionStart: caret,
    start: range.start
  };
}

export function prepareMarkdownListEnter(input: PrepareMarkdownListEnterInput): PreparedMarkdownListEnter | null {
  if (input.selectionStart !== input.selectionEnd) {
    return null;
  }

  const range = getMarkdownCurrentLineRange(input.value, input.selectionStart);
  const parsed = parseMarkdownListItem(range.text);
  if (!parsed) return null;

  if (!parsed.body.trim()) {
    const caret = range.start + parsed.indent.length;

    return {
      end: range.end,
      replacement: parsed.indent,
      selectionEnd: caret,
      selectionStart: caret,
      start: range.start
    };
  }

  const nextPrefix = parsed.type === 'ordered'
    ? `${parsed.indent}${(parsed.number ?? 0) + 1}. `
    : `${parsed.indent}${parsed.bullet} `;
  const insertAt = input.selectionStart;
  const caret = insertAt + 1 + nextPrefix.length;
  const prepared: PreparedMarkdownListEnter = {
    end: insertAt,
    replacement: `\n${nextPrefix}`,
    selectionEnd: caret,
    selectionStart: caret,
    start: insertAt
  };

  if (parsed.type === 'ordered' && parsed.number !== null) {
    prepared.renumber = {
      nextNumber: parsed.number + 2,
      position: caret
    };
  }

  return prepared;
}

export function renumberOrderedListAfterPosition(
  value: string,
  position: number,
  nextNumber: number
): string | null {
  let nextValue = value;
  let lineStart = nextValue.indexOf('\n', position);
  if (lineStart === -1) return null;

  lineStart += 1;
  let changed = false;

  while (lineStart < nextValue.length) {
    let lineEnd = nextValue.indexOf('\n', lineStart);
    const hasNewline = lineEnd !== -1;
    if (!hasNewline) lineEnd = nextValue.length;

    const line = nextValue.slice(lineStart, lineEnd);
    if (!line.trim()) break;

    const parsed = parseMarkdownListItem(line);
    if (!parsed || parsed.type !== 'ordered') break;

    const replacement = `${parsed.indent}${nextNumber}. ${parsed.body}`;
    if (replacement !== line) {
      nextValue = nextValue.slice(0, lineStart) + replacement + nextValue.slice(lineEnd);
      changed = true;
    }

    lineStart += replacement.length + (hasNewline ? 1 : 0);
    nextNumber += 1;
  }

  return changed ? nextValue : null;
}

export function prepareWrappedSelection(input: PrepareWrappedSelectionInput): PreparedEditorReplacement {
  const selected = input.value.slice(input.start, input.end) || input.placeholder;
  const replacement = `${input.prefix}${selected}${input.suffix}`;
  const selectionStart = input.start + input.prefix.length;
  const selectionEnd = selectionStart + selected.length;

  return {
    end: input.end,
    replacement,
    selectionEnd,
    selectionStart,
    start: input.start
  };
}

export function prepareLineTransform(input: PrepareLineTransformInput): PreparedEditorReplacement {
  const range = getMarkdownSelectedLineRange(input.value, input.start, input.end);
  const replacement = range.text.split('\n').map(input.transformer).join('\n');

  return {
    end: range.end,
    replacement,
    selectionEnd: range.start + replacement.length,
    selectionStart: range.start,
    start: range.start
  };
}

export function prepareSelectionOrCurrentLineTransform(
  input: PrepareSelectionOrCurrentLineTransformInput
): PreparedEditorReplacement {
  const range = input.selectionStart === input.selectionEnd
    ? getMarkdownCurrentLineRange(input.value, input.selectionStart)
    : {
        end: input.selectionEnd,
        start: input.selectionStart,
        text: input.value.slice(input.selectionStart, input.selectionEnd)
      };
  const replacement = input.transformer(range.text);

  return {
    end: range.end,
    replacement,
    selectionEnd: range.start + replacement.length,
    selectionStart: range.start,
    start: range.start
  };
}

export function prepareMarkdownBlockInsertion(input: PrepareMarkdownBlockInsertionInput): PreparedEditorReplacement {
  const needsLeadingBreak = input.start > 0 && input.value[input.start - 1] !== '\n';
  const needsTrailingBreak = input.end < input.value.length && input.value[input.end] !== '\n';
  const replacement = `${needsLeadingBreak ? '\n' : ''}${input.block}${needsTrailingBreak ? '\n' : ''}`;
  const caret = input.start + replacement.length;

  return {
    end: input.end,
    replacement,
    selectionEnd: caret,
    selectionStart: caret,
    start: input.start
  };
}

export function prepareAlignmentBlockInsertion(
  input: PrepareAlignmentBlockInsertionInput
): PreparedEditorReplacement | null {
  if (!allowedMarkdownAlignments.has(input.align as MarkdownAlignment)) {
    return null;
  }

  const selected = input.value.slice(input.start, input.end);
  const hasSelection = input.start !== input.end;
  const blockStart = `<div align="${input.align}">\n`;
  const blockEnd = '\n</div>';
  const block = `${blockStart}${hasSelection ? selected : ''}${blockEnd}`;
  const needsLeadingBreak = input.start > 0 && input.value[input.start - 1] !== '\n';
  const needsTrailingBreak = input.end < input.value.length && input.value[input.end] !== '\n';
  const replacement = `${needsLeadingBreak ? '\n' : ''}${block}${needsTrailingBreak ? '\n' : ''}`;
  const selectionStart = input.start + (needsLeadingBreak ? 1 : 0) + blockStart.length;
  const selectionEnd = selectionStart + (hasSelection ? selected.length : 0);

  return {
    end: input.end,
    replacement,
    selectionEnd: hasSelection ? selectionEnd : selectionStart,
    selectionStart,
    start: input.start
  };
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
