// Preserves the default document text while keeping the Svelte component parse-safe.
const advancedRendererShowcase = String.raw`
## Advanced Renderer Gallery

These examples cover the rich preview blocks supported by this editor: music notation, 3D models, maps, remote diagram engines, and Mermaid chart types.

### ABC Music Player and Sheet Music Viewer

The ABC block renders sheet music and adds playback/export controls.

~~~abc
X:1
T:Simple Reel
M:4/4
L:1/8
K:D
|: d2 fd A2 FA | d2 fd e2 ce | d2 fd A2 FA | B2 AF E2 D2 :|
~~~

### STL 3D Model Renderer

The STL block renders ASCII STL geometry with solid, angle, wireframe, zoom, copy, and PNG controls.

~~~stl
solid tetrahedron
  facet normal 0 0 1
    outer loop
      vertex 0 0 1
      vertex -1 -1 0
      vertex 1 -1 0
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 0 0 1
      vertex 1 -1 0
      vertex 1 1 0
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 0 1
      vertex 1 1 0
      vertex -1 1 0
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 1
      vertex -1 1 0
      vertex -1 -1 0
    endloop
  endfacet
endsolid tetrahedron
~~~

### Interactive GeoJSON Map

GeoJSON blocks render Leaflet maps with themed tiles and feature popups.

~~~geojson
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Doha",
        "kind": "Workspace location"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [51.531, 25.286]
      }
    }
  ]
}
~~~

### Interactive TopoJSON Map

TopoJSON blocks are converted to GeoJSON before rendering.

~~~topojson
{
  "type": "Topology",
  "objects": {
    "places": {
      "type": "GeometryCollection",
      "geometries": [
        {
          "type": "Point",
          "coordinates": [51.531, 25.286],
          "properties": {
            "name": "Doha marker"
          }
        }
      ]
    }
  }
}
~~~

### PlantUML

PlantUML blocks render through the PlantUML server and include export controls.

~~~plantuml
@startuml
actor User
rectangle "Markdown Viewer" {
  User --> (Write Markdown)
  (Write Markdown) --> (Live Preview)
  (Live Preview) --> (Share Document)
}
database "Postgres" as DB
cloud "Cloudflare R2" as R2
(Share Document) --> DB
(Share Document) --> R2
@enduml
~~~

### D2 Diagram

D2 blocks render through Kroki.

~~~d2
direction: right
user: User
editor: Markdown Viewer
db: Postgres
r2: Cloudflare R2

user -> editor: writes markdown
editor -> db: saves workspace
editor -> r2: stores uploaded assets
editor -> user: live preview
~~~

### Graphviz / DOT

Graphviz and DOT blocks render directed graphs through Kroki.

~~~graphviz
digraph MarkdownViewer {
  rankdir=LR;
  node [shape=box, style="rounded"];
  Markdown -> Preview -> Export;
  Markdown -> Share;
  Share -> Postgres;
  Share -> R2;
}
~~~

### Mermaid Entity Relationship Diagram

~~~mermaid
erDiagram
    USER ||--|| WORKSPACE : owns
    USER ||--o{ DOCUMENT : writes
    DOCUMENT ||--o{ ASSET : embeds
    DOCUMENT ||--o{ SHARE : publishes
~~~

### Mermaid Class Diagram

~~~mermaid
classDiagram
    class Editor {
      +writeMarkdown()
      +saveWorkspace()
    }
    class Preview {
      +renderMarkdown()
      +syncScroll()
    }
    Editor --> Preview
~~~

### Mermaid State Diagram

~~~mermaid
stateDiagram-v2
    [*] --> Editing
    Editing --> Previewing: render
    Previewing --> Sharing: create link
    Sharing --> Editing: continue
~~~

### Mermaid Gantt Chart

~~~mermaid
gantt
    title Cloud Markdown Viewer Roadmap
    dateFormat  YYYY-MM-DD
    section Build
    Auth UI           :done,    auth, 2026-06-01, 2d
    Svelte Shell      :active,  ui,   2026-06-03, 4d
    Cloud Storage     :         db,   2026-06-07, 3d
~~~

### Mermaid Pie Chart

~~~mermaid
pie title Document Content Mix
    "Markdown" : 45
    "Diagrams" : 25
    "Math" : 15
    "Assets" : 15
~~~

### Mermaid User Journey

~~~mermaid
journey
    title Writing and sharing a document
    section Draft
      Write markdown: 5: User
      Preview result: 4: User
    section Publish
      Upload assets: 4: User
      Share link: 5: User
~~~

### Mermaid Git Graph

~~~mermaid
gitGraph
   commit id: "start"
   branch cloud
   checkout cloud
   commit id: "auth"
   commit id: "storage"
   checkout main
   merge cloud
~~~

### Mermaid Mind Map

~~~mermaid
mindmap
  root((Markdown Viewer))
    Writing
      Markdown
      Tables
      Math
    Rendering
      Mermaid
      PlantUML
      D2
      Graphviz
    Cloud
      Postgres
      R2
      Shares
~~~

### Mermaid Timeline

~~~mermaid
timeline
    title App Evolution
    Local App : Browser storage
    Cloud App : Auth : Postgres : R2
    Svelte App : Components : Stores : Express API
~~~

### Mermaid Quadrant Chart

~~~mermaid
quadrantChart
    title Feature priority
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    quadrant-1 Schedule
    quadrant-2 Plan carefully
    quadrant-3 Skip
    quadrant-4 Ship first
    Auth: [0.35, 0.85]
    Export: [0.65, 0.75]
    Theme polish: [0.25, 0.45]
~~~

### Mermaid XY Chart

~~~mermaid
xychart-beta
    title "Documents rendered"
    x-axis ["Mon", "Tue", "Wed", "Thu", "Fri"]
    y-axis "Documents" 0 --> 100
    bar [20, 35, 55, 70, 90]
    line [15, 30, 45, 65, 85]
~~~

### Mermaid Sankey Chart

~~~mermaid
sankey-beta
  Markdown,Preview,70
  Preview,Export,30
  Preview,Share,25
  Share,Postgres,15
  Share,R2,10
~~~

### Math Code Fence

~~~math
\int_0^1 x^2\,dx = \frac{1}{3}
~~~
`.trim();

