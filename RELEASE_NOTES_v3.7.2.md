# Markdown Viewer - Release Notes v3.7.2
**Date:** June 3, 2026  
**Commit Range:** `fe19aa47e5710e4ede39afde89b1591b6777fab1` to `4a9cc6a0b602a377a1e30e64205fff7733472ed8`

We are excited to announce the release of **v3.7.2** of Markdown Viewer! This version introduces substantial quality-of-life enhancements, layout adjustments to prevent broken UI behaviors on heavy tabs, and visual transitions that optimize the experience during dark/light mode swaps.

---

## Key Highlights

### 1. Robust Custom Editor History (Undo & Redo) & Document Clearing
Previously, relying on simple input updates caused loss of edit state tracking. In this release, we have built a custom, tab-aware edit history state manager:
- **Undo / Redo Stack:** Users can seamlessly revert or redo edits with high granularity.
- **Clear Document Action:** Added a dedicated "Clear Document" button in the editor toolbar, which wipes the editor pane instantly with a clean history state transition.

### 2. Tab Navigation & Dynamic Overflow Handling
Managing multiple open tabs on small viewports could previously wrap or push the layout off-screen.
- **Relocated "New Tab" Button:** Positioned strategically for better accessibility.
- **Dynamic Overflow Handling:** The tab list now dynamically detects space constraints and groups overflowing tabs into a clean UI structure, protecting the header layout from wrapping.

### 3. Mermaid.js Theme Change Transitions & Stabilization
Swapping themes (Light $\leftrightarrow$ Dark) previously caused Mermaid.js canvases to break or reload abruptly.
- **Deferred Re-rendering:** Mermaid diagram rendering is now debounced and deferred to prioritize the immediate repaint of CSS color schemas.
- **Synchronized Transitions:** A smooth fade-in/fade-out transition occurs when diagrams redraw under the new theme.
- **Original Instant Color Switching:** Reverted full-page body transitions to ensure the color switches remain fast, lightweight, and responsive.

### 4. Layout Cleanups & Mobile Accessibility
- **Mobile Direction Toggle:** Removed the redundant LTR/RTL button from the mobile header, as it is already present in the formatting toolbar.
- **Viewport Scroll Accessibility:** Enabled window scroll on mobile viewports to allow full access to sidebar menu controls on small screens.
- **Outer Scrollbar Cleanup:** Fixed styling variables to remove redundant outer window scrollbars on desktop builds.

---

## Detailed Commit Log

The following commits are packaged into this release:

* **`4a9cc6a`** — Merge pull request #153 from ThisIs-Developer/feature/global-new-tab-and-overflow
* **`e379725`** — chore(desktop): sync desktop resources with latest tab enhancements
* **`e205b67`** — feat(tabs): relocate new tab button and implement overflow handling
* **`542472b`** — fix(layout): allow window scroll on mobile viewports for menu accessibility
* **`071cc30`** — chore(desktop): sync desktop-app resources with web-app fixes
* **`f4d31db`** — Merge branch 'fix/mermaid-theme-change'
* **`076620e`** — fix(layout): remove outer window scrollbar
* **`a611966`** — Merge pull request #151 from ThisIs-Developer/fix/mermaid-theme-change
* **`533e03b`** — perf(theme): restore original main branch instant theme changing code with raw source preservation
* **`2257f22`** — perf(theme): revert full-page transitions to restore fast, lightweight color switches
* **`79c17b8`** — style(theme): implement unified 300ms full-page theme switch transition
* **`6763234`** — style(mermaid): implement smooth synchronized fade transitions on theme switch
* **`47dab15`** — perf(mermaid): defer diagram re-rendering to keep theme transition smooth
* **`83dcff5`** — chore(desktop): sync desktop-app resources with web-app fixes
* **`b8eb522`** — fix(mermaid): prevent diagrams from breaking on theme change
* **`b5fa206`** — Merge pull request #150 from ThisIs-Developer/fix/undo-redo-clear-document
* **`e5034fb`** — fix: implement custom editor history (undo/redo) and clear document action
* **`fe19aa4`** — Remove mobile direction toggle button as it is already in the toolbar

---
*For issues, feedback, or contribution, please open a ticket on GitHub.*
