const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");

function readFile(filePath) {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

function readShellSource() {
  return [
    "client/src/components/AppHeader.svelte",
    "client/src/components/header/DesktopToolbar.svelte",
    "client/src/components/header/DesktopImportDropdown.svelte",
    "client/src/components/header/DesktopFileInput.svelte",
    "client/src/components/header/DesktopExportDropdown.svelte",
    "client/src/components/header/DesktopHeaderActions.svelte",
    "client/src/components/header/MobileMenu.svelte",
    "client/src/components/header/MobileMenuToggle.svelte",
    "client/src/components/header/MobileMenuPanel.svelte",
    "client/src/components/header/MobileMenuTabsSection.svelte",
    "client/src/components/header/MobileMenuActions.svelte",
    "client/src/components/header/MobileMenuActionButton.svelte",
    "client/src/components/header/MobileMenuOverlay.svelte",
    "client/src/lib/header/mobileMenuActions.ts",
    "client/src/components/header/CloudLogoutControl.svelte",
    "client/src/components/header/CloudLogoutButton.svelte",
    "client/src/components/header/HeaderStatItem.svelte",
    "client/src/components/header/HeaderStats.svelte",
    "client/src/lib/header/headerStats.ts",
    "client/src/components/header/SyncScrollButton.svelte",
    "client/src/components/header/SyncScrollToggleButton.svelte",
    "client/src/components/header/ThemeToggleControl.svelte",
    "client/src/components/header/ThemeToggleButton.svelte",
    "client/src/components/header/ViewModeButton.svelte",
    "client/src/components/header/ViewModeControls.svelte",
    "client/src/lib/header/viewModeOptions.ts",
    "client/src/components/WorkspaceChrome.svelte",
    "client/src/components/toolbar/MarkdownFormatToolbar.svelte",
    "client/src/components/toolbar/MarkdownToolbarGroups.svelte",
    "client/src/components/toolbar/MarkdownToolButton.svelte",
    "client/src/components/toolbar/MarkdownToolButtonContent.svelte",
    "client/src/components/toolbar/HistoryToolbarGroup.svelte",
    "client/src/components/toolbar/TextStyleToolbarGroup.svelte",
    "client/src/components/toolbar/AlignmentToolbarGroup.svelte",
    "client/src/components/toolbar/DirectionToggleButton.svelte",
    "client/src/components/toolbar/HeadingToolbarGroup.svelte",
    "client/src/components/toolbar/ListToolbarGroup.svelte",
    "client/src/components/toolbar/InsertToolbarGroup.svelte",
    "client/src/components/toolbar/UtilityToolbarGroup.svelte",
    "client/src/components/tabs/TabBar.svelte",
    "client/src/components/tabs/DesktopTabList.svelte",
    "client/src/components/tabs/DesktopTabItem.svelte",
    "client/src/components/tabs/TabActionMenu.svelte",
    "client/src/components/tabs/TabMenuToggleButton.svelte",
    "client/src/components/tabs/TabMenuActionList.svelte",
    "client/src/components/tabs/TabMenuDropdown.svelte",
    "client/src/components/tabs/TabMenuItem.svelte",
    "client/src/lib/tabs/tabMenuActions.ts",
    "client/src/components/tabs/MobileTabList.svelte",
    "client/src/components/tabs/MobileTabItem.svelte",
    "client/src/components/EditorWorkspace.svelte",
    "client/src/components/editor/EditorPane.svelte",
    "client/src/components/editor/EditorLineNumbers.svelte",
    "client/src/components/editor/EditorHighlightLayer.svelte",
    "client/src/components/editor/EditorSkeleton.svelte",
    "client/src/components/editor/MarkdownEditorTextarea.svelte",
    "client/src/components/editor/EditorDropHint.svelte",
    "client/src/components/editor/DragOverlay.svelte",
    "client/src/components/editor/ResizeDivider.svelte",
    "client/src/components/preview/PreviewPane.svelte",
    "client/src/components/AppModals.svelte",
    "client/src/components/modals/CoreModals.svelte",
    "client/src/components/modals/FindReplacePanel.svelte",
    "client/src/components/modals/FindReplaceHeader.svelte",
    "client/src/components/modals/FindReplaceFindRow.svelte",
    "client/src/components/modals/FindReplaceOptionButton.svelte",
    "client/src/components/modals/FindReplaceRegexError.svelte",
    "client/src/components/modals/FindReplaceReplaceRow.svelte",
    "client/src/components/modals/FindReplaceMetaRow.svelte",
    "client/src/components/modals/FindReplaceAdvancedDrawer.svelte",
    "client/src/components/modals/FindReplaceActionsFooter.svelte",
    "client/src/components/modals/DocumentModals.svelte",
    "client/src/components/modals/DiffPreviewModal.svelte",
    "client/src/components/modals/HelpModal.svelte",
    "client/src/components/modals/HelpModalHeader.svelte",
    "client/src/components/modals/HelpModalBody.svelte",
    "client/src/components/modals/HelpModalFooter.svelte",
    "client/src/components/modals/AboutModal.svelte",
    "client/src/components/modals/AboutModalHeader.svelte",
    "client/src/components/modals/AboutModalBody.svelte",
    "client/src/components/modals/AboutModalFooter.svelte",
    "client/src/components/modals/ShareModal.svelte",
    "client/src/components/modals/ShareModalDialog.svelte",
    "client/src/components/modals/ShareModalBox.svelte",
    "client/src/components/modals/ShareModalHeader.svelte",
    "client/src/components/modals/ShareModalBody.svelte",
    "client/src/components/modals/ShareModalFooter.svelte",
    "client/src/components/modals/ShareModalNotice.svelte",
    "client/src/components/modals/ShareModeSelector.svelte",
    "client/src/components/modals/ShareModeCard.svelte",
    "client/src/components/modals/ShareUrlRow.svelte",
    "client/src/components/modals/RenameModal.svelte",
    "client/src/components/modals/InsertModals.svelte",
    "client/src/components/modals/LinkModal.svelte",
    "client/src/components/modals/ReferenceModal.svelte",
    "client/src/components/modals/ImageModal.svelte",
    "client/src/components/modals/TableModal.svelte",
    "client/src/components/modals/EmojiModal.svelte",
    "client/src/components/modals/SymbolsModal.svelte",
    "client/src/components/modals/AlertModal.svelte",
    "client/src/components/modals/GitHubImportModal.svelte",
    "client/src/components/DiagramModals.svelte",
    "client/src/components/diagrams/MermaidZoomModal.svelte",
    "client/src/components/diagrams/MermaidZoomControls.svelte",
    "client/src/components/diagrams/StlZoomModal.svelte",
    "client/src/components/diagrams/StlZoomControls.svelte",
    "client/src/components/DefaultMarkdownTemplate.svelte",
    "client/src/components/AccessibilityAnnouncer.svelte"
  ].map(readFile).join("\n");
}

function sourceHasToolbarAction(source, action) {
  return source.includes(`data-md-action="${action}"`) || source.includes(`action="${action}"`);
}

function sourceHasId(source, id) {
  return source.includes(`id="${id}"`) || source.includes(`id: '${id}'`) || source.includes(`id: "${id}"`);
}

function sourceHasHeadingLevel(source, level) {
  return source.includes(`data-md-action="heading" data-md-level="${level}"`) ||
    (source.includes('action="heading"') && (source.includes(`level="${level}"`) || source.includes(`'${level}'`)));
}

test("Svelte rebuild baseline keeps required stable DOM contract", () => {
  const source = readShellSource();
  const requiredIds = [
    "markdown-editor",
    "markdown-preview",
    "markdown-format-toolbar",
    "tab-list",
    "tab-new-btn",
    "tab-reset-btn",
    "reading-time",
    "word-count",
    "char-count",
    "theme-toggle",
    "toggle-sync",
    "share-button",
    "logout-button",
    "mobile-menu-toggle",
    "mobile-menu-panel",
    "mobile-tab-list",
    "mobile-share-button",
    "mobile-logout-button",
    "find-replace-modal",
    "share-modal",
    "rename-modal",
    "github-import-modal",
    "mermaid-zoom-modal",
    "stl-zoom-modal",
    "default-markdown",
    "app-accessibility-announcer"
  ];

  for (const id of requiredIds) {
    assert.ok(sourceHasId(source, id), `missing #${id}`);
  }
});

test("Svelte rebuild baseline keeps core tool groups and view controls", () => {
  const source = readShellSource();

  assert.match(source, /view-toggle-btn/);
  assert.match(source, /mobile-view-mode-btn/);
  assert.match(source, /data-view-mode=\{option\.mode\}/);
  assert.match(source, /data-mode=\{option\.mode\}/);
  assert.match(source, /mode: 'editor'/);
  assert.match(source, /mode: 'split'/);
  assert.match(source, /mode: 'preview'/);
  assert.ok(sourceHasToolbarAction(source, "bold"));
  assert.ok(sourceHasHeadingLevel(source, "1"));
  assert.ok(sourceHasToolbarAction(source, "link"));
  assert.ok(sourceHasToolbarAction(source, "image"));
});

test("Svelte rebuild baseline keeps modal accessibility anchors", () => {
  const source = readShellSource();
  const modalIds = [
    "reset-confirm-modal",
    "clear-formatting-modal",
    "find-replace-diff-modal",
    "share-modal",
    "link-modal",
    "image-modal",
    "table-modal",
    "emoji-modal",
    "symbols-modal",
    "alert-modal",
    "github-import-modal"
  ];

  for (const id of modalIds) {
    const index = source.indexOf(`id="${id}"`);
    assert.notEqual(index, -1, `missing modal #${id}`);
    const modalSource = source.slice(index, index + 220);
    assert.match(modalSource, /role="dialog"/, `missing dialog role for #${id}`);
    assert.match(modalSource, /aria-modal="true"/, `missing aria-modal for #${id}`);
  }
});
