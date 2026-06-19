<div align="center">

  <img src="assets/icon.jpg" alt="Markdown Viewer Logo" width="100" />

  <h1>Markdown Viewer</h1>

  **A Markdown Editor That Lives in Your Browser, Desktop, and a Single URL.**

  *Fast GitHub-style Markdown editing with live preview, diagrams, LaTeX, syntax highlighting, PDF export, and multi-tab support across web, desktop, and Docker.*

  [![License](https://img.shields.io/github/license/ThisIs-Developer/Markdown-Viewer?style=flat-square&color=2ea043)](https://github.com/ThisIs-Developer/Markdown-Viewer/blob/main/LICENSE)
  [![Latest Release](https://img.shields.io/github/v/release/ThisIs-Developer/Markdown-Viewer?style=flat-square&color=3178C6)](https://github.com/ThisIs-Developer/Markdown-Viewer/releases)
  [![Last Commit](https://img.shields.io/github/last-commit/ThisIs-Developer/Markdown-Viewer?style=flat-square)](https://github.com/ThisIs-Developer/Markdown-Viewer/commits/main)
  [![Stars](https://img.shields.io/github/stars/ThisIs-Developer/Markdown-Viewer?style=flat-square&color=dfb317)](https://github.com/ThisIs-Developer/Markdown-Viewer/stargazers)

  <p>
    <a href="https://codewiki.google/github.com/thisis-developer/markdown-viewer" target="_blank" rel="noopener noreferrer">
      <img src="https://img.shields.io/badge/CodeWiki-Explore-4285F4?logo=wikipedia&logoColor=white&style=flat" alt="CodeWiki" />
    </a>
    <a href="https://deepwiki.com/ThisIs-Developer/Markdown-Viewer" target="_blank" rel="noopener noreferrer">
      <img src="https://deepwiki.com/badge.svg" alt="DeepWiki" />
    </a>
    <a href="https://oosmetrics.com/repo/ThisIs-Developer/Markdown-Viewer" target="_blank" rel="noopener noreferrer">
      <img src="https://api.oosmetrics.com/api/v1/badge/achievement/b13c27be-447e-489d-a04d-55f7ccaf9175.svg" alt="OOSMetrics" />
    </a>
  </p>

  🌐 **English** • <a href="wiki/Localization#zh-cn">简体中文</a> • <a href="wiki/Localization#ja">日本語</a> • <a href="wiki/Localization#ko">한국어</a> • <a href="wiki/Localization#pt-br">Português (Brasil)</a>

  [Live Production Demo](https://markdownviewer.pages.dev/) • [Documentation Wiki](wiki/Home) • [Issue Tracker](https://github.com/ThisIs-Developer/Markdown-Viewer/issues) • [Releases](https://github.com/ThisIs-Developer/Markdown-Viewer/releases)

</div>

<p align="center">
  <img src="https://github.com/user-attachments/assets/7f4af5d3-ecae-47ac-9f27-2f91e4a6d866" alt="Markdown Viewer - Live split-screen Markdown editor and previewer with GFM rendering, tabbed multi-document workspace, and dark theme support" width="100%" />
</p>


## Table of Contents

<details>
  <summary>📂 <b>Table of Contents</b> (Click to expand)</summary>
  <br />

  - [About the Project](#about-the-project)
  - [Key Features](#key-features)
  - [System Architecture](#system-architecture)
    - [High-Level Architecture Diagram](#high-level-architecture-diagram)
    - [Core File Walkthrough](#core-file-walkthrough)
  - [Getting Started & Installation](#getting-started--installation)
  - [Usage Guide & Keyboard Shortcuts](#usage-guide--keyboard-shortcuts)
  - [Project Directory Structure](#project-directory-structure)
  - [Built With (Technology Stack)](#built-with-technology-stack)
  - [Contributing & Code Quality](#contributing--code-quality)
  - [Showcase & Community Projects](#showcase--community-projects)
  - [Contributors](#contributors)
  - [📈 Development Journey](#-development-journey)
  - [License](#license)
  - [Contact & Support](#contact--support)
</details>

---

## About the Project

**Markdown Viewer** is an advanced, fully client-side editing suite and previewer optimized for a professional documentation workflow. Running completely inside the browser, it renders GitHub-Flavored Markdown (GFM), math formulas, and architectural diagrams in real time. 

Designed with privacy and performance at its core, the application performs all parsing in a background worker thread, employs incremental DOM patching to minimize browser repaints, and supports native offline capabilities via a Service Worker proxy. It is also packaged as a lightweight native desktop shell using the Neutralinojs framework.

---

## Key Features

### 🖊️ Decoupled Split-Screen Editing
Type Markdown in the custom editor and watch it render in real-time in the live preview pane.
<p align="center">
  <img src="assets/live-peview.gif" alt="Decoupled Split-Screen Editing" width="90%" />
</p>

### 📐 LaTeX Math Notation
Render inline and display mathematical formulas natively using the MathJax typesetting engine.
<p align="center">
  <img src="https://github.com/user-attachments/assets/51831f45-33e8-4788-b9ad-b239a929a2e4" alt="LaTeX Math Notation" width="90%" />
</p>

### 📊 Interactive Mermaid Diagrams
Generate flowcharts, Gantt charts, and sequence diagrams with zoom, pan, and SVG export controls.
<p align="center">
  <img src="https://github.com/user-attachments/assets/da00943c-d00a-4b76-96e9-d7bc1bb7f86c" alt="Interactive Mermaid Diagrams" width="90%" />
  <img src="https://github.com/user-attachments/assets/3995e614-ffff-4cc0-843d-af73d840ca86" alt="Mermaid Toolbar" width="90%" />
</p>

### 🗺️ Interactive Map Renderers
Parse and visualize GeoJSON and TopoJSON map files directly inside your preview area.
<p align="center">
  <img src="assets/features/map-renderer.png" alt="Interactive Map Renderers" width="90%" />
</p>

### 📦 STL 3D Model Renderer
Render and interact with STL (ASCII/Binary) files featuring perspective controls, flat shading, and reset controls.
<p align="center">
  <img src="assets/features/stl-renderer.png" alt="STL 3D Model Renderer" width="90%" />
</p>

### 🎼 ABC Music Notation Renderers
Render client-side ABC music notation directly to beautifully styled SVG sheet music with full offline rendering support.
<p align="center">
  <img src="assets/features/abc-music-notation.png" alt="ABC Music Notation Renderers" width="90%" />
</p>

### 📑 Multi-Document Tab Workspace
Organize multiple open files inside drag-and-drop tabs with local session persistence and tab context menus.
<p align="center">
  <img src="assets/features/tabs-workspace.png" alt="Multi-Document Tab Workspace" width="90%" />
</p>

### 🔍 Find & Replace with AST Scoping & Diff Preview
Perform scoped searches using regular expressions, syntax scopes, and side-by-side visual diff replacements.
<p align="center">
  <img src="https://github.com/user-attachments/assets/b4314cf0-8059-40f1-a445-9d24f00a23b0" alt="Find & Replace with Diff Preview" width="90%" />
</p>

### 🛠️ Formatting Toolbar & Quick Modals
Quickly insert markdown elements, tables, emojis, and symbols using dedicated formatting toolbar modals.
<p align="center">
  <img src="assets/features/formatting-toolbar.png" alt="Formatting Toolbar & Quick Modals" width="90%" />
</p>

### 🌐 Multi-Language Translation (i18n)
Access a fully localized user interface with support for English, Simplified Chinese, Japanese, Korean, Portuguese, and more.
<p align="center">
  <img src="assets/features/i18n.png" alt="Multi-Language Translation (i18n)" width="90%" />
</p>

### 📤 Layout-Aware PDF, HTML & PNG Export
Export your documents to raw Markdown, centered inline HTML, high-quality PNG images, or paginated PDF with re-engineered page breaks.
<p align="center">
  <img src="assets/features/pdf-export.png" alt="Layout-Aware PDF, HTML & PNG Export" width="90%" />
</p>

### 🔗 Serverless Compressed URL Sharing
Share view or edit mode documents database-free via zlib DEFLATE compressed URL hashes.
<p align="center">
  <img src="https://github.com/user-attachments/assets/10957066-4bc5-4b7d-9dc0-c28b7fc61a7e" alt="Serverless Compressed URL Sharing" width="90%" />
</p>

### 📥 Multi-Source File Import
Drag and drop local files, or import directories recursively directly from public GitHub repositories.
<p align="center">
  <img src="https://github.com/user-attachments/assets/6edbfde9-82a8-472a-a2b5-d06ffb63bcea" alt="Multi-Source File Import" width="90%" />
  <img src="https://github.com/user-attachments/assets/cba06ce4-a13b-4c4b-bc70-6d53a24a8f0f" alt="File Import selection" width="90%" />
</p>

### ⚡ Performance & Web Worker Compilation
Compile Markdown off-thread using a background Web Worker and cache gutter wrapping coordinates to avoid layout thrashing.
<p align="center">
  <img src="assets/features/performance.png" alt="Performance & Web Worker Compilation" width="90%" />
</p>

### 🔒 Security Hardening & PWA Offline Support
Work offline via local Service Worker caching, protected by SHA-384 subresource integrity check policies.
<p align="center">
  <img src="assets/features/security-offline.png" alt="Security Hardening & PWA Offline Support" width="90%" />
</p>

### 📝 GitHub-Style Alert Blocks
Format and render official GitHub-style admonitions (`> [!NOTE]`, etc.) with correct color schemes and icons.
<p align="center">
  <img src="assets/features/alerts.png" alt="GitHub-Style Alert Blocks" width="90%" />
</p>

### 📊 Estimated Reading Time & Word Stats
Track word count, character count, and estimated reading time dynamically via a live status counter.
<p align="center">
  <img src="assets/features/reading-stats.png" alt="Estimated Reading Time & Word Stats" width="90%" />
</p>

### 🎨 Custom Theme Toggle
Switch instantly between light and dark themes with CSS-variable based syntax highlighting.
<p align="center">
  <img src="assets/features/theme-toggle.png" alt="Custom Theme Toggle" width="90%" />
</p>

### ↩️ Custom History State (Undo/Redo)
Restore and redo editor history individually per document tab using custom-built in-memory history state stacks.
<p align="center">
  <img src="assets/features/undo-redo.png" alt="Custom History State (Undo/Redo)" width="90%" />
</p>

### ⌨️ Comprehensive Keyboard Shortcuts
Increase typing efficiency with native keybinds for file saving, sync scrolling, tab management, and text editing.
<p align="center">
  <img src="assets/features/keyboard-shortcuts.png" alt="Comprehensive Keyboard Shortcuts" width="90%" />
</p>

### 📂 Full-Window Drag-and-Drop Overlay
Drag markdown files anywhere onto the browser window to instantly import and open them in the workspace.
<p align="center">
  <img src="assets/features/drag-and-drop.png" alt="Full-Window Drag-and-Drop Overlay" width="90%" />
</p>

### 🧭 Throttled Bidirectional Scroll Sync
Keep the editor and preview pane aligned using scroll lock mechanisms and requestAnimationFrame coordinates mapping.
<p align="center">
  <img src="assets/features/scroll-sync.png" alt="Throttled Bidirectional Scroll Sync" width="90%" />
</p>

---

## System Architecture

Markdown Viewer is structured as a client-side single-page application (SPA). The diagram below outlines how the UI thread, background worker, service worker, browser cache, native desktop bridges, and third-party libraries interact.

### High-Level Architecture Diagram

```mermaid
graph TD
    %% Client Interface Group
    subgraph UI ["Client Interface (Main Thread)"]
        HTML["index.html<br>(DOM Tree)"]
        CSS["styles.css<br>(Custom Themes & Reset)"]
        Script["script.js<br>(UI Orchestration)"]
        Editor["Markdown Editor<br>(Textarea + Gutter)"]
        Preview["Preview Pane<br>(Direct DOM Render Area)"]
        Modal["Mermaid Modal<br>(Zoom & Drag-to-Pan)"]
        i18n["i18n Localization Engine<br>(Dictionary translation)"]
        DOMPurify["DOMPurify.js<br>(Strict XSS Sanitizer)"]
    end

    %% Background Web Worker Group
    subgraph Worker ["Web Worker (Background Thread)"]
        PWorker["preview-worker.js<br>(Off-Thread Compiler)"]
        MarkedLib["Marked.js<br>(GFM Parser)"]
        HljsLib["Highlight.js<br>(Syntax Color)"]
    end

    %% Storage Group
    subgraph Storage ["Local Storage & Network Proxy"]
        LS["localStorage<br>(Tabs, Settings, Shadow Cache)"]
        Cache["Browser Cache<br>(Service Worker sw.js)"]
        LocalAssets["Local Static Assets<br>(Icons, sample.md, manifest)"]
    end

    %% Third-Party Utilities
    subgraph CDNs ["Third-Party CDN Libraries (Lazy Loaded / Local Offline Mapped)"]
        MathJax["MathJax.js<br>(LaTeX Math)"]
        Mermaid["Mermaid.js<br>(Diagrams)"]
        PDF["jsPDF & html2canvas<br>(PDF/PNG Export)"]
        Pako["Pako.js<br>(DEFLATE share encoder)"]
        JoyPixels["JoyPixels.js/css<br>(Emoji Tool)"]
        Leaflet["Leaflet.js/css & TopoJSON<br>(Interactive Maps)"]
        ThreeJS["Three.js, loaders & controls<br>(3D STL Viewer)"]
        Abcjs["abcjs-basic.js<br>(Sheet Music)"]
    end

    %% Native Desktop Layer
    subgraph Desktop ["NeutralinoJS Desktop Shell"]
        Neu["Neutralino.js Bridge<br>(Native File System APIs)"]
    end

    %% Interactions
    Editor -- "1. Input Keystrokes" --> Script
    Script -- "2. Size-Aware Debounced Text" --> PWorker
    PWorker -- "3. Load Scripts" --> MarkedLib
    PWorker -- "3. Load Scripts" --> HljsLib
    PWorker -- "4. Returns Compiled HTML Blocks & Hashes" --> Script
    Script -- "5. Sanitize HTML segments" --> DOMPurify
    DOMPurify -- "6. Incremental Patching / Full Fallback" --> Preview
    Script -- "7. Debounced State Auto-Save" --> LS
    LS -. "Shadow Cache Sync" .-> Script
    
    %% Scroll sync loop
    Editor -- "Proportional Scroll Sync (RAF)" --> Preview
    Preview -- "Proportional Scroll Sync (RAF)" --> Editor
    
    %% Dynamic Loading triggers
    Script -- "Lazy Load (Math string detected)" --> MathJax
    Script -- "Lazy Load (Mermaid class detected)" --> Mermaid
    Script -- "Lazy Load (On Export click)" --> PDF
    Script -- "Lazy Load (On Share click/hash load)" --> Pako
    Script -- "Lazy Load (Colons detected)" --> JoyPixels
    Script -- "Lazy Load (geo/topojson map class)" --> Leaflet
    Script -- "Lazy Load (stl-viewer class)" --> ThreeJS
    Script -- "Lazy Load (abc music class)" --> Abcjs
    
    %% Downstream Rendering outputs
    MathJax -- "Inject Math formulas" --> Preview
    Mermaid -- "Draw SVGs + Toolbars" --> Preview
    Preview -- "Click toolbar Zoom button" --> Modal
    PDF -- "Capture sandboxed canvas (useCORS)" --> Script
    JoyPixels -- "Render emojis" --> Preview
    Leaflet -- "Render interactive maps" --> Preview
    ThreeJS -- "Render 3D STL model" --> Preview
    Abcjs -- "Render sheet music" --> Preview
    
    %% Network Proxy Caching
    Cache -. "Network-First (App Assets)" .-> HTML
    Cache -. "Network-First (App Assets)" .-> Script
    Cache -. "Network-First (App Assets)" .-> CSS
    Cache -. "Network-First (App Assets)" .-> PWorker
    Cache -. "Network-First (App Assets)" .-> sw.js
    Cache -. "Stale-While-Revalidate" .-> LocalAssets
    Cache -. "Cache-First (Lazy-loaded assets)" .-> CDNs
    
    %% Desktop Logic
    Script -- "Redirect CDNs to /libs/ offline copies" --> Script
    Script -- "Access OS API if wrapped" --> Neu
```

### Core File Walkthrough

1.  **`index.html`**: Establishes layout structures, floating panel anchors, and imports CSS files alongside core scripts using defer hooks. It keeps the default fallback markdown inside a `<script type="text/markdown" id="default-markdown">` element.
2.  **`script.js`**: Operates as the central controller on the main UI thread. It tracks active tab states, drives the split resizing loops, handles drag-and-drop file imports, coordinates communication with the preview Web Worker, manages the multi-pass PDF layout engine, and applies language mappings.
3.  **`styles.css`**: Configures variables for Light/Dark themes, handles layout spacing, aligns the line number gutter visually with the text editor area, and provides theme stylings for code fences.
4.  **`preview-worker.js`**: Operates on a background thread. It parses large text structures, calculates hashes for each section, compiles Markdown to HTML using `marked.js`, applies syntax highlighting via `highlight.js`, and posts parsed output back to the main UI thread.
5.  **`sw.js`**: A Service Worker serving as a local network proxy. It intercepts requests to cache static files on the client's device, enabling the application to run offline.

---

## Getting Started & Installation

### 💻 Option 1: Quick Local Run (No Installation/No Server)
Because Markdown Viewer runs completely client-side utilizing standard HTML, CSS, and JavaScript, you can run it instantly directly from your filesystem:
1. Clone or download the repository to your local machine.
2. Open the repository folder in your system **File Manager**.
3. Simply double-click **`index.html`** to open the editor directly in your default web browser.

---

### 🐳 Option 2: Docker Container Deployment
If you prefer running the application inside a containerized environment, choose one of the following methods:

**Pre-built Docker Image (GHCR):**
```bash
docker run -d \
  --name markdown-viewer \
  -p 8080:80 \
  --restart unless-stopped \
  ghcr.io/thisis-developer/markdown-viewer:latest
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

**Local Docker Compose Build:**
```bash
git clone https://github.com/ThisIs-Developer/Markdown-Viewer.git
cd Markdown-Viewer
docker compose up -d
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

---

### 🖥️ Option 3: Building the Desktop Application
You can compile and run a native standalone desktop app (Windows, macOS, or Linux) locally from source:
1. Clone the repository and navigate into the `desktop-app/` directory:
   ```bash
   cd desktop-app
   ```
2. Open the `desktop-app` directory in your system **File Manager**.
3. Open a command prompt/terminal inside this folder and run the installation and build commands:
   ```powershell
   # Install node dependencies and download Neutralino binaries
   npm install
   node setup-binaries.js

   # Synchronize resources with the main web app
   node prepare.js

   # Build/compile the application for Windows and other systems
   npm run build
   # Or build a standalone portable executable
   npm run build:portable
   ```

*Note: You can also download prebuilt standalone binaries directly from the [Releases](https://github.com/ThisIs-Developer/Markdown-Viewer/releases) page without compiling it yourself.*

---

## Usage Guide & Keyboard Shortcuts

1.  **Write Markdown** in the left editor pane.
2.  **Toggle Split/Editor/Preview** modes using the view controls in the top toolbar.
3.  **Insert elements** (tables, images, checklists, alerts) using the Markdown formatting toolbar.
4.  **Save or export** your files using the Export dropdown.

### Keyboard Shortcuts Reference

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Export raw Markdown** | `Ctrl + S` | `⌘ + S` |
| **Copy plain text Markdown** | `Ctrl + C` (with no text selected) | `⌘ + C` (with no text selected) |
| **Toggle Scroll Sync** | `Ctrl + Shift + S` (in Split view) | `⌘ + Shift + S` (in Split view) |
| **Open a New Tab** | `Ctrl + T` (desktop) / `Alt + Shift + T` (web) | `⌘ + T` (desktop) / `⌥ + ⇧ + T` (web) |
| **Close the Active Tab** | `Ctrl + W` (desktop) / `Alt + Shift + W` (web) | `⌘ + W` (desktop) / `⌥ + ⇧ + W` (web) |
| **Open Find & Replace** | `Ctrl + F` / `Ctrl + H` (replace) | `⌘ + F` / `⌘ + H` (replace) |
| **Undo Last Edit** | `Ctrl + Z` (when editor active) | `⌘ + Z` (when editor active) |
| **Redo Last Edit** | `Ctrl + Shift + Z` / `Ctrl + Y` | `⌘ + Shift + Z` / `⌘ + Y` |
| **Insert 2-space Indent** | `Tab` (when editor active) | `Tab` (when editor active) |


---

## Project Directory Structure

```
Markdown-Viewer/
├── index.html              # Core application DOM structure & CDN scripts
├── script.js               # Main thread controller, state orchestrator, scroll sync
├── preview-worker.js       # Background web worker for Markdown compilation
├── styles.css              # Theme stylesheets, layout grids, print layouts
├── sw.js                   # Progressive Web App (PWA) offline Service Worker
├── Dockerfile              # Production Nginx Docker configuration
├── docker-compose.yml      # Port mappings and local Compose orchestrator
├── README.md               # Main repository readme
├── LICENSE                 # Apache 2.0 license file
├── assets/                 # Image assets, gifs, and screenshots
├── wiki/                   # Markdown documentation pages for GitHub Wiki
└── desktop-app/            # Native Neutralinojs desktop configuration & binaries
    ├── package.json        # Node packaging and scripts
    ├── neutralino.config.json # Neutralino runtime configuration
    ├── prepare.js          # Synchronizes root web files with desktop workspace
    └── resources/          # Copied workspace assets compiled into desktop app
```

---

## Built With (Technology Stack)

<p align="left">
  <a href="https://developer.mozilla.org/en-US/docs/Web/HTML"><img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5" /></a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/CSS"><img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3" /></a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript"><img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" /></a>
  <a href="https://getbootstrap.com"><img src="https://img.shields.io/badge/Bootstrap-7952B3?style=flat-square&logo=bootstrap&logoColor=white" alt="Bootstrap" /></a>
  <a href="https://neutralino.js.org"><img src="https://img.shields.io/badge/NeutralinoJS-FFA500?style=flat-square&logo=neutralinojs&logoColor=white" alt="NeutralinoJS" /></a>
</p>

| Library Name | Version | Role in App | Loading Method |
| :--- | :--- | :--- | :--- |
| **[Marked.js](https://marked.js.org/)** | 9.1.6 | Parses markdown content to HTML elements. | Defer (Upfront) |
| **[Highlight.js](https://highlightjs.org/)** | 11.9.0 | Adds syntax highlighting to code sections. | Defer (Upfront) |
| **[DOMPurify](https://github.com/cure53/DOMPurify)** | 3.0.9 | Sanitizes HTML outputs against XSS. | Defer (Upfront) |
| **[FileSaver.js](https://github.com/eligrey/FileSaver.js/)** | 2.0.5 | Manages file saving on the client side. | Defer (Upfront) |
| **[js-yaml](https://github.com/nodeca/js-yaml)** | 4.1.0 | Parses YAML frontmatter headers. | Defer (Upfront) |
| **[Bootstrap](https://getbootstrap.com)** | 5.3.2 | Provides component structures and modal panels. | Upfront Script |
| **[Bootstrap Icons](https://icons.getbootstrap.com/)** | 1.11.3 | Provides responsive vector symbols across formatting tools and headers. | Preloaded (Upfront) |
| **[GitHub Markdown CSS](https://github.com/sindresorhus/github-markdown-css)** | 5.3.0 | Matches GitHub's exact light and dark typography rendering styles. | Upfront / Exports |
| **[Mermaid.js](https://mermaid.js.org/)** | 11.15.0 | Renders interactive flowcharts and diagrams. | Lazy-loaded on diagram find |
| **[MathJax](https://www.mathjax.org/)** | 3.2.2 | Renders mathematical LaTeX expressions. | Lazy-loaded on math find |
| **[jsPDF](https://github.com/parallax/jsPDF)** | 2.5.1 | Generates paginated PDF documents client-side. | Lazy-loaded on PDF request |
| **[html2canvas](https://html2canvas.hertzen.com/)** | 1.4.1 | Captures HTML layouts as canvas objects. | Lazy-loaded on PDF request |
| **[pako.js](https://github.com/nodeca/pako)** | 2.1.0 | Handles DEFLATE compression for share links. | Lazy-loaded on share request |
| **[JoyPixels](https://www.joypixels.com/)** | 9.0.1 | Renders standard emoji sets. | Lazy-loaded on emoji select |
| **[Leaflet](https://leafletjs.com/)** | 1.9.4 | Powers interactive GeoJSON and TopoJSON map overlays. | Lazy-loaded on map detection |
| **[TopoJSON](https://github.com/topojson/topojson)** | 3.0.2 | Parses TopoJSON structures into standard GeoJSON coordinates. | Lazy-loaded on topojson detection |
| **[Three.js](https://threejs.org/)** | r128 | Renders STL 3D models with canvas viewports. | Lazy-loaded on STL file detection |
| **[ABC Music Notation (abcjs)](https://www.abcjs.net/)** | 6.5.2 | Renders sheet music notation from raw text definitions. | Lazy-loaded on abc music detection |

---

## Contributing & Code Quality

We welcome community contributions! Please check our [Contributing Guidelines Wiki](wiki/Contributing) before creating a pull request.

### Core Workflow Summary:
1.  **Fork** the repository and create a feature branch (`git checkout -b feature/your-feature`).
2.  **Verify Code Style:** Maintain a clean 2-space indentation style across HTML, CSS, and JS files. Ensure raw HTML structures are semantic. Avoid direct DOM queries inside processing workers.
3.  **Conventional Commits:** Write clear commit messages prefixed with `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, or `chore:`.
4.  **Testing:** Test your revisions across Chrome, Firefox, Edge, and Safari viewports.

---

## Showcase & Community Projects

*   **[Markdown Desk](https://github.com/jhrepo/markdown-desk):** A native macOS wrapper built using Tauri that adds native file-system handlers, menu bar integration, and auto-reload capabilities.

---

## Contributors

Thanks to everyone who has contributed to Markdown Viewer.

<a href="https://github.com/ThisIs-Developer/Markdown-Viewer/graphs/contributors" target="_blank" rel="noopener noreferrer">
  <img src="https://contrib.rocks/image?repo=ThisIs-Developer/Markdown-Viewer" alt="Contributors" />
</a>

---

## 📈 Development Journey

Markdown Viewer has grown from a lightweight Markdown parser into a full-featured, professional application with advanced rendering, workflow, and export capabilities. Compare the <a href="https://markdownviewer.pages.dev/" target="_blank" rel="noopener noreferrer">current version</a> with the <a href="https://a1b91221.markdownviewer.pages.dev/" target="_blank" rel="noopener noreferrer">original version</a> to see the progress in UI design, performance optimization, and feature depth.

---

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for the complete terms and conditions.

---

## Contact & Support

Developed and maintained by **[ThisIs-Developer](https://github.com/ThisIs-Developer)**.
*   **Bug Reports & Requests:** [Submit an Issue](https://github.com/ThisIs-Developer/Markdown-Viewer/issues)
*   **Documentation:** [Browse the Wiki](wiki/Home)
