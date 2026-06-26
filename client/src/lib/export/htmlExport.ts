export interface BuildStandaloneHtmlExportDocumentOptions {
  bodyHtml: string;
  darkTheme: boolean;
}

interface HtmlExportTheme {
  abcBackground: string;
  alertCaution: string;
  alertCautionBackground: string;
  alertImportant: string;
  alertImportantBackground: string;
  alertNote: string;
  alertNoteBackground: string;
  alertTip: string;
  alertTipBackground: string;
  alertWarning: string;
  alertWarningBackground: string;
  background: string;
  border: string;
  codeAddition: string;
  codeAdditionBackground: string;
  codeAttr: string;
  codeBuiltin: string;
  codeComment: string;
  codeDeletion: string;
  codeDeletionBackground: string;
  codeKeyword: string;
  codeRegexp: string;
  codeSection: string;
  codeSubst: string;
  codeSymbol: string;
  codeTag: string;
  codeTitle: string;
  frontmatterHeaderBackground: string;
  githubCss: string;
  mermaidTheme: 'dark' | 'default';
  text: string;
}

const lightHtmlExportTheme: HtmlExportTheme = {
  abcBackground: '#f6f8fa',
  alertCaution: '#cf222e',
  alertCautionBackground: '#ffebe9',
  alertImportant: '#8250df',
  alertImportantBackground: '#fbefff',
  alertNote: '#0969da',
  alertNoteBackground: '#ddf4ff',
  alertTip: '#1a7f37',
  alertTipBackground: '#dafbe1',
  alertWarning: '#9a6700',
  alertWarningBackground: '#fff8c5',
  background: '#ffffff',
  border: '#e1e4e8',
  codeAddition: '#22863a',
  codeAdditionBackground: '#f0fff4',
  codeAttr: '#005cc5',
  codeBuiltin: '#e36209',
  codeComment: '#6a737d',
  codeDeletion: '#b31d28',
  codeDeletionBackground: '#ffeef0',
  codeKeyword: '#d73a49',
  codeRegexp: '#032f62',
  codeSection: '#005cc5',
  codeSubst: '#24292e',
  codeSymbol: '#005cc5',
  codeTag: '#22863a',
  codeTitle: '#6f42c1',
  frontmatterHeaderBackground: '#f6f8fa',
  githubCss: 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.3.0/github-markdown.min.css',
  mermaidTheme: 'default',
  text: '#24292e'
};

const darkHtmlExportTheme: HtmlExportTheme = {
  abcBackground: '#161b22',
  alertCaution: '#f85149',
  alertCautionBackground: 'rgba(248, 81, 73, 0.18)',
  alertImportant: '#ab7df8',
  alertImportantBackground: 'rgba(137, 87, 229, 0.15)',
  alertNote: '#4493f8',
  alertNoteBackground: 'rgba(31, 111, 235, 0.15)',
  alertTip: '#3fb950',
  alertTipBackground: 'rgba(35, 134, 54, 0.15)',
  alertWarning: '#d29922',
  alertWarningBackground: 'rgba(210, 153, 34, 0.18)',
  background: '#0d1117',
  border: '#30363d',
  codeAddition: '#aff5b4',
  codeAdditionBackground: '#033a16',
  codeAttr: '#79c0ff',
  codeBuiltin: '#ffa657',
  codeComment: '#8b949e',
  codeDeletion: '#ffdcd7',
  codeDeletionBackground: '#67060c',
  codeKeyword: '#ff7b72',
  codeRegexp: '#a5d6ff',
  codeSection: '#1f6feb',
  codeSubst: '#c9d1d9',
  codeSymbol: '#79c0ff',
  codeTag: '#7ee787',
  codeTitle: '#d2a8ff',
  frontmatterHeaderBackground: '#161b22',
  githubCss: 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.3.0/github-markdown-dark.min.css',
  mermaidTheme: 'dark',
  text: '#c9d1d9'
};

function getHtmlExportTheme(darkTheme: boolean): HtmlExportTheme {
  return darkTheme ? darkHtmlExportTheme : lightHtmlExportTheme;
}

