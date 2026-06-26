// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import DiagramModals from '../../components/DiagramModals.svelte';

describe('DiagramModals', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps Mermaid and STL modal contracts stable for app wiring', () => {
    const { container } = render(DiagramModals);
    const mermaidModal = container.querySelector<HTMLDivElement>('#mermaid-zoom-modal');
    const stlModal = container.querySelector<HTMLDivElement>('#stl-zoom-modal');

    for (const modal of [mermaidModal, stlModal]) {
      expect(modal).not.toBeNull();
      expect(modal?.getAttribute('role')).toBe('dialog');
      expect(modal?.getAttribute('aria-modal')).toBe('true');
      expect(modal?.getAttribute('aria-hidden')).toBe('true');
    }

    expect(container.querySelector('#mermaid-modal-diagram')).not.toBeNull();
    expect(container.querySelector('#mermaid-modal-download-svg')).not.toBeNull();
    expect(container.querySelector('#stl-modal-viewer')).not.toBeNull();
    expect(container.querySelector('#stl-modal-btn-wireframe')).not.toBeNull();
    expect(container.querySelector('#stl-modal-btn-png')).not.toBeNull();
  });
});
