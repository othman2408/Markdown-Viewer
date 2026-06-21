# Markdown Viewer Workspace Rules

These guidelines are based on the competitive analysis, promotion strategies, and repository audits. They apply to all development, styling, and packaging tasks in this workspace.

---

## 1. Project Identity & Key Benchmarks
* **Differentiator**: Privacy-preserving, client-side preview tool positioned as a **"Technical Markdown Workstation"** (capable of rendering diagrams, math, spatial maps, music notation, and 3D STL models).
* **Competitor Standards**:
  * **MarkText (MIT)**: Next.js website SEO layouts, docs sitemaps, Muya editor engine.
  * **Markdown Preview Enhanced (NCSA)**: Extensible Kroki, TikZ, D2 settings integration.
  * **MarkView (MIT)**: Solid PWA configuration, sitemap/robots, clean CI workflows.
  * **Markdown Viewer Extension (GPL-3.0)**: Outcome-driven README positioning and platform matrices.

---

## 2. Codebase Architecture Constraints
* **Avoid Monolithic Files**: Do not add new features directly to [script.js](file:///c:/Users/User/Desktop/Markdown-Viewer/script.js) or [styles.css](file:///c:/Users/User/Desktop/Markdown-Viewer/styles.css) if they can be modularized.
* **Renderer Isolation**: Wrap custom code-block handlers (e.g., STL, GeoJSON, TopoJSON, ABC music notation, Mermaid, MathJax) in pluggable ES modules or isolated modules where possible.
* **Desktop Synchronization**: Always ensure desktop app assets are derived from or synchronized with the main web application root. Modify [prepare.js](file:///c:/Users/User/Desktop/Markdown-Viewer/desktop-app/prepare.js) to keep packages aligned.

---

## 3. SEO & Metadata Standards
* **High-Intent Pages**: Target the sitemap and HTML routing toward intent paths like `/markdown-viewer`, `/markdown-to-html`, `/markdown-to-pdf`, `/github-readme-preview`, etc.
* **Keyword Optimization**: Keep title tags, meta descriptions, and repository topics aligned with the keyword set:
  * `markdown viewer`
  * `markdown editor with live preview`
  * `github style markdown viewer`
  * `secure client side markdown viewer`
  * `markdown geojson viewer`
  * `markdown stl viewer`
* **Clean Sitemap & Robots.txt**: Maintain search crawlability rules. Never allow invalid/dynamic pastes to be indexed.

---

## 4. Licensing Constraints & Reuse Cautions
* **Safe to Reuse**: Permissive MIT-licensed or NCSA-licensed patterns from MarkView, MarkText, and MPE (e.g., layout metadata, vercel/Vite deployment assets, package settings configurations).
* **Direct Copying Prohibition**: Never copy code or assets directly from GPL-3.0 licensed repos like the Markdown Viewer Extension. Reuse only the marketing structure/positioning concepts.

---

## 5. Reference Materials
* Detailed memorization index: [markdown_viewer_audit_memorization.md](file:///C:/Users/User/.gemini/antigravity/brain/6c41cf59-aa56-4400-aab1-7864b03051cf/markdown_viewer_audit_memorization.md)
