import { describe, expect, it } from 'vitest';
import { createExportFilename, sanitizeExportTitle } from '../../../lib/export/exportFilename';

describe('export filename helpers', () => {
  it('removes existing markdown/export extensions from titles', () => {
    expect(sanitizeExportTitle('Notes.md')).toBe('Notes');
    expect(sanitizeExportTitle('Notes.markdown')).toBe('Notes');
    expect(sanitizeExportTitle('Notes.html')).toBe('Notes');
    expect(sanitizeExportTitle('Notes.pdf')).toBe('Notes');
    expect(sanitizeExportTitle('Notes.png')).toBe('Notes');
  });

  it('replaces filesystem-unsafe filename characters', () => {
    expect(sanitizeExportTitle('Plan: Q1/Q2 * draft?')).toBe('Plan_ Q1_Q2 _ draft_');
    expect(sanitizeExportTitle(' <report>|final" ')).toBe('_report__final_');
  });

  it('creates a filename with the requested extension or fallback', () => {
    expect(createExportFilename({
      extension: 'pdf',
      fallback: 'document.pdf',
      title: 'Quarterly Notes.md'
    })).toBe('Quarterly Notes.pdf');
    expect(createExportFilename({
      extension: 'png',
      fallback: 'document.png',
      title: '   '
    })).toBe('document.png');
    expect(createExportFilename({
      extension: 'html',
      fallback: 'document.html',
      title: null
    })).toBe('document.html');
  });
});
