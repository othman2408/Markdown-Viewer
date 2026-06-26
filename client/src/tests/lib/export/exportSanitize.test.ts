import { describe, expect, it } from 'vitest';
import { createExportSanitizeOptions } from '../../../lib/export/exportSanitize';

describe('export sanitize options', () => {
  it('keeps the standalone HTML export allowlist compact', () => {
    const options = createExportSanitizeOptions('standalone-html');

    expect(options.ADD_TAGS).toEqual(['mjx-container', 'input']);
    expect(options.ADD_ATTR).toEqual([
      'id',
      'class',
      'style',
      'align',
      'type',
      'checked',
      'disabled',
      'data-original-code'
    ]);
    expect(options.ALLOWED_URI_REGEXP.test('https://example.com/image.png')).toBe(true);
    expect(options.ALLOWED_URI_REGEXP.test('javascript:alert(1)')).toBe(false);
  });

  it('allows SVG tags and attributes for PDF/PNG canvas exports', () => {
    const options = createExportSanitizeOptions('canvas');

    expect(options.ADD_TAGS).toEqual([
      'mjx-container',
      'svg',
      'path',
      'g',
      'marker',
      'defs',
      'pattern',
      'clipPath',
      'input'
    ]);
    expect(options.ADD_ATTR).toContain('viewBox');
    expect(options.ADD_ATTR).toContain('marker-end');
    expect(options.ADD_ATTR).toContain('data-original-code');
  });

  it('returns fresh arrays so callers cannot mutate shared config', () => {
    const first = createExportSanitizeOptions('canvas');
    const second = createExportSanitizeOptions('canvas');

    first.ADD_TAGS.push('mutated');
    first.ADD_ATTR.push('mutated');

    expect(second.ADD_TAGS).not.toContain('mutated');
    expect(second.ADD_ATTR).not.toContain('mutated');
  });
});
