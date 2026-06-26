const PREVIEW_MATH_TEXT_PATTERN = /\$\$|\$[^$]|\\\(|\\\[/;
const PREVIEW_MATH_BLOCK_PATTERN = /```math\b/;

export function previewMarkdownLikelyContainsMath(markdown: string | null | undefined): boolean {
  const value = markdown || '';
  return PREVIEW_MATH_TEXT_PATTERN.test(value) || PREVIEW_MATH_BLOCK_PATTERN.test(value);
}

export function getPreviewMathTypesetTargets(roots: Node[]): Node[] {
  const typesetTargets = roots.filter((root) => (
    root &&
    root.nodeType === Node.ELEMENT_NODE &&
    PREVIEW_MATH_TEXT_PATTERN.test(root.textContent || '')
  ));

  return typesetTargets.length ? typesetTargets : roots;
}
