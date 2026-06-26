import type { GlobalPreferencesController } from '../preferences/globalPreferences';
import type { UiStateSnapshot } from '../state/ui.svelte';

type MermaidRuntime = {
  init(config?: unknown, nodes?: NodeListOf<Element> | Element[]): unknown;
  initialize(config: Record<string, unknown>): void;
};

type PreviewRenderStateRuntime = {
  invalidateContent(): void;
};

export type ThemeRuntimeOptions = {
  addMermaidToolbars(): void;
  consoleRef?: Pick<Console, 'warn'>;
  documentRef?: Document;
  getMermaid(): MermaidRuntime | undefined;
  globalPreferences: GlobalPreferencesController;
  markdownPreview: HTMLElement;
  previewRenderState: PreviewRenderStateRuntime;
  syncUiState(patch: Partial<UiStateSnapshot>): void;
  updateMapThemes(): void;
  updateStlThemes(): void;
};

export type ThemeRuntime = {
  initMermaid(forceReinit?: boolean): void;
  toggleTheme(): void;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function createThemeRuntime(options: ThemeRuntimeOptions): ThemeRuntime {
  const documentRef = options.documentRef ?? document;
  const consoleRef = options.consoleRef ?? console;
  let lastMermaidTheme: string | null = null;

  function initMermaid(forceReinit = false): void {
    const mermaid = options.getMermaid();
    if (!mermaid) return;

    const currentTheme = documentRef.documentElement.getAttribute('data-theme');
    const mermaidTheme = currentTheme === 'dark' ? 'dark' : 'default';
    if (!forceReinit && lastMermaidTheme === mermaidTheme) return;

    lastMermaidTheme = mermaidTheme;
    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      securityLevel: 'strict',
      flowchart: { useMaxWidth: true, htmlLabels: true },
      fontSize: 16
    });
  }

  function rerenderMermaidWithTheme(): void {
    const mermaid = options.getMermaid();
    if (!mermaid) return;

    initMermaid(true);
    try {
      const mermaidNodes = options.markdownPreview.querySelectorAll('.mermaid');
      if (mermaidNodes.length === 0) return;

      mermaidNodes.forEach((node) => {
        const originalCode = node.getAttribute('data-original-code');
        if (originalCode) {
          node.innerHTML = escapeHtml(decodeURIComponent(originalCode));
        }
        node.removeAttribute('data-processed');
        const container = node.closest('.mermaid-container');
        if (container) {
          container.classList.add('is-loading');
          container.querySelector('.mermaid-toolbar')?.remove();
        }
      });

      Promise.resolve(mermaid.init(undefined, mermaidNodes))
        .then(() => {
          options.markdownPreview.querySelectorAll('.mermaid-container.is-loading').forEach((container) => {
            container.classList.remove('is-loading');
          });
          options.addMermaidToolbars();
        })
        .catch((error) => {
          consoleRef.warn('Mermaid theme re-render failed:', error);
          options.markdownPreview.querySelectorAll('.mermaid-container.is-loading').forEach((container) => {
            container.classList.remove('is-loading');
          });
        });
    } catch (error) {
      consoleRef.warn('Mermaid theme re-render failed:', error);
    }
  }

  function toggleTheme(): void {
    options.previewRenderState.invalidateContent();
    const theme = documentRef.documentElement.getAttribute('data-theme') === 'dark'
      ? 'light'
      : 'dark';

    documentRef.documentElement.setAttribute('data-theme', theme);
    options.globalPreferences.save({ theme });
    options.syncUiState({ theme });
    rerenderMermaidWithTheme();
    options.updateMapThemes();
    options.updateStlThemes();
  }

  return {
    initMermaid,
    toggleTheme
  };
}