export function buildStandaloneHtmlExportDocument(options: BuildStandaloneHtmlExportDocumentOptions): string {
  const theme = getHtmlExportTheme(options.darkTheme);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <link rel="stylesheet" href="${theme.githubCss}">
  <script>
      window.MathJax = {
          loader: { load: ['[tex]/ams', '[tex]/boldsymbol'] },
          tex: {
              inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
              displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
              processEscapes: true,
              packages: { '[+]': ['ams', 'boldsymbol'] }
          }
      };
  </script>
  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.6.0/dist/mermaid.min.js"></script>
  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/abcjs/6.5.2/abcjs-basic-min.js"></script>
  <style>
      html {
          background-color: ${theme.background};
      }
      body {
          margin: 0;
          background-color: ${theme.background};
          color: ${theme.text};
      }
      .markdown-body {
          box-sizing: border-box;
          min-width: 200px;
          max-width: 100%;
          width: fit-content;
          margin: 0 auto;
          padding: 45px;
          background-color: ${theme.background};
          color: ${theme.text};
      }
      .markdown-body > p,
      .markdown-body > ul,
      .markdown-body > ol,
      .markdown-body > blockquote,
      .markdown-body > h1,
      .markdown-body > h2,
      .markdown-body > h3,
      .markdown-body > h4,
      .markdown-body > h5,
      .markdown-body > h6,
      .markdown-body > pre,
      .markdown-body > table,
      .markdown-body > details,
      .markdown-body > dl,
      .markdown-body > hr {
          max-width: 980px;
          margin-left: auto !important;
          margin-right: auto !important;
      }
      /* Syntax Highlighting */
      .hljs-doctag, .hljs-keyword, .hljs-template-tag, .hljs-template-variable, .hljs-type, .hljs-variable.language_ { color: ${theme.codeKeyword}; }
      .hljs-title, .hljs-title.class_, .hljs-title.class_.inherited__, .hljs-title.function_ { color: ${theme.codeTitle}; }
      .hljs-attr, .hljs-attribute, .hljs-literal, .hljs-meta, .hljs-number, .hljs-operator, .hljs-variable, .hljs-selector-attr, .hljs-selector-class, .hljs-selector-id { color: ${theme.codeAttr}; }
      .hljs-regexp, .hljs-string, .hljs-meta .hljs-string { color: ${theme.codeRegexp}; }
      .hljs-built_in, .hljs-symbol { color: ${theme.codeBuiltin}; }
      .hljs-comment, .hljs-code, .hljs-formula { color: ${theme.codeComment}; }
      .hljs-name, .hljs-quote, .hljs-selector-tag, .hljs-selector-pseudo { color: ${theme.codeTag}; }
      .hljs-subst { color: ${theme.codeSubst}; }
      .hljs-section { color: ${theme.codeSection}; font-weight: bold; }
      .hljs-bullet { color: ${theme.codeSymbol}; }
      .hljs-emphasis { font-style: italic; }
      .hljs-strong { font-weight: bold; }
      .hljs-addition { color: ${theme.codeAddition}; background-color: ${theme.codeAdditionBackground}; }
      .hljs-deletion { color: ${theme.codeDeletion}; background-color: ${theme.codeDeletionBackground}; }
      .markdown-alert {
          padding: 0.5rem 1rem;
          margin-bottom: 16px;
          border-left: 0.25em solid;
          border-radius: 0.375rem;
      }
      .markdown-alert > :last-child {
          margin-bottom: 0;
      }
      .markdown-alert-title {
          margin: 0 0 8px;
          font-weight: 600;
          line-height: 1.25;
          display: flex;
          align-items: center;
          gap: 8px;
      }
      .markdown-alert-icon {
          display: inline-flex;
          width: 16px;
          height: 16px;
      }
      .markdown-alert-icon svg {
          width: 16px;
          height: 16px;
          fill: currentColor;
      }
      .markdown-alert-note { color: ${theme.alertNote}; border-left-color: ${theme.alertNote}; background-color: ${theme.alertNoteBackground}; }
      .markdown-alert-tip { color: ${theme.alertTip}; border-left-color: ${theme.alertTip}; background-color: ${theme.alertTipBackground}; }
      .markdown-alert-important { color: ${theme.alertImportant}; border-left-color: ${theme.alertImportant}; background-color: ${theme.alertImportantBackground}; }
      .markdown-alert-warning { color: ${theme.alertWarning}; border-left-color: ${theme.alertWarning}; background-color: ${theme.alertWarningBackground}; }
      .markdown-alert-caution { color: ${theme.alertCaution}; border-left-color: ${theme.alertCaution}; background-color: ${theme.alertCautionBackground}; }
      .markdown-alert > *:not(.markdown-alert-title) { color: ${theme.text}; }
      .frontmatter-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          font-size: 14px;
      }
      .frontmatter-table th,
      .frontmatter-table td {
          border: 1px solid ${theme.border};
          padding: 8px 12px;
          text-align: left;
      }
      .frontmatter-table th {
          font-weight: 600;
          background-color: ${theme.frontmatterHeaderBackground};
          width: 150px;
      }
      /* Footnote styles */
      .footnotes {
          margin-top: 1.5rem;
          font-size: 0.9em;
          border-top: 1px solid ${theme.border};
          padding-top: 8px;
      }
      .footnotes ol {
          padding-left: 1.5em;
      }
      .footnotes ol > li::marker {
          content: "[" counter(list-item) "] ";
          font-weight: 600;
      }
      .footnotes li > p {
          margin: 0.2em 0;
      }
      .footnote-ref a,
      .footnote-backref {
          text-decoration: none;
      }
      .footnote-backref {
          margin-left: 0.4em;
      }
      a.reference-link {
          font-size: 0.75em;
          letter-spacing: -0.02em;
          line-height: 1;
          vertical-align: super;
          position: relative;
          top: 0.08em;
      }
      /* Mermaid and Math styles */
      .mermaid-container {
          position: relative;
          margin-bottom: 16px;
      }
      .math-block {
          margin: 1em 0;
          overflow-x: auto;
          text-align: center;
      }
      .abc-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 1.5em 0;
          padding: 1.25em;
          background-color: ${theme.abcBackground};
          border: 1px solid ${theme.border};
          border-radius: 6px;
          overflow-x: auto;
      }
      .abc-notation {
          width: 100%;
      }
      .abc-notation svg {
          background: transparent !important;
          color: ${theme.text} !important;
          display: block;
          margin: 0 auto;
      }
      .abc-notation svg path {
          fill: currentColor;
      }
      .abc-notation svg text {
          fill: currentColor !important;
          stroke: none !important;
      }
      .abc-notation svg .abcjs-staff,
      .abc-notation svg .abcjs-staff-extra,
      .abc-notation svg .abcjs-bar,
      .abc-notation svg .abcjs-ledger,
      .abc-notation svg .abcjs-stem,
      .abc-notation svg .abcjs-beam,
      .abc-notation svg .abcjs-slur,
      .abc-notation svg .abcjs-tie {
          stroke: currentColor !important;
      }
      .abc-notation svg .abcjs-staff,
      .abc-notation svg .abcjs-staff-extra,
      .abc-notation svg .abcjs-ledger,
      .abc-notation svg .abcjs-slur,
      .abc-notation svg .abcjs-tie,
      .abc-notation svg .abcjs-stem {
          fill: none !important;
      }
      .abc-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
      }
      @media (max-width: 767px) {
          .markdown-body {
              padding: 15px;
          }
      }
  </style>
