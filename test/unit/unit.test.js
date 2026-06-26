const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { normalizeWorkspaceBody, sanitizeReturnTo } = require("../../server/app");
const { requireCsrf } = require("../../server/auth");

test("sanitizeReturnTo keeps only safe relative paths", () => {
  assert.equal(sanitizeReturnTo("/"), "/");
  assert.equal(sanitizeReturnTo("/notes?x=1"), "/notes?x=1");
  assert.equal(sanitizeReturnTo("https://example.com"), "/");
  assert.equal(sanitizeReturnTo("//example.com"), "/");
  assert.equal(sanitizeReturnTo("/api/bootstrap"), "/");
  assert.equal(sanitizeReturnTo("/login"), "/");
});

test("normalizeWorkspaceBody preserves the existing tab shape", () => {
  const body = normalizeWorkspaceBody({
    activeTabId: "tab_1",
    untitledCounter: 3,
    globalState: { theme: "dark" },
    findReplaceDocked: true,
    tabs: [
      {
        id: "tab_1",
        title: "Readme",
        content: "# Hello",
        scrollPos: 12,
        viewMode: "split",
        createdAt: 123
      }
    ]
  });

  assert.equal(body.activeTabId, "tab_1");
  assert.equal(body.tabs.length, 1);
  assert.equal(body.tabs[0].content, "# Hello");
  assert.equal(body.tabs[0].viewMode, "split");
  assert.equal(body.findReplaceDocked, true);
});

