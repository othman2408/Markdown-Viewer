// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  attachFindReplacePanelDrag,
  resetFindReplaceDockLayoutOnClose,
  toggleFindReplaceDockMode
} from '../../../lib/modals/findReplacePanel';

function setupPanelDom(): {
  contentContainer: HTMLDivElement;
  dockButton: HTMLButtonElement;
  input: HTMLInputElement;
  panel: HTMLDivElement;
} {
  document.body.innerHTML = `
    <div class="content-container"></div>
    <div id="find-replace-modal"></div>
    <button id="find-replace-dock"></button>
    <input id="active-input" value="abcdef" />
  `;
  const panel = document.getElementById('find-replace-modal') as HTMLDivElement;
  const dockButton = document.getElementById('find-replace-dock') as HTMLButtonElement;
  const contentContainer = document.querySelector('.content-container') as HTMLDivElement;
  const input = document.getElementById('active-input') as HTMLInputElement;
  input.focus();
  input.setSelectionRange(1, 4);

  return {
    contentContainer,
    dockButton,
    input,
    panel
  };
}

describe('find/replace panel movement helpers', () => {
  it('docks and floats the panel while preserving focus and selection', () => {
    const { contentContainer, dockButton, input, panel } = setupPanelDom();
    const onDockStateChange = vi.fn();
    const onLayoutChange = vi.fn();
    const onPersistPreferredDocked = vi.fn();
    const onWorkspaceSync = vi.fn();

    expect(toggleFindReplaceDockMode({
      contentContainer,
      currentDocked: false,
      dockButton,
      documentRef: document,
      floatingPosition: { left: null, right: null, top: null },
      onDockStateChange,
      onLayoutChange,
      onPersistPreferredDocked,
      onWorkspaceSync,
      panel,
      viewportWidth: 1440
    })).toEqual({
      docked: true,
      persistedPreference: true
    });
    expect(panel.parentElement).toBe(contentContainer);
    expect(contentContainer.classList.contains('fr-docked')).toBe(true);
    expect(contentContainer.style.getPropertyValue('--dock-width')).toBe('340px');
    expect(panel.style.left).toBe('auto');
    expect(panel.style.top).toBe('auto');
    expect(panel.style.right).toBe('auto');
    expect(dockButton.innerHTML).toContain('bi-window');
    expect(dockButton.title).toBe('Toggle Floating Mode');
    expect(onDockStateChange).toHaveBeenCalledWith(true);
    expect(onPersistPreferredDocked).toHaveBeenCalledWith(true);
    expect(onWorkspaceSync).toHaveBeenCalledOnce();
    expect(onLayoutChange).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(4);

    expect(toggleFindReplaceDockMode({
      contentContainer,
      currentDocked: true,
      dockButton,
      documentRef: document,
      floatingPosition: { left: '12px', right: 'auto', top: '34px' },
      onDockStateChange,
      onLayoutChange,
      onPersistPreferredDocked,
      onWorkspaceSync,
      panel,
      viewportWidth: 1440
    })).toEqual({
      docked: false,
      persistedPreference: false
    });
    expect(panel.parentElement).toBe(document.body);
    expect(contentContainer.classList.contains('fr-docked')).toBe(false);
    expect(contentContainer.style.getPropertyValue('--dock-width')).toBe('0px');
    expect(panel.style.left).toBe('12px');
    expect(panel.style.top).toBe('34px');
    expect(panel.style.right).toBe('auto');
    expect(dockButton.innerHTML).toContain('bi-layout-sidebar-reverse');
    expect(dockButton.title).toBe('Toggle Dock Mode');
    expect(onDockStateChange).toHaveBeenLastCalledWith(false);
    expect(onPersistPreferredDocked).toHaveBeenLastCalledWith(false);
  });

  it('forces floating mode on small screens without persisting preference', () => {
    const { contentContainer, dockButton, panel } = setupPanelDom();
    contentContainer.appendChild(panel);
    contentContainer.classList.add('fr-docked');
    const onDockStateChange = vi.fn();
    const onLayoutChange = vi.fn();
    const onPersistPreferredDocked = vi.fn();
    const onWorkspaceSync = vi.fn();

    expect(toggleFindReplaceDockMode({
      contentContainer,
      currentDocked: true,
      dockButton,
      documentRef: document,
      floatingPosition: { left: '20px', right: 'auto', top: '30px' },
      onDockStateChange,
      onLayoutChange,
      onPersistPreferredDocked,
      onWorkspaceSync,
      panel,
      viewportWidth: 900
    })).toEqual({
      docked: false,
      persistedPreference: null
    });

    expect(panel.parentElement).toBe(document.body);
    expect(contentContainer.classList.contains('fr-docked')).toBe(false);
    expect(panel.style.left).toBe('20px');
    expect(panel.style.top).toBe('30px');
    expect(onDockStateChange).toHaveBeenCalledWith(false);
    expect(onPersistPreferredDocked).not.toHaveBeenCalled();
    expect(onWorkspaceSync).not.toHaveBeenCalled();
    expect(onLayoutChange).toHaveBeenCalledOnce();
  });

  it('drags a floating panel inside viewport bounds', () => {
    document.body.innerHTML = `
      <div id="find-replace-modal">
        <div id="find-replace-drag-handle"></div>
      </div>
    `;
    const panel = document.getElementById('find-replace-modal') as HTMLDivElement;
    const handle = document.getElementById('find-replace-drag-handle') as HTMLDivElement;
    const onPositionChange = vi.fn();
    Object.defineProperty(panel, 'offsetLeft', { value: 100 });
    Object.defineProperty(panel, 'offsetTop', { value: 80 });
    Object.defineProperty(panel, 'offsetWidth', { value: 300 });
    Object.defineProperty(panel, 'offsetHeight', { value: 120 });

    const attachment = attachFindReplacePanelDrag({
      documentRef: document,
      handle,
      isDocked: () => false,
      onPositionChange,
      panel,
      viewportHeight: () => 500,
      viewportWidth: () => 800
    });
    expect(attachment).not.toBeNull();

    handle.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      clientX: 120,
      clientY: 100
    }));
    expect(document.body.classList.contains('resizing')).toBe(true);

    document.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 900,
      clientY: 600
    }));
    expect(panel.style.left).toBe('500px');
    expect(panel.style.top).toBe('380px');
    expect(panel.style.right).toBe('auto');
    expect(onPositionChange).toHaveBeenCalledWith({
      left: '500px',
      right: 'auto',
      top: '380px'
    });

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(document.body.classList.contains('resizing')).toBe(false);
    attachment?.detach();
  });

  it('does not start dragging while docked, on mobile width, or from header actions', () => {
    document.body.innerHTML = `
      <div id="find-replace-modal">
        <div id="find-replace-drag-handle">
          <button class="find-replace-header-actions"></button>
        </div>
      </div>
    `;
    const panel = document.getElementById('find-replace-modal') as HTMLDivElement;
    const handle = document.getElementById('find-replace-drag-handle') as HTMLDivElement;
    const headerButton = document.querySelector('.find-replace-header-actions') as HTMLButtonElement;
    const onPositionChange = vi.fn();

    attachFindReplacePanelDrag({
      documentRef: document,
      handle,
      isDocked: () => true,
      onPositionChange,
      panel,
      viewportHeight: () => 500,
      viewportWidth: () => 800
    });
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 }));
    expect(document.body.classList.contains('resizing')).toBe(false);

    attachFindReplacePanelDrag({
      documentRef: document,
      handle,
      isDocked: () => false,
      onPositionChange,
      panel,
      viewportHeight: () => 500,
      viewportWidth: () => 500
    });
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 }));
    expect(document.body.classList.contains('resizing')).toBe(false);

    attachFindReplacePanelDrag({
      documentRef: document,
      handle,
      isDocked: () => false,
      onPositionChange,
      panel,
      viewportHeight: () => 500,
      viewportWidth: () => 800
    });
    headerButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 }));
    expect(document.body.classList.contains('resizing')).toBe(false);
    expect(onPositionChange).not.toHaveBeenCalled();
  });

  it('resets docked layout when the find/replace panel closes', () => {
    const panel = document.createElement('div');
    const contentContainer = document.createElement('div');
    const onLayoutChange = vi.fn();
    contentContainer.classList.add('fr-docked');
    contentContainer.style.setProperty('--dock-width', '340px');

    expect(resetFindReplaceDockLayoutOnClose({
      contentContainer,
      docked: true,
      onLayoutChange,
      panel
    })).toBe(true);
    expect(contentContainer.classList.contains('fr-docked')).toBe(false);
    expect(contentContainer.style.getPropertyValue('--dock-width')).toBe('0px');
    expect(onLayoutChange).toHaveBeenCalledOnce();

    expect(resetFindReplaceDockLayoutOnClose({
      contentContainer,
      docked: false,
      onLayoutChange,
      panel
    })).toBe(false);
    expect(onLayoutChange).toHaveBeenCalledOnce();
  });
});