</head>
<body>
  <article class="markdown-body">
      ${options.bodyHtml}
  </article>
      <script>
      function fitMarkdownExportToContent() {
          var article = document.querySelector('.markdown-body');
          if (!article) return;
          article.style.width = '';
          article.style.maxWidth = '980px';
          var overflow = article.scrollWidth - article.clientWidth;
          if (overflow <= 1) return;
          var styles = window.getComputedStyle(article);
          var paddingLeft = parseFloat(styles.paddingLeft) || 0;
          var paddingRight = parseFloat(styles.paddingRight) || 0;
          var borderRight = parseFloat(styles.borderRightWidth) || 0;
          var borderLeft = parseFloat(styles.borderLeftWidth) || 0;
          var boxSizing = styles.boxSizing;
          var requiredWidth = boxSizing === 'border-box'
              ? Math.ceil(article.scrollWidth + borderLeft + borderRight)
              : Math.ceil(article.scrollWidth - paddingLeft - paddingRight);
          article.style.width = requiredWidth + 'px';
          article.style.maxWidth = 'none';
      }
      function queueMarkdownExportFit() {
          window.requestAnimationFrame(function () {
              window.requestAnimationFrame(fitMarkdownExportToContent);
          });
      }
      window.addEventListener('load', function () {
          var mathReady = Promise.resolve();
          var article = document.querySelector('.markdown-body');
          if (article && window.MutationObserver) {
              new MutationObserver(queueMarkdownExportFit).observe(article, {
                  childList: true,
                  subtree: true
              });
          }
          if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
              mathReady = window.MathJax.typesetPromise().catch(function (err) {
                  console.warn('MathJax typeset failed:', err);
              });
          }
          if (window.mermaid) {
              try {
                  window.mermaid.initialize({ startOnLoad: true, theme: '${theme.mermaidTheme}' });
              } catch (e) {
                  console.warn('Mermaid initialization failed:', e);
              }
          }
          if (window.ABCJS) {
              try {
                  var abcNodes = document.querySelectorAll('.abc-notation');
                  abcNodes.forEach(function(node) {
                      var code = decodeURIComponent(node.getAttribute('data-original-code') || '');
                      if (code) {
                          ABCJS.renderAbc(node.id, code, { responsive: 'resize' });
                      }
                      var container = node.closest('.abc-container');
                      if (container) container.classList.remove('is-loading');
                  });
              } catch (e) {
                  console.warn('ABCJS rendering failed:', e);
              }
          }
          mathReady.finally(queueMarkdownExportFit);
          queueMarkdownExportFit();
      });
      window.addEventListener('resize', queueMarkdownExportFit);
      </script>
</body>
</html>`;
}
