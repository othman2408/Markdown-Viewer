# Contributing Guidelines

Thank you for your interest in contributing to **Markdown Viewer**! We welcome contributions, including bug reports, feature requests, documentation improvements, and code updates.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Reporting Bugs & Issues](#reporting-bugs--issues)
- [Security Disclosures](#security-disclosures)
- [Development Setup](#development-setup)
  - [Web Application](#web-application)
  - [Desktop Application](#desktop-application)
- [Code Style Guidelines](#code-style-guidelines)
  - [HTML Style](#html-style)
  - [CSS Style](#css-style)
  - [JavaScript Style](#javascript-style)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request & Code Review Process](#pull-request--code-review-process)
- [Repository Structure](#repository-structure)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful, professional, and inclusive environment. Please be kind and constructive in all communication and code reviews.

---

## Reporting Bugs & Issues

1.  Search the [GitHub Issue Tracker](https://github.com/ThisIs-Developer/Markdown-Viewer/issues) to verify the bug has not already been reported.
2.  If it is a new bug, open an issue including:
    *   A clear, descriptive title.
    *   Detailed steps to reproduce the bug.
    *   Expected vs. actual behavior.
    *   Your operating system and browser versions.
    *   Any relevant screenshots or console error messages.

---

## Security Disclosures

If you discover a security vulnerability, please report it responsibly:
*   Do not open a public issue.
*   Submit a private advisory via GitHub Security Advisories if enabled for the repository.
*   Alternatively, contact the project maintainers directly with details of the vulnerability and a minimal reproduction.

---

## Development Setup

### Web Application
The core web app requires no build step. To serve `index.html` on localhost (`127.0.0.1`) and run it locally:

1.  Clone the repository:
    ```bash
    git clone https://github.com/ThisIs-Developer/Markdown-Viewer.git
    cd Markdown-Viewer
    ```
2.  Serve the root directory using a local web server:
    ```bash
    # Serve with Python (built-in, no dependencies)
    python3 -m http.server 8080
    # or
    # Serve with Node.js serve
    npx serve . -p 8080
    ```
3.  Open **http://localhost:8080** or **http://127.0.0.1:8080** in your browser and edit files like `index.html`, `script.js`, or `styles.css`.

### Desktop Application
To set up the NeutralinoJS desktop environment:

1.  Navigate to the desktop directory:
    ```bash
    cd Markdown-Viewer/desktop-app
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Download the Neutralino runtime binaries:
    ```bash
    node setup-binaries.js
    ```
4.  Copy the latest frontend assets into the desktop directory:
    ```bash
    node prepare.js
    ```
5.  Start the app in development mode with hot-reload:
    ```bash
    npm run dev
    ```

---

## Code Style Guidelines

### HTML Style
*   Use **2-space indentation**.
*   Write semantic HTML5 tags (`<header>`, `<main>`, `<section>`, etc.) and ensure they are nested correctly.
*   Include `aria-*` attributes and roles to maintain accessibility.
*   Do not write inline CSS styles; place all styles in `styles.css`.

### CSS Style
*   Use **2-space indentation**.
*   Use CSS variables (custom properties) on `:root` and `[data-theme="dark"]` to manage colors, borders, and margins.
*   Scope transitions to specific properties (e.g. `transition: background-color 0.2s`) to avoid repainting the entire viewport during theme switches.
*   Group style sheets logically using clear comments (e.g. `/* --- Editor Layout --- */`).

### JavaScript Style
*   Use **2-space indentation** and insert semicolons.
*   Use Vanilla ES6 JavaScript without external frameworks.
*   Use `const` for constant references and `let` for variables. Do not use `var`.
*   Offload CPU-intensive parsing or formatting logic to the Web Worker (`preview-worker.js`) to keep the main UI thread responsive.
*   Debounce event handlers that trigger rendering or layout calculations.

---

## Commit Message Conventions

We use the **Conventional Commits** standard to organize project changes. Commit messages must use the following format:

```
<type>(<scope>): <description>

[body]
[footer]
```

### Commit Types:
*   `feat`: A new user-facing feature.
*   `fix`: A bug fix.
*   `docs`: Changes to documentation files (such as the wiki or README).
*   `style`: Formatting updates (whitespace, semicolons) that do not affect code logic.
*   `refactor`: Code restructuring that neither fixes a bug nor adds a feature.
*   `perf`: Performance-related optimizations.
*   `chore`: Tasks like updating dependencies, build configurations, or CI files.

### Commit Examples:
*   `feat(editor): add keyboard shortcut for fullscreen mode`
*   `fix(pdf): correct page breaks in long tables`
*   `docs(wiki): add Mermaid diagrams formatting guide`
*   `chore(deps): update marked.js version to 9.1.6`

---

## Pull Request & Code Review Process

1.  Fork the repository and create a new feature branch from `main`:
    ```bash
    git checkout -b feature/my-feature-name
    ```
2.  Make your changes, verify your code style, and test them across modern browsers (Chrome, Firefox, Safari, Edge).
3.  Commit your updates following the [Commit Message Conventions](#commit-message-conventions).
4.  Rebase your branch to ensure it is up to date with the upstream `main` branch before submitting:
    ```bash
    git fetch upstream
    git rebase upstream/main
    ```
5.  Open a Pull Request pointing to the upstream repository's `main` branch. Complete the pull request template with details of the changes and any related issues.
6.  A project maintainer will review your pull request. Please address any review comments before the code is merged. Once approved, the pull request will be squash-merged.

---

## Repository Structure

Below is an overview of the key folders and files in the repository:

*   `index.html`: The entry-point HTML page.
*   `script.js`: The main controller and UI interaction script.
*   `preview-worker.js`: The background Web Worker script that compiles Markdown.
*   `styles.css`: CSS styles and themes.
*   `sw.js`: The Service Worker cache proxy script.
*   `Dockerfile` / `docker-compose.yml`: Docker configuration files.
*   `assets/`: Image assets and diagrams.
*   `wiki/`: Document source files for this wiki.
*   `desktop-app/`: NeutralinoJS application source files.
