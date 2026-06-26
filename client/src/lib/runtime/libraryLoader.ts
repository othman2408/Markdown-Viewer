export type LibraryUrls = {
  marked: string;
  highlight: string;
  highlight_powershell: string;
  dompurify: string;
  filesaver: string;
  jsyaml: string;
  mermaid: string;
  mathjax: string;
  jspdf: string;
  html2canvas: string;
  pako: string;
  joypixels: string;
  joypixels_css: string;
  abcjs: string;
  leaflet_css: string;
  leaflet_js: string;
  topojson: string;
  three: string;
  stlLoader: string;
  orbitControls: string;
};

const browserGlobals = globalThis as typeof globalThis & Record<string, unknown>;

function createDefaultLibraryUrls(): LibraryUrls {
  return {
    marked: '/vendor/marked/marked.min.js',
    highlight: '/vendor/highlight.js/highlight.min.js',
    highlight_powershell: '/vendor/highlight.js/languages/powershell.min.js',
    dompurify: '/vendor/dompurify/purify.min.js',
    filesaver: '/vendor/file-saver/FileSaver.min.js',
    jsyaml: '/vendor/js-yaml/js-yaml.min.js',
    mermaid: 'https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.min.js',
    mathjax: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    pako: 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js',
    joypixels: 'https://cdn.jsdelivr.net/npm/emoji-toolkit@9.0.1/lib/js/joypixels.min.js',
    joypixels_css: 'https://cdn.jsdelivr.net/npm/emoji-toolkit@9.0.1/extras/css/joypixels.min.css',
    abcjs: 'https://cdnjs.cloudflare.com/ajax/libs/abcjs/6.5.2/abcjs-basic-min.js',
    leaflet_css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
    leaflet_js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
    topojson: 'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js',
    three: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    stlLoader: 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js',
    orbitControls: 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'
  };
}

export function createLibraryLoader() {
  const loadedScripts = new Set<string>();
  const loadedStyles = new Set<string>();
  const CDN = createDefaultLibraryUrls();

  function loadScript(url: string): Promise<void> {
    if (loadedScripts.has(url)) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        loadedScripts.add(url);
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load: ' + url));
      };
      document.head.appendChild(script);
    });
  }

  function loadStyle(url: string): Promise<void> {
    if (loadedStyles.has(url)) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => {
        loadedStyles.add(url);
        resolve();
      };
      link.onerror = () => {
        reject(new Error('Failed to load style: ' + url));
      };
      document.head.appendChild(link);
    });
  }

  async function ensureCoreLibraries(): Promise<void> {
    const loads: Promise<void>[] = [];
    if (typeof browserGlobals.marked === 'undefined') loads.push(loadScript(CDN.marked));
    if (typeof browserGlobals.hljs === 'undefined') {
      loads.push(loadScript(CDN.highlight).then(() => {
        const hljs = browserGlobals.hljs as { getLanguage?: (language: string) => unknown } | undefined;
        if (hljs && !hljs.getLanguage?.('powershell')) {
          return loadScript(CDN.highlight_powershell);
        }
      }));
    }
    if (typeof browserGlobals.DOMPurify === 'undefined') loads.push(loadScript(CDN.dompurify));
    if (loads.length) await Promise.all(loads);
    if (typeof browserGlobals.saveAs === 'undefined') {
      loadScript(CDN.filesaver).catch((error) => {
        console.warn('Optional export library failed to load:', error);
      });
    }
    if (typeof browserGlobals.jsyaml === 'undefined') {
      loadScript(CDN.jsyaml).catch((error) => {
        console.warn('Optional YAML library failed to load:', error);
      });
    }
  }

  return {
    CDN,
    ensureCoreLibraries,
    loadScript,
    loadStyle
  };
}