test("requireCsrf accepts the same browser origin from the dev proxy", () => {
  const req = {
    method: "POST",
    protocol: "http",
    session: { csrfToken: "csrf-token" },
    get(name) {
      return {
        origin: "http://127.0.0.1:5173",
        host: "127.0.0.1:5173",
        "x-csrf-token": "csrf-token"
      }[String(name).toLowerCase()];
    }
  };
  let nextCalled = false;

  requireCsrf(req, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test("requireCsrf rejects unknown cross-origin writes", () => {
  const req = {
    method: "POST",
    protocol: "http",
    session: { csrfToken: "csrf-token" },
    get(name) {
      return {
        origin: "http://evil.example",
        host: "127.0.0.1:5173",
        "x-csrf-token": "csrf-token"
      }[String(name).toLowerCase()];
    }
  };
  let statusCode = null;
  let jsonBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      jsonBody = body;
    }
  };

  requireCsrf(req, res, () => {
    throw new Error("Expected CSRF middleware to reject the request");
  });

  assert.equal(statusCode, 403);
  assert.deepEqual(jsonBody, { error: "bad_origin" });
});

test("auth UI lives in Svelte and keeps form wiring", () => {
  const root = path.resolve(__dirname, "../..");
  const app = fs.readFileSync(path.join(root, "client", "src", "App.svelte"), "utf8");
  const authPage = fs.readFileSync(path.join(root, "client", "src", "components", "auth", "AuthLoginPage.svelte"), "utf8");
  const serverApp = fs.readFileSync(path.join(root, "server", "app.ts"), "utf8");

  assert.match(app, /AuthLoginPage/);
  assert.match(app, /isLoginRoute/);
  assert.match(authPage, /class="auth-form"/);
  assert.match(authPage, /method="post"/);
  assert.match(authPage, /action="\/api\/login"/);
  assert.match(authPage, /id="login-error"/);
  assert.doesNotMatch(serverApp, /renderLoginPage/);
  assert.doesNotMatch(serverApp, /auth-card/);
});

test("app shell exposes logout controls wired to the logout API", () => {
  const root = path.resolve(__dirname, "../..");
  const logoutButton = [
    fs.readFileSync(path.join(root, "client", "src", "components", "header", "CloudLogoutButton.svelte"), "utf8"),
    fs.readFileSync(path.join(root, "client", "src", "components", "header", "CloudLogoutControl.svelte"), "utf8")
  ].join("\n");
  const script = fs.readFileSync(path.join(root, "client", "src", "lib", "app", "markdownViewerApp.ts"), "utf8");

  assert.match(logoutButton, /id="logout-button"/);
  assert.match(logoutButton, /id="mobile-logout-button"/);
  assert.match(script, /cloudApi\('\/api\/logout'/);
});

test("Svelte app mounts the preserved app shell", () => {
  const root = path.resolve(__dirname, "../..");
  const app = fs.readFileSync(path.join(root, "client", "src", "App.svelte"), "utf8");
  const main = fs.readFileSync(path.join(root, "client", "src", "main.ts"), "utf8");
  const modals = fs.readFileSync(path.join(root, "client", "src", "components", "AppModals.svelte"), "utf8");
  const svelteOwnedComponentPaths = [
    ["components", "AppHeader.svelte"],
    ["components", "WorkspaceChrome.svelte"],
    ["components", "header", "MobileMenu.svelte"],
    ["components", "header", "MobileMenuToggle.svelte"],
    ["components", "header", "MobileMenuPanel.svelte"],
    ["components", "header", "MobileMenuTabsSection.svelte"],
    ["components", "header", "MobileMenuActions.svelte"],
    ["components", "header", "MobileMenuActionButton.svelte"],
    ["components", "header", "MobileMenuOverlay.svelte"],
    ["components", "header", "CloudLogoutControl.svelte"],
    ["components", "header", "DesktopToolbar.svelte"],
    ["components", "header", "DesktopImportDropdown.svelte"],
    ["components", "header", "DesktopFileInput.svelte"],
    ["components", "header", "DesktopExportDropdown.svelte"],
    ["components", "header", "DesktopHeaderActions.svelte"],
    ["components", "header", "HeaderStatItem.svelte"],
    ["components", "header", "ViewModeButton.svelte"],
    ["components", "header", "SyncScrollToggleButton.svelte"],
    ["components", "header", "ThemeToggleControl.svelte"],
    ["components", "toolbar", "MarkdownFormatToolbar.svelte"],
    ["components", "toolbar", "MarkdownToolbarGroups.svelte"],
    ["components", "toolbar", "MarkdownToolButton.svelte"],
    ["components", "toolbar", "MarkdownToolButtonContent.svelte"],
    ["components", "toolbar", "HistoryToolbarGroup.svelte"],
    ["components", "toolbar", "TextStyleToolbarGroup.svelte"],
    ["components", "toolbar", "AlignmentToolbarGroup.svelte"],
    ["components", "toolbar", "DirectionToggleButton.svelte"],
    ["components", "toolbar", "HeadingToolbarGroup.svelte"],
    ["components", "toolbar", "ListToolbarGroup.svelte"],
    ["components", "toolbar", "InsertToolbarGroup.svelte"],
    ["components", "toolbar", "UtilityToolbarGroup.svelte"],
    ["components", "EditorWorkspace.svelte"],
    ["components", "DiagramModals.svelte"],
    ["components", "diagrams", "MermaidZoomModal.svelte"],
    ["components", "diagrams", "MermaidZoomControls.svelte"],
    ["components", "diagrams", "StlZoomModal.svelte"],
    ["components", "diagrams", "StlZoomControls.svelte"],
    ["components", "DefaultMarkdownTemplate.svelte"],
    ["components", "modals", "CoreModals.svelte"],
    ["components", "modals", "DocumentModals.svelte"],
    ["components", "modals", "DiffPreviewModal.svelte"],
    ["components", "modals", "HelpModal.svelte"],
    ["components", "modals", "HelpModalHeader.svelte"],
    ["components", "modals", "HelpModalBody.svelte"],
    ["components", "modals", "HelpModalFooter.svelte"],
    ["components", "modals", "AboutModal.svelte"],
    ["components", "modals", "AboutModalHeader.svelte"],
    ["components", "modals", "AboutModalBody.svelte"],
    ["components", "modals", "AboutModalFooter.svelte"],
    ["components", "modals", "ShareModal.svelte"],
    ["components", "modals", "ShareModalDialog.svelte"],
    ["components", "modals", "ShareModalBox.svelte"],
    ["components", "modals", "ShareModalHeader.svelte"],
    ["components", "modals", "ShareModalBody.svelte"],
    ["components", "modals", "ShareModalFooter.svelte"],
    ["components", "modals", "ShareModalNotice.svelte"],
    ["components", "modals", "ShareModeSelector.svelte"],
    ["components", "modals", "ShareModeCard.svelte"],
    ["components", "modals", "ShareUrlRow.svelte"],
    ["components", "modals", "RenameModal.svelte"],
    ["components", "modals", "FindReplacePanel.svelte"],
    ["components", "modals", "FindReplaceHeader.svelte"],
    ["components", "modals", "FindReplaceFindRow.svelte"],
    ["components", "modals", "FindReplaceOptionButton.svelte"],
    ["components", "modals", "FindReplaceRegexError.svelte"],
    ["components", "modals", "FindReplaceReplaceRow.svelte"],
    ["components", "modals", "FindReplaceMetaRow.svelte"],
    ["components", "modals", "FindReplaceAdvancedDrawer.svelte"],
    ["components", "modals", "FindReplaceActionsFooter.svelte"],
    ["components", "modals", "GitHubImportModal.svelte"],
    ["components", "modals", "InsertModals.svelte"],
    ["components", "modals", "LinkModal.svelte"],
    ["components", "modals", "ReferenceModal.svelte"],
    ["components", "modals", "ImageModal.svelte"],
    ["components", "modals", "TableModal.svelte"],
    ["components", "modals", "EmojiModal.svelte"],
    ["components", "modals", "SymbolsModal.svelte"],
    ["components", "modals", "AlertModal.svelte"],
    ["components", "tabs", "DesktopTabList.svelte"],
    ["components", "tabs", "DesktopTabItem.svelte"],
    ["components", "tabs", "MobileTabItem.svelte"],
    ["components", "tabs", "TabActionMenu.svelte"],
    ["components", "tabs", "TabMenuToggleButton.svelte"],
    ["components", "tabs", "TabMenuActionList.svelte"],
    ["components", "tabs", "TabMenuDropdown.svelte"],
    ["components", "tabs", "TabMenuItem.svelte"],
    ["components", "editor", "EditorPane.svelte"],
    ["components", "editor", "EditorLineNumbers.svelte"],
    ["components", "editor", "EditorHighlightLayer.svelte"],
    ["components", "editor", "EditorSkeleton.svelte"],
    ["components", "editor", "MarkdownEditorTextarea.svelte"],
    ["components", "editor", "EditorDropHint.svelte"]
  ];

  assert.match(app, /AppHeader/);
  assert.match(app, /EditorWorkspace/);
  assert.match(app, /DefaultMarkdownTemplate/);
  assert.match(app, /startMarkdownViewerApp/);
  assert.match(modals, /FindReplacePanel/);
  assert.match(modals, /InsertModals/);
  for (const segments of svelteOwnedComponentPaths) {
    const component = fs.readFileSync(path.join(root, "client", "src", ...segments), "utf8");
    assert.doesNotMatch(component, /\{@html/);
  }
  assert.match(main, /mount\(App, \{ target \}\)/);
});

test("default markdown Svelte content uses the shared default document module", () => {
  const root = path.resolve(__dirname, "../..");
  const component = fs.readFileSync(path.join(root, "client", "src", "components", "DefaultMarkdownTemplate.svelte"), "utf8");
  const moduleSource = fs.readFileSync(path.join(root, "client", "src", "lib", "content", "defaultMarkdown.ts"), "utf8");
  const lines = Array.from(moduleSource.matchAll(/^\s*("(?:[^"\\]|\\.)*"),$/gm), (match) => JSON.parse(match[1]));
  const markdown = lines.join("\n").trim();

  assert.match(component, /import \{ defaultMarkdown \}/);
  assert.match(component, /id="default-markdown"/);
  assert.match(component, /\{defaultMarkdown\}/);
  assert.match(markdown, /# Welcome to Markdown Viewer/);
  assert.match(markdown, /This workspace is protected by your login and saves documents to your configured cloud storage\./);
});
