import type { ViewMode } from '../types/workspace';

export interface ViewModeOption {
  mode: ViewMode;
  icon: string;
  label: string;
  title: string;
}

export const viewModeOptions: ViewModeOption[] = [
  {
    mode: 'editor',
    icon: 'bi-file-text',
    label: 'Editor',
    title: 'Editor only'
  },
  {
    mode: 'split',
    icon: 'bi-layout-split',
    label: 'Split',
    title: 'Split view'
  },
  {
    mode: 'preview',
    icon: 'bi-eye',
    label: 'Preview',
    title: 'Preview only'
  }
];
