// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createDiagramToolbarRuntime } from '../../../lib/diagrams/diagramToolbarRuntime';

describe('diagram toolbar runtime', () => {
  it('adds Mermaid toolbar controls without duplicating them', () => {
    const markdownPreview = document.createElement('div');
    markdownPreview.innerHTML = `
      <div class="mermaid-container">
        <svg></svg>
      </div>
    `;
    const runtime = createDiagramToolbarRuntime({
      markdownPreview,
      writeClipboard: vi.fn()
    });

    runtime.addMermaidToolbars();
    runtime.addMermaidToolbars();

    expect(markdownPreview.querySelectorAll('.mermaid-toolbar')).toHaveLength(1);
    expect(markdownPreview.querySelectorAll('.mermaid-toolbar-btn')).not.toHaveLength(0);
  });
});
