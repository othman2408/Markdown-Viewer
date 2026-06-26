// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  getPreviewMathTypesetTargets,
  previewMarkdownLikelyContainsMath
} from '../../../lib/markdown/previewMath';

describe('preview math helpers', () => {
  it('detects inline, display, and fenced math syntax', () => {
    expect(previewMarkdownLikelyContainsMath('plain text')).toBe(false);
    expect(previewMarkdownLikelyContainsMath('price is \\$5')).toBe(true);
    expect(previewMarkdownLikelyContainsMath('inline $x$ math')).toBe(true);
    expect(previewMarkdownLikelyContainsMath('$$x$$')).toBe(true);
    expect(previewMarkdownLikelyContainsMath('\\(x\\)')).toBe(true);
    expect(previewMarkdownLikelyContainsMath('```math\nx\n```')).toBe(true);
  });

  it('selects math-bearing roots or falls back to all roots', () => {
    const mathRoot = document.createElement('div');
    const plainRoot = document.createElement('div');
    mathRoot.textContent = 'inline $x$ math';
    plainRoot.textContent = 'plain';

    expect(getPreviewMathTypesetTargets([plainRoot, mathRoot])).toEqual([mathRoot]);
    expect(getPreviewMathTypesetTargets([plainRoot])).toEqual([plainRoot]);
  });
});