export const defaultMarkdownLines = [
  "---",
  "title: Welcome to Markdown Viewer",
  "description: A GitHub-style Markdown renderer with live preview, math, diagrams, and export support.",
  "author: Personal",
  "tags: [\"markdown\", \"preview\", \"mermaid\", \"latex\", \"personal\"]",
  "---",
  "",
  "# Welcome to Markdown Viewer",
  "",
  "## ✨ Key Features",
  "- **Live Preview** with GitHub styling",
  "- **Smart Import/Export** (MD, HTML, PDF)",
  "- **Mermaid Diagrams** for visual documentation",
  "- **LaTeX Math Support** for scientific notation",
  "- **Emoji Support** 😄 👍 🎉",
  "",
  "## 💻 Code with Syntax Highlighting",
  "```javascript",
  "  function renderMarkdown() {",
  "    const markdown = markdownEditor.value;",
  "    const html = marked.parse(markdown);",
  "    const sanitizedHtml = DOMPurify.sanitize(html);",
  "    markdownPreview.innerHTML = sanitizedHtml;",
  "    ",
  "    // Syntax highlighting is handled automatically",
  "    // during the parsing phase by the marked renderer.",
  "    // Themes are applied instantly via CSS variables.",
  "  }",
  "```",
  "",
  "## 🧮 Mathematical Expressions",
  "Write complex formulas with LaTeX syntax:",
  "",
  "Inline equation: $$E = mc^2$$",
  "",
  "Display equations:",
  "$$\\frac{\\partial f}{\\partial x} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$",
  "",
  "$$\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}$$",
  "",
  "## 📊 Mermaid Diagrams",
  "Create powerful visualizations directly in markdown:",
  "",
  "```mermaid",
  "flowchart LR",
  "    A[Start] --> B{Is it working?}",
  "    B -->|Yes| C[Great!]",
  "    B -->|No| D[Debug]",
  "    C --> E[Deploy]",
  "    D --> B",
  "```",
  "",
  "### Sequence Diagram Example",
  "```mermaid",
  "sequenceDiagram",
  "    User->>Editor: Type markdown",
  "    Editor->>Preview: Render content",
  "    User->>Editor: Make changes",
  "    Editor->>Preview: Update rendering",
  "    User->>Export: Save as PDF",
  "```",
  "",
  "## 📋 Task Management",
  "- [x] Create responsive layout",
  "- [x] Implement live preview with GitHub styling",
  "- [x] Add syntax highlighting for code blocks",
  "- [x] Support math expressions with LaTeX",
  "- [x] Enable mermaid diagrams",
  "",
  "## 🆚 Feature Comparison",
  "",
  "| Feature                  | Markdown Viewer (Ours) | Other Markdown Editors  |",
  "|:-------------------------|:----------------------:|:-----------------------:|",
  "| Live Preview             | ✅ GitHub-Styled       | ✅                     |",
  "| Sync Scrolling           | ✅ Two-way             | 🔄 Partial/None        |",
  "| Mermaid Support          | ✅                     | ❌/Limited             |",
  "| LaTeX Math Rendering     | ✅                     | ❌/Limited             |",
  "",
  "### 📝 Multi-row Headers Support",
  "",
  "<table>",
  "  <thead>",
  "    <tr>",
  "      <th rowspan=\"2\">Document Type</th>",
  "      <th colspan=\"2\">Support</th>",
  "    </tr>",
  "    <tr>",
  "      <th>Markdown Viewer (Ours)</th>",
  "      <th>Other Markdown Editors</th>",
  "    </tr>",
  "  </thead>",
  "  <tbody>",
  "    <tr>",
  "      <td>Technical Docs</td>",
  "      <td>Full + Diagrams</td>",
  "      <td>Limited/Basic</td>",
  "    </tr>",
  "    <tr>",
  "      <td>Research Notes</td>",
  "      <td>Full + Math</td>",
  "      <td>Partial</td>",
  "    </tr>",
  "    <tr>",
  "      <td>Developer Guides</td>",
  "      <td>Full + Export Options</td>",
  "      <td>Basic</td>",
  "    </tr>",
  "  </tbody>",
  "</table>",
  "",
  "## 📝 Text Formatting Examples",
  "",
  "### Text Formatting",
  "",
  "Text can be formatted in various ways for ~~strikethrough~~, **bold**, *italic*, or ***bold italic***.",
  "",
  "For highlighting important information, use <mark>highlighted text</mark> or add <u>underlines</u> where appropriate.",
  "",
  "### Superscript and Subscript",
  "",
  "Chemical formulas: H<sub>2</sub>O, CO<sub>2</sub>  ",
  "Mathematical notation: x<sup>2</sup>, e<sup>iπ</sup>",
  "",
  "### Keyboard Keys",
  "",
  "Press <kbd>Ctrl</kbd> + <kbd>B</kbd> for bold text.",
  "",
  "### Abbreviations",
  "",
  "<abbr title=\"Graphical User Interface\">GUI</abbr>  ",
  "<abbr title=\"Application Programming Interface\">API</abbr>",
  "",
  "### Text Alignment",
  "",
  "<div style=\"text-align: center\">",
  "Centered text for headings or important notices",
  "</div>",
  "",
  "<div style=\"text-align: right\">",
  "Right-aligned text (for dates, signatures, etc.)",
  "</div>",
  "",
  "### **Lists**",
  "",
  "Create bullet points:",
  "* Item 1",
  "* Item 2",
  "  * Nested item",
  "    * Nested further",
  "",
  "### **Links and Images**",
  "",
  "Add a [link](https://www.markdownguide.org/) to important resources.",
  "",
  "Embed an image:",
  "<img alt=\"Markdown Logo\" src=\"/assets/icon.jpg\" width=\"120\" height=\"120\">",
  "",
  "### **Blockquotes**",
  "",
  "Quote someone famous:",
  "> \"The best way to predict the future is to invent it.\" - Alan Kay",
  "",
  advancedRendererShowcase,
  "",
  "---",
  "",
  "## 🛡️ Security Note",
  "",
  "This workspace is protected by your login and saves documents to your configured cloud storage.",
  "",
];

export const defaultMarkdown = defaultMarkdownLines.join("\n");
