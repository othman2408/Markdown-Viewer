# Installation & Deployment Guide

This page provides detailed installation, setup, and deployment guides for **Markdown Viewer** across all supported platforms.

---

## Table of Contents

- [System Requirements](#system-requirements)
- [Option 1: Docker Container (Recommended)](#option-1-docker-container-recommended)
- [Option 2: Docker Compose Setup](#option-2-docker-compose-setup)
- [Option 3: Self-Hosted Static Web Server](#option-3-self-hosted-static-web-server)
- [Option 4: Neutralinojs Desktop Application](#option-4-neutralinojs-desktop-application)
- [Air-Gapped & Offline Isolation Configuration](#air-gapped--offline-isolation-configuration)

---

## System Requirements

### Web & Container Deployments
*   **Modern Web Browsers:** Google Chrome 90+, Mozilla Firefox 90+, Microsoft Edge 90+, Apple Safari 15+. Note that PWA and Service Worker features require HTTPS or a `localhost` origin for security enforcement.
*   **Docker Daemon:** Docker Engine 20.10+ (for Docker container deployment).
*   **System Resources:** Minimum 512 MB RAM, 100 MB disk space.

### Desktop Application Compilation
*   **Operating Systems:** Windows 10+ (x64), Ubuntu 20.04+ (x64 / ARM64), macOS 11+ (Universal Apple Silicon/Intel).
*   **Node.js Runtime Environment:** v16.0.0 or later (includes npm package manager).
*   **System Resources:** Minimum 256 MB RAM, 50 MB disk space.

---

## Option 1: Docker Container (Recommended)

Deploy the application using the official Docker image hosted on the GitHub Container Registry (GHCR).

### Running the Container
Execute the following command to start a detached container that redirects host port `8080` to container port `80`:

```bash
docker pull ghcr.io/thisis-developer/markdown-viewer:sha-15eafb0
docker run -d \
  --name markdown-viewer \
  -p 8080:80 \
  --restart unless-stopped \
  ghcr.io/thisis-developer/markdown-viewer:sha-15eafb0
```

Open **http://localhost:8080** in your browser.

### Adjusting Ports
To map the application to a different port (such as `9000`), modify the left side of the `-p` parameter:

```bash
docker pull ghcr.io/thisis-developer/markdown-viewer:sha-15eafb0
docker run -d \
  --name markdown-viewer \
  -p 9000:80 \
  --restart unless-stopped \
  ghcr.io/thisis-developer/markdown-viewer:sha-15eafb0
```

### Image Tags

| Tag Name | Production Ready | Target Source Branch | Target Architecture |
| :--- | :--- | :--- | :--- |
| `latest` | Yes (Stable Release) | `main` branch (Release tag) | `linux/amd64`, `linux/arm64` |
| `main` | No (Development) | `main` branch (Commit updates) | `linux/amd64`, `linux/arm64` |
| `<commit-sha>` | Pinned | Specific Git commit hash | `linux/amd64`, `linux/arm64` |

---

## Option 2: Docker Compose Setup

For local deployments and multi-container environments, use Docker Compose.

### 1. Clone the Codebase
```bash
git clone https://github.com/ThisIs-Developer/Markdown-Viewer.git
cd Markdown-Viewer
```

### 2. Launch the Application
Start the container using Compose:
```bash
docker compose up -d
```

### 3. Verify Container Status
Confirm the container is running:
```bash
docker compose ps
```

### 4. Stop the Container
```bash
docker compose down
```

### Default `docker-compose.yml` Configuration
```yaml
services:
  markdown-viewer:
    image: ghcr.io/thisis-developer/markdown-viewer:sha-15eafb0
    container_name: markdown-viewer
    ports:
      - "8080:80"
    restart: unless-stopped
```

To build a local image instead of pulling the published container, update the `image` field with a `build` directive:
```yaml
services:
  markdown-viewer:
    build: .
    container_name: markdown-viewer
    ports:
      - "8080:80"
    restart: unless-stopped
```

---

## Option 3: Self-Hosted Static Web Server

Because Markdown Viewer is a fully client-side application, you can serve it from any static web server to serve `index.html` on localhost (`127.0.0.1`) by copying `index.html`, `script.js`, `preview-worker.js`, `styles.css`, `sw.js`, and the `assets/` folder.

### Clone the Repository
```bash
git clone https://github.com/ThisIs-Developer/Markdown-Viewer.git
cd Markdown-Viewer
```

### Serving with Python (Built-in Web Server)
Run the following command in the repository root to serve the project on localhost:
```bash
python3 -m http.server 8080
```

### Serving with Node.js
Run the following command in the repository root to serve the project on localhost:
```bash
npx serve . -p 8080
```
Once started, the application is accessible at **http://localhost:8080** or **http://127.0.0.1:8080**.

### Serving with Nginx
Copy the project assets to Nginx's HTML folder:
```bash
cp -r . /usr/share/nginx/html/
```

> [!WARNING]
> Opening the `index.html` file directly in a browser via the `file://` protocol may fail due to browser security restrictions (CORS) that block Web Workers and Service Workers from running locally. Always serve the files using a local web server.

---

## Option 4: Neutralinojs Desktop Application

Markdown Viewer can also run as a native desktop application powered by **Neutralinojs**.

### Downloading Pre-Built Executables
Download the binary for your platform from the [GitHub Releases Page](https://github.com/ThisIs-Developer/Markdown-Viewer/releases):
*   **Windows:** `markdown-viewer-win_x64.exe`
*   **Linux:** `markdown-viewer-linux_x64`
*   **Linux ARM (Raspberry Pi):** `markdown-viewer-linux_arm64`
*   **macOS (Apple Silicon/Intel):** `markdown-viewer-mac_universal`

### Building the Desktop Executable from Source
Follow these steps to build the binaries locally:

1.  Navigate to the desktop application folder:
    ```bash
    cd desktop-app
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Download Neutralino framework binaries:
    ```bash
    node setup-binaries.js
    ```
4.  Copy files from the project root into the desktop resource folder:
    ```bash
    node prepare.js
    ```
5.  Compile the executable:
    ```bash
    # Build single-file embedded Windows binary
    npm run build
    
    # Build portable distribution zip files for all platforms
    npm run build:portable
    ```

---

## Air-Gapped & Offline Isolation Configuration

By default, the application loads large rendering dependencies (like MathJax and Mermaid) from external CDNs. In secure, offline, or air-gapped environments, these remote scripts will fail to load.

### Setting Up a Fully Offline Build:
1.  Download the required JavaScript dependencies (see [Configuration](Configuration) for URLs) and save them to a local directory (e.g., `js/libs/`).
2.  Update the `<script>` and `<link>` tags in `index.html` to reference your local asset paths.
3.  Synchronize the desktop app folder by running `node prepare.js`.
4.  Rebuild your Docker image or desktop application.
