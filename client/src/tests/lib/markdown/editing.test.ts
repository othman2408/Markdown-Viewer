import { describe, expect, it } from 'vitest';
import {
  buildMarkdownTable,
  clampNumber,
  escapeRegExp,
  extractReferenceDefinitions,
  getMarkdownCurrentLineRange,
  getMarkdownListLineRange,
  getNextAvailableReferenceNumber,
  getOrderedListStartNumberForValue,
  getUsedReferenceNumbers,
  isSafeReferenceUrl,
  parseMarkdownListItem,
  prepareAlignmentBlockInsertion,
  prepareClearDocumentReplacement,
  prepareLineTransform,
  prepareMarkdownListApplication,
  prepareMarkdownListEnter,
  prepareMarkdownBlockInsertion,
  prepareSelectionOrCurrentLineTransform,
  prepareWrappedSelection,
  renumberOrderedListAfterPosition,
  sanitizeMarkdownTitle,
  stripMarkdownListMarkerForApply,
  toTitleCase
} from '../../../lib/markdown/editing';

describe('markdown editing helpers', () => {
  it('collects used numeric reference definitions', () => {
    expect(Array.from(getUsedReferenceNumbers('[1]: https://a.test\n[x]: no\n[12]: https://b.test'))).toEqual([1, 12]);
  });

  it('extracts reference definitions and leaves non-definitions untouched', () => {
    const result = extractReferenceDefinitions([
      'Intro',
      '[1]: <https://example.com/a> "Alpha"',
      '[2]: https://example.com/b \'Beta\'',
      '[3]: mailto:test@example.com (Email)',
      '[bad]: https://example.com',
      'Outro'
    ].join('\n'));

    expect(result.definitions).toEqual(new Map([
      [1, { url: 'https://example.com/a', title: 'Alpha' }],
      [2, { url: 'https://example.com/b', title: 'Beta' }],
      [3, { url: 'mailto:test@example.com', title: 'Email' }]
    ]));
    expect(result.cleanedMarkdown).toBe('Intro\n\n\n\n[bad]: https://example.com\nOutro');
  });

  it('finds the next available reference number', () => {
    expect(getNextAvailableReferenceNumber(new Set([1, 2, 4]), 1)).toBe(3);
    expect(getNextAvailableReferenceNumber(new Set([1, 2, 3]), 0)).toBe(4);
    expect(getNextAvailableReferenceNumber(new Set(), 8)).toBe(8);
  });

  it('escapes markdown reference titles', () => {
    expect(sanitizeMarkdownTitle('A "quoted" \\ path')).toBe('A \\"quoted\\" \\\\ path');
  });

  it('accepts only preview-safe reference URL protocols', () => {
    expect(isSafeReferenceUrl('https://example.com', 'https://app.test/share/x')).toBe(true);
    expect(isSafeReferenceUrl('/local/path', 'https://app.test/share/x')).toBe(true);
    expect(isSafeReferenceUrl('mailto:test@example.com', 'https://app.test/share/x')).toBe(true);
    expect(isSafeReferenceUrl('tel:+123', 'https://app.test/share/x')).toBe(true);
    expect(isSafeReferenceUrl('blob:https://app.test/id', 'https://app.test/share/x')).toBe(true);
    expect(isSafeReferenceUrl('javascript:alert(1)', 'https://app.test/share/x')).toBe(false);
    expect(isSafeReferenceUrl('', 'https://app.test/share/x')).toBe(false);
  });

  it('clamps integer input with the parseInt behavior', () => {
    expect(clampNumber('5', 1, 10, 3)).toBe(5);
    expect(clampNumber('100', 1, 20, 3)).toBe(20);
    expect(clampNumber('-5', 1, 20, 3)).toBe(1);
    expect(clampNumber('abc', 1, 20, 3)).toBe(3);
    expect(clampNumber('4.9', 1, 20, 3)).toBe(4);
  });

  it('builds markdown table skeletons', () => {
    expect(buildMarkdownTable(2, 2)).toBe(
      '| Column 1 | Column 2 |\n| --- | --- |\n| Value | Value |\n| Value | Value |\n'
    );
  });

  it('prepares a clear-document replacement', () => {
    expect(prepareClearDocumentReplacement({ value: 'Alpha\nBeta' })).toEqual({
      end: 10,
      replacement: '',
      selectionEnd: 0,
      selectionStart: 0,
      start: 0
    });
  });

  it('converts selected text to title case', () => {
    expect(toTitleCase('hello WORLD from markdown')).toBe('Hello World From Markdown');
    expect(toTitleCase('keep\nmultiple lines')).toBe('Keep\nMultiple Lines');
  });

  it('finds the list line range and ignores a selected trailing newline', () => {
    const value = 'Intro\n- one\n- two\nOutro';

    expect(getMarkdownListLineRange(value, 6, 18)).toEqual({
      end: 17,
      start: 6,
      text: '- one\n- two'
    });
  });

  it('finds the current markdown line range at the caret', () => {
    expect(getMarkdownCurrentLineRange('Intro\nCurrent\nOutro', 8)).toEqual({
      end: 13,
      start: 6,
      text: 'Current'
    });
  });

  it('prepares wrapped selection with placeholder and selected-text behavior', () => {
    expect(prepareWrappedSelection({
      end: 5,
      placeholder: 'bold text',
      prefix: '**',
      start: 5,
      suffix: '**',
      value: 'Hello'
    })).toEqual({
      end: 5,
      replacement: '**bold text**',
      selectionEnd: 16,
      selectionStart: 7,
      start: 5
    });
    expect(prepareWrappedSelection({
      end: 5,
      placeholder: 'bold text',
      prefix: '**',
      start: 0,
      suffix: '**',
      value: 'Hello'
    })).toEqual({
      end: 5,
      replacement: '**Hello**',
      selectionEnd: 7,
      selectionStart: 2,
      start: 0
    });
  });

  it('prepares full-line transforms across the selected line range', () => {
    expect(prepareLineTransform({
      end: 8,
      start: 7,
      transformer: (line) => (line ? `> ${line.replace(/^>\s?/, '')}` : '>'),
      value: 'Intro\nAlpha\nBeta'
    })).toEqual({
      end: 11,
      replacement: '> Alpha',
      selectionEnd: 13,
      selectionStart: 6,
      start: 6
    });
  });

  it('prepares selection or current-line transforms', () => {
    expect(prepareSelectionOrCurrentLineTransform({
      selectionEnd: 8,
      selectionStart: 8,
      transformer: (text) => text.toUpperCase(),
      value: 'Intro\ncurrent\nOutro'
    })).toEqual({
      end: 13,
      replacement: 'CURRENT',
      selectionEnd: 13,
      selectionStart: 6,
      start: 6
    });
    expect(prepareSelectionOrCurrentLineTransform({
      selectionEnd: 7,
      selectionStart: 2,
      transformer: (text) => text.toUpperCase(),
      value: 'abcdefgh'
    })).toEqual({
      end: 7,
      replacement: 'CDEFG',
      selectionEnd: 7,
      selectionStart: 2,
      start: 2
    });
  });

  it('parses ordered and unordered markdown list items', () => {
    expect(parseMarkdownListItem('  12. Ordered item')).toEqual({
      body: 'Ordered item',
      bullet: null,
      indent: '  ',
      marker: '12.',
      number: 12,
      prefix: '  12. ',
      type: 'ordered'
    });
    expect(parseMarkdownListItem('\t- Unordered item')).toEqual({
      body: 'Unordered item',
      bullet: '-',
      indent: '\t',
      marker: '-',
      number: null,
      prefix: '\t- ',
      type: 'unordered'
    });
    expect(parseMarkdownListItem('plain text')).toBeNull();
  });

  it('strips existing list markers while preserving indentation', () => {
    expect(stripMarkdownListMarkerForApply('  3. Existing')).toEqual({
      body: 'Existing',
      indent: '  '
    });
    expect(stripMarkdownListMarkerForApply('  Plain')).toEqual({
      body: 'Plain',
      indent: '  '
    });
  });

  it('continues ordered list numbering from the previous non-empty list line', () => {
    expect(getOrderedListStartNumberForValue('1. One\n2. Two\n', 14)).toBe(3);
    expect(getOrderedListStartNumberForValue('1. One\n\nNext', 8)).toBe(1);
    expect(getOrderedListStartNumberForValue('- Bullet\nNext', 9)).toBe(1);
  });

  it('prepares unordered list application for a single current line', () => {
    expect(prepareMarkdownListApplication({
      selectionEnd: 4,
      selectionStart: 4,
      type: 'unordered',
      value: 'Task'
    })).toEqual({
      end: 4,
      replacement: '- Task',
      selectionEnd: 2,
      selectionStart: 2,
      start: 0
    });
  });

  it('prepares ordered list application continuing from a previous item', () => {
    expect(prepareMarkdownListApplication({
      selectionEnd: 16,
      selectionStart: 16,
      type: 'ordered',
      value: '1. Existing\nNext'
    })).toEqual({
      end: 16,
      replacement: '2. Next',
      selectionEnd: 15,
      selectionStart: 15,
      start: 12
    });
  });

  it('prepares multi-line list application and ignores selected trailing newline', () => {
    expect(prepareMarkdownListApplication({
      selectionEnd: 12,
      selectionStart: 0,
      type: 'unordered',
      value: '- old\nplain\n'
    })).toEqual({
      end: 11,
      replacement: '- old\n- plain',
      selectionEnd: 13,
      selectionStart: 13,
      start: 0
    });
  });

  it('prepares Enter on an empty list item by removing the marker', () => {
    expect(prepareMarkdownListEnter({
      selectionEnd: 2,
      selectionStart: 2,
      value: '- '
    })).toEqual({
      end: 2,
      replacement: '',
      selectionEnd: 0,
      selectionStart: 0,
      start: 0
    });
  });

  it('prepares Enter continuation for unordered list items', () => {
    expect(prepareMarkdownListEnter({
      selectionEnd: 6,
      selectionStart: 6,
      value: '- Item'
    })).toEqual({
      end: 6,
      replacement: '\n- ',
      selectionEnd: 9,
      selectionStart: 9,
      start: 6
    });
  });

  it('prepares Enter continuation and renumbering for ordered list items', () => {
    expect(prepareMarkdownListEnter({
      selectionEnd: 6,
      selectionStart: 6,
      value: '1. One'
    })).toEqual({
      end: 6,
      replacement: '\n2. ',
      renumber: {
        nextNumber: 3,
        position: 10
      },
      selectionEnd: 10,
      selectionStart: 10,
      start: 6
    });
  });

  it('does not prepare Enter continuation for selections or plain lines', () => {
    expect(prepareMarkdownListEnter({
      selectionEnd: 4,
      selectionStart: 0,
      value: '- Item'
    })).toBeNull();
    expect(prepareMarkdownListEnter({
      selectionEnd: 4,
      selectionStart: 4,
      value: 'Text'
    })).toBeNull();
  });

  it('renumbers following ordered list items after an inserted item', () => {
    expect(renumberOrderedListAfterPosition(
      '1. One\n2. New\n2. Two\n3. Three',
      13,
      3
    )).toBe('1. One\n2. New\n3. Two\n4. Three');
  });

  it('returns null when ordered renumbering makes no change', () => {
    expect(renumberOrderedListAfterPosition(
      '1. One\n2. New\n3. Two',
      13,
      3
    )).toBeNull();
  });

  it('stops ordered renumbering at blank or non-ordered lines', () => {
    expect(renumberOrderedListAfterPosition(
      '1. One\n2. New\n2. Two\n\n3. Three',
      13,
      3
    )).toBe('1. One\n2. New\n3. Two\n\n3. Three');
    expect(renumberOrderedListAfterPosition(
      '1. One\n2. New\n- Bullet\n3. Three',
      13,
      3
    )).toBeNull();
  });

  it('prepares block insertions with preserved leading and trailing line breaks', () => {
    expect(prepareMarkdownBlockInsertion({
      block: '| Column 1 |\n| --- |\n',
      end: 5,
      start: 5,
      value: 'IntroOutro'
    })).toEqual({
      end: 5,
      replacement: '\n| Column 1 |\n| --- |\n\n',
      selectionEnd: 28,
      selectionStart: 28,
      start: 5
    });

    expect(prepareMarkdownBlockInsertion({
      block: '> Quote\n',
      end: 6,
      start: 6,
      value: 'Intro\n'
    })).toEqual({
      end: 6,
      replacement: '> Quote\n',
      selectionEnd: 14,
      selectionStart: 14,
      start: 6
    });
  });

  it('prepares alignment blocks and preserves selected content', () => {
    expect(prepareAlignmentBlockInsertion({
      align: 'center',
      end: 12,
      start: 6,
      value: 'Intro\nChosen\nOutro'
    })).toEqual({
      end: 12,
      replacement: '<div align="center">\nChosen\n</div>',
      selectionEnd: 33,
      selectionStart: 27,
      start: 6
    });
  });

  it('prepares empty alignment blocks with surrounding line breaks and rejects unsupported alignment', () => {
    expect(prepareAlignmentBlockInsertion({
      align: 'right',
      end: 5,
      start: 5,
      value: 'IntroOutro'
    })).toEqual({
      end: 5,
      replacement: '\n<div align="right">\n\n</div>\n',
      selectionEnd: 26,
      selectionStart: 26,
      start: 5
    });
    expect(prepareAlignmentBlockInsertion({
      align: 'middle',
      end: 0,
      start: 0,
      value: ''
    })).toBeNull();
  });

  it('escapes text for regular expressions', () => {
    expect(escapeRegExp('a+b*(test)[x]?')).toBe('a\\+b\\*\\(test\\)\\[x\\]\\?');
  });
});
