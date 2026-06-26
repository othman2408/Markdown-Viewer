import { queryPreviewRoots } from './previewDom';
import {
  getPreviewMathTypesetTargets,
  previewMarkdownLikelyContainsMath
} from '../markdown/previewMath';

export interface PreviewMathJaxApi {
  typesetPromise(targets: Node[]): Promise<unknown>;
}

export interface PreviewMathWindow {
  MathJax?: PreviewMathJaxApi | PreviewMathJaxConfig;
}

export interface PreviewMathJaxConfig {
  loader: {
    load: string[];
  };
  options: {
    a11y: {
      inTabOrder: boolean;
    };
  };
  tex: {
    inlineMath: string[][];
    displayMath: string[][];
    processEscapes: boolean;
    packages: {
      '[+]': string[];
    };
  };
}

export interface ProcessPreviewMathOptions {
  rawMarkdown: string;
  roots: Node[];
  renderId: unknown;
  isCurrentRender: (renderId: unknown) => boolean;
  loadScript: (src: string) => Promise<unknown>;
  mathjaxUrl: string;
  windowRef?: PreviewMathWindow;
  warn?: (...args: unknown[]) => void;
}

export function createPreviewMathJaxConfig(): PreviewMathJaxConfig {
  return {
    loader: { load: ['[tex]/ams', '[tex]/boldsymbol'] },
    options: {
      a11y: { inTabOrder: false }
    },
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      processEscapes: true,
      packages: { '[+]': ['ams', 'boldsymbol'] }
    }
  };
}

function isMathJaxApi(value: PreviewMathWindow['MathJax']): value is PreviewMathJaxApi {
  return Boolean(value && typeof (value as PreviewMathJaxApi).typesetPromise === 'function');
}

function removeMathJaxTabStops(roots: Node[]): void {
  queryPreviewRoots(roots.filter((root): root is Element => root.nodeType === Node.ELEMENT_NODE), 'mjx-container[tabindex="0"]')
    .forEach((mjx) => {
      mjx.removeAttribute('tabindex');
    });
}

function typesetMathTargets(
  mathJax: PreviewMathJaxApi,
  mathTargets: Node[],
  options: ProcessPreviewMathOptions
): void {
  try {
    mathJax.typesetPromise(mathTargets)
      .then(() => {
        if (!options.isCurrentRender(options.renderId)) return;
        removeMathJaxTabStops(mathTargets);
      })
      .catch((err) => {
        options.warn?.('MathJax typesetting failed:', err);
      });
  } catch (e) {
    options.warn?.('MathJax rendering failed:', e);
  }
}

export function processPreviewMath(options: ProcessPreviewMathOptions): void {
  if (!previewMarkdownLikelyContainsMath(options.rawMarkdown)) return;

  const windowRef = (options.windowRef ?? window) as PreviewMathWindow;
  const mathTargets = getPreviewMathTypesetTargets(options.roots);
  const currentMathJax = windowRef.MathJax;

  if (isMathJaxApi(currentMathJax)) {
    typesetMathTargets(currentMathJax, mathTargets, options);
    return;
  }

  windowRef.MathJax = createPreviewMathJaxConfig();
  options.loadScript(options.mathjaxUrl)
    .then(() => {
      if (!options.isCurrentRender(options.renderId)) return;
      const loadedMathJax = windowRef.MathJax;
      if (isMathJaxApi(loadedMathJax)) {
        typesetMathTargets(loadedMathJax, mathTargets, options);
      }
    })
    .catch((e) => {
      options.warn?.('Failed to load MathJax:', e);
    });
}
