import { describe, expect, it } from 'vitest';
import { createWorkspaceTabCommandController, type WorkspaceTabCommandHandlers } from '../../../lib/workspace/controller';

function createHarness() {
  const calls: string[] = [];
  const handlers: WorkspaceTabCommandHandlers = {
    closeMobileMenu: () => calls.push('close-mobile'),
    closeTabMenus: () => calls.push('close-tab-menus'),
    createTab: () => calls.push('create'),
    deleteTab: (tabId) => calls.push(`delete:${tabId}`),
    duplicateTab: (tabId) => calls.push(`duplicate:${tabId}`),
    renameTab: (tabId) => calls.push(`rename:${tabId}`),
    reorderTabs: (draggedTabId, targetTabId) => calls.push(`reorder:${draggedTabId}:${targetTabId}`),
    resetTabs: () => calls.push('reset'),
    selectTab: (tabId) => calls.push(`select:${tabId}`)
  };

  return {
    calls,
    controller: createWorkspaceTabCommandController(handlers)
  };
}

describe('workspace tab command controller', () => {
  it('routes create, reset, select, and reorder commands with existing mobile-close order', () => {
    const { calls, controller } = createHarness();

    controller.createTab(true);
    controller.resetTabs(true);
    controller.selectTab('tab_one', true);
    controller.reorderTabs('tab_two', 'tab_one');
    controller.selectTab('', true);

    expect(calls).toEqual([
      'create',
      'close-mobile',
      'close-mobile',
      'reset',
      'select:tab_one',
      'close-mobile',
      'reorder:tab_two:tab_one'
    ]);
  });

  it('routes desktop menu actions through the same close-tab-menu prelude', () => {
    const { calls, controller } = createHarness();

    controller.runMenuAction('tab_one', 'rename', false);
    controller.runMenuAction('tab_two', 'duplicate', false);
    controller.runMenuAction('tab_three', 'delete', false);

    expect(calls).toEqual([
      'close-tab-menus',
      'rename:tab_one',
      'close-tab-menus',
      'duplicate:tab_two',
      'close-tab-menus',
      'delete:tab_three'
    ]);
  });

  it('preserves mobile menu ordering for rename, duplicate, and delete', () => {
    const { calls, controller } = createHarness();

    controller.runMenuAction('tab_one', 'rename', true);
    controller.runMenuAction('tab_two', 'duplicate', true);
    controller.runMenuAction('tab_three', 'delete', true);

    expect(calls).toEqual([
      'close-tab-menus',
      'close-mobile',
      'rename:tab_one',
      'close-tab-menus',
      'duplicate:tab_two',
      'close-mobile',
      'close-tab-menus',
      'delete:tab_three'
    ]);
  });

  it('ignores empty tab menu commands without side effects', () => {
    const { calls, controller } = createHarness();

    controller.runMenuAction('', 'rename', true);
    controller.runMenuAction('tab_one', undefined as never, true);

    expect(calls).toEqual([]);
  });
});
