import type { HeaderAction } from './headerActionBridge';

export type MobileMenuActionConfig = {
  id: string;
  title: string;
  action: HeaderAction;
  icon: string;
  label: string;
};

export const mobileMenuActions: MobileMenuActionConfig[] = [
  {
    id: 'mobile-import-button',
    title: 'Import from files',
    action: 'importFile',
    icon: 'bi-upload',
    label: 'Import from files'
  },
  {
    id: 'mobile-import-github-button',
    title: 'Import from GitHub',
    action: 'importGithub',
    icon: 'bi-github',
    label: 'Import from GitHub'
  },
  {
    id: 'mobile-export-md',
    title: 'Export as Markdown',
    action: 'exportMarkdown',
    icon: 'bi-file-earmark-text',
    label: 'Export as Markdown'
  },
  {
    id: 'mobile-export-html',
    title: 'Export as HTML',
    action: 'exportHtml',
    icon: 'bi-file-earmark-code',
    label: 'Export as HTML'
  },
  {
    id: 'mobile-export-pdf',
    title: 'Export as PDF',
    action: 'exportPdf',
    icon: 'bi-file-earmark-pdf',
    label: 'Export as PDF'
  },
  {
    id: 'mobile-export-png',
    title: 'Export as Image',
    action: 'exportPng',
    icon: 'bi-file-earmark-image',
    label: 'Export as Image'
  },
  {
    id: 'mobile-copy-markdown',
    title: 'Copy Markdown',
    action: 'copyMarkdown',
    icon: 'bi-clipboard',
    label: 'Copy'
  },
  {
    id: 'mobile-files-button',
    title: 'Files',
    action: 'files',
    icon: 'bi-folder2-open',
    label: 'Files'
  },
  {
    id: 'mobile-share-button',
    title: 'Share via URL',
    action: 'share',
    icon: 'bi-share',
    label: 'Share'
  }
];
