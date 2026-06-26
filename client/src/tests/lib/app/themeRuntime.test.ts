// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createThemeRuntime } from '../../../lib/app/themeRuntime';

describe('theme runtime', () => {
  it('toggles theme, persists preference, and refreshes map/STL themes', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const markdownPreview = document.createElement('div');
    const mermaid = {
      init: vi.fn(),
      initialize: vi.fn()
    };
    const globalPreferences = {
      getInitialDirection: vi.fn(),
      getInitialTheme: vi.fn(),
      load: vi.fn(),
      save: vi.fn()
    };
    const runtime = createThemeRuntime({
      addMermaidToolbars: vi.fn(),
      getMermaid: () => mermaid,
      globalPreferences,
      markdownPreview,
      previewRenderState: { invalidateContent: vi.fn() },
      syncUiState: vi.fn(),
      updateMapThemes: vi.fn(),
      updateStlThemes: vi.fn()
    });

    runtime.toggleTheme();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(globalPreferences.save).toHaveBeenCalledWith({ theme: 'light' });
    expect(mermaid.initialize).toHaveBeenCalledWith(expect.objectContaining({ theme: 'default' }));
  });

  it('restores Mermaid source before re-rendering themed diagrams', async () => {
    document.documentElement.setAttribute('data-theme', 'light');
    const markdownPreview = document.createElement('div');
    markdownPreview.innerHTML = `
      <div class="mermaid-container">
        <div class="mermaid" data-original-code="${encodeURIComponent('graph TD; A-->B')}"><svg></svg></div>
        <div class="mermaid-toolbar"></div>
      </div>
    `;
    const mermaid = {
      init: vi.fn().mockResolvedValue(undefined),
      initialize: vi.fn()
    };
    const addMermaidToolbars = vi.fn();
    const runtime = createThemeRuntime({
      addMermaidToolbars,
      getMermaid: () => mermaid,
      globalPreferences: {
        getInitialDirection: vi.fn(),
        getInitialTheme: vi.fn(),
        load: vi.fn(),
        save: vi.fn()
      },
      markdownPreview,
      previewRenderState: { invalidateContent: vi.fn() },
      syncUiState: vi.fn(),
      updateMapThemes: vi.fn(),
      updateStlThemes: vi.fn()
    });

    runtime.toggleTheme();
    await Promise.resolve();

    expect(markdownPreview.querySelector('.mermaid')?.textContent).toBe('graph TD; A-->B');
    expect(markdownPreview.querySelector('.mermaid-toolbar')).toBeNull();
    expect(addMermaidToolbars).toHaveBeenCalledOnce();
  });
});
