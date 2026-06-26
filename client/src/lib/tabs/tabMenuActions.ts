import type { TabMenuAction } from '../types/workspace';

export type TabMenuActionConfig = {
  action: TabMenuAction;
  icon: string;
  label: string;
  danger?: boolean;
};

export const tabMenuActions: TabMenuActionConfig[] = [
  {
    action: 'rename',
    icon: 'bi-pencil',
    label: 'Rename'
  },
  {
    action: 'duplicate',
    icon: 'bi-files',
    label: 'Duplicate'
  },
  {
    action: 'delete',
    icon: 'bi-trash',
    label: 'Delete',
    danger: true
  }
];
