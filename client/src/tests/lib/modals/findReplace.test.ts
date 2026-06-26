// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  attachFindReplaceModalDomHandlers,
  constrainFindReplaceFloatingPosition,
  createDefaultFindReplaceOptions,
  handleFindReplaceShortcut,
  normalizeFindReplaceOptions,
  prepareFindReplaceClose,
  prepareFindReplaceControlsState,
  prepareFindReplaceDrawerState,
  prepareFindReplaceDockState,
  prepareFindReplaceErrorHidden,
  prepareFindReplaceErrorVisible,
  prepareFindReplaceOptionToggle,
  prepareFindReplaceOpen,
  renderFindReplaceDiffPreview,
  renderFindReplaceHistoryOptions,
  resetFindReplaceFloatingPosition
} from '../../../lib/modals/findReplace';

describe('find/replace modal helpers', () => {
  it('prepares open, close, and docked state patches', () => {
    expect(prepareFindReplaceOpen(true)).toEqual({
      findReplaceOpen: true,
      findReplaceDocked: true
    });
    expect(prepareFindReplaceOpen(false)).toEqual({
      findReplaceOpen: true,
      findReplaceDocked: false
    });
    expect(prepareFindReplaceClose()).toEqual({
      findReplaceOpen: false
    });
    expect(prepareFindReplaceDockState(1)).toEqual({
      findReplaceDocked: true
    });
    expect(prepareFindReplaceDockState(0)).toEqual({
      findReplaceDocked: false
    });
    expect(prepareFindReplaceDrawerState('open')).toEqual({
      findReplaceDrawerOpen: true
    });
    expect(prepareFindReplaceDrawerState(0)).toEqual({
      findReplaceDrawerOpen: false
    });
    expect(prepareFindReplaceErrorHidden()).toEqual({
      findReplaceErrorVisible: false
    });
    expect(prepareFindReplaceErrorVisible('Invalid regular expression')).toEqual({
      findReplaceErrorVisible: true,
      findReplaceErrorMessage: 'Invalid regular expression'
    });
    expect(prepareFindReplaceErrorVisible(null)).toEqual({
      findReplaceErrorVisible: true,
      findReplaceErrorMessage: ''
    });
    expect(prepareFindReplaceControlsState(2, 5, true)).toEqual({
      findReplaceMatchCurrent: 2,
      findReplaceMatchTotal: 5,
      findReplaceHasQuery: true
    });
    expect(prepareFindReplaceControlsState(12.8, 5.9, 1)).toEqual({
      findReplaceMatchCurrent: 5,
      findReplaceMatchTotal: 5,
      findReplaceHasQuery: true
    });
    expect(prepareFindReplaceControlsState(-1, 'bad', '')).toEqual({
      findReplaceMatchCurrent: 0,
      findReplaceMatchTotal: 0,
      findReplaceHasQuery: false
    });
    expect(createDefaultFindReplaceOptions()).toEqual({
      findReplaceMatchCase: false,
      findReplaceWholeWord: false,
      findReplaceUseRegex: false,
      findReplaceInSelection: false,
      findReplacePreserveCase: false,
      findReplaceWrapAround: true
    });
    expect(normalizeFindReplaceOptions({ findReplaceMatchCase: true, findReplaceWrapAround: false })).toEqual({
      findReplaceMatchCase: true,
      findReplaceWholeWord: false,
      findReplaceUseRegex: false,
      findReplaceInSelection: false,
      findReplacePreserveCase: false,
      findReplaceWrapAround: false
    });
    expect(prepareFindReplaceOptionToggle(createDefaultFindReplaceOptions(), 'find-regex')).toMatchObject({
      findReplaceUseRegex: true,
      findReplaceWrapAround: true
    });
    expect(prepareFindReplaceOptionToggle({ findReplaceUseRegex: true }, 'find-regex')).toMatchObject({
      findReplaceUseRegex: false,
      findReplaceWrapAround: true
    });
    expect(prepareFindReplaceOptionToggle(createDefaultFindReplaceOptions(), 'not-real')).toEqual(createDefaultFindReplaceOptions());
  });

  it('renders find history options without carrying stale options', () => {
    const select = document.createElement('select');
    select.innerHTML = '<option value="old">Old</option>';

    renderFindReplaceHistoryOptions(select, ['alpha', 'beta']);

    expect([...select.options].map((option) => [option.value, option.textContent])).toEqual([
      ['', 'Recent queries...'],
      ['alpha', 'alpha'],
      ['beta', 'beta']
    ]);
  });

  it('renders a safe diff preview and opens the app modal', () => {
    document.body.innerHTML = `
      <div id="find-replace-diff-modal"></div>
      <div id="find-replace-diff-container"></div>
      <button id="find-replace-diff-confirm"></button>
    `;
    const openCalls: Array<{ focusTarget?: HTMLElement | null; modal: HTMLElement; onClose?: () => void }> = [];
    const closed: HTMLElement[] = [];

    const rendered = renderFindReplaceDiffPreview({
      originalValue: 'same\n<script>alert(1)</script>\nend',
      draftValue: 'same\nchanged\nend',
      openModal(modal, options) {
        openCalls.push({ modal, ...options });
      },
      closeModal(modal) {
        closed.push(modal);
      }
    });

    const container = document.getElementById('find-replace-diff-container') as HTMLDivElement;
    expect(rendered).toBe(true);
    expect(container.querySelectorAll('.diff-line')).toHaveLength(4);
    expect(container.innerHTML).not.toContain('<script>');
    expect(container.querySelector('.deletion .diff-line-content')?.textContent).toBe('- <script>alert(1)</script>');
    expect(container.querySelector('.addition .diff-line-content')?.textContent).toBe('+ changed');
    expect(openCalls).toHaveLength(1);
    expect(openCalls[0].modal.id).toBe('find-replace-diff-modal');
    expect(openCalls[0].focusTarget?.id).toBe('find-replace-diff-confirm');

    openCalls[0].onClose?.();
    expect(closed[0]?.id).toBe('find-replace-diff-modal');
  });

  it('resets and constrains floating find/replace panel position', () => {
    const panel = document.createElement('div');
    panel.style.left = '900px';
    panel.style.top = '500px';
    panel.style.right = 'auto';
    Object.defineProperty(panel, 'offsetWidth', { value: 300 });
    Object.defineProperty(panel, 'offsetHeight', { value: 200 });

    expect(constrainFindReplaceFloatingPosition({
      docked: false,
      panel,
      viewportHeight: 600,
      viewportWidth: 1000
    })).toEqual({
      left: '700px',
      top: '400px'
    });
    expect(panel.style.left).toBe('700px');
    expect(panel.style.top).toBe('400px');

    expect(resetFindReplaceFloatingPosition(panel)).toEqual({
      left: null,
      right: null,
      top: null
    });
    expect(panel.style.left).toBe('');
    expect(panel.style.top).toBe('');
    expect(panel.style.right).toBe('');
  });

  it('routes find/replace keyboard shortcuts and focuses the requested field', () => {
    document.body.innerHTML = `
      <input id="find-replace-input" value="find me" />
      <input id="find-replace-with" value="replace me" />
    `;
    const findInput = document.getElementById('find-replace-input') as HTMLInputElement;
    const replaceInput = document.getElementById('find-replace-with') as HTMLInputElement;
    const findSelect = vi.spyOn(findInput, 'select');
    const replaceSelect = vi.spyOn(replaceInput, 'select');
    const handlers = {
      closeFindReplaceModal: vi.fn(),
      openFindReplaceModal: vi.fn()
    };
    const findEvent = {
      ctrlKey: true,
      key: 'F',
      metaKey: false,
      preventDefault: vi.fn()
    };
    const replaceEvent = {
      ctrlKey: false,
      key: 'h',
      metaKey: true,
      preventDefault: vi.fn()
    };

    expect(handleFindReplaceShortcut(findEvent, { documentRef: document, isFindModalOpen: false }, handlers)).toBe(true);
    expect(findEvent.preventDefault).toHaveBeenCalledOnce();
    expect(handlers.openFindReplaceModal).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(findInput);
    expect(findSelect).toHaveBeenCalledOnce();

    expect(handleFindReplaceShortcut(replaceEvent, { documentRef: document, isFindModalOpen: false }, handlers)).toBe(true);
    expect(replaceEvent.preventDefault).toHaveBeenCalledOnce();
    expect(handlers.openFindReplaceModal).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(replaceInput);
    expect(replaceSelect).toHaveBeenCalledOnce();
  });

  it('closes the find/replace panel on Escape only when it is open', () => {
    const handlers = {
      closeFindReplaceModal: vi.fn(),
      openFindReplaceModal: vi.fn()
    };
    const closedEvent = {
      ctrlKey: false,
      key: 'Escape',
      metaKey: false,
      preventDefault: vi.fn()
    };
    const openEvent = {
      ctrlKey: false,
      key: 'Escape',
      metaKey: false,
      preventDefault: vi.fn()
    };

    expect(handleFindReplaceShortcut(closedEvent, { documentRef: document, isFindModalOpen: false }, handlers)).toBe(false);
    expect(closedEvent.preventDefault).not.toHaveBeenCalled();
    expect(handlers.closeFindReplaceModal).not.toHaveBeenCalled();

    expect(handleFindReplaceShortcut(openEvent, { documentRef: document, isFindModalOpen: true }, handlers)).toBe(true);
    expect(openEvent.preventDefault).toHaveBeenCalledOnce();
    expect(handlers.closeFindReplaceModal).toHaveBeenCalledOnce();
  });

  it('attaches find/replace modal DOM handlers', () => {
    document.body.innerHTML = `
      <div id="find-replace-modal"></div>
      <button id="find-regex"></button>
      <select id="find-replace-history"><option value="alpha">alpha</option></select>
      <select id="find-replace-scope"></select>
      <button id="find-replace-reset"></button>
      <button id="find-replace-dock"></button>
      <button id="fr-drawer-toggle"></button>
      <div id="fr-drawer-content" style="display:none"></div>
      <input id="find-replace-input" />
      <input id="find-replace-with" />
      <button id="find-prev"></button>
      <button id="find-next"></button>
      <button id="find-replace-current"></button>
      <button id="find-replace-all"></button>
      <button id="find-replace-close"></button>
      <button id="find-replace-close-icon"></button>
      <div id="find-replace-diff-modal"></div>
      <button id="find-replace-diff-confirm"></button>
      <button id="find-replace-diff-cancel"></button>
      <button id="find-replace-diff-close-icon"></button>
    `;
    const modal = document.getElementById('find-replace-modal') as HTMLDivElement;
    const findInput = document.getElementById('find-replace-input') as HTMLInputElement;
    const replaceInput = document.getElementById('find-replace-with') as HTMLInputElement;
    const historySelect = document.getElementById('find-replace-history') as HTMLSelectElement;
    const drawerContent = document.getElementById('fr-drawer-content') as HTMLDivElement;
    const handlers = {
      closeAppModal: vi.fn(),
      closeFindReplaceModal: vi.fn(),
      executeBulkReplace: vi.fn(),
      onFindInput: vi.fn(),
      onHistoryChange: vi.fn(),
      onOptionToggle: vi.fn(),
      onReplaceInput: vi.fn(),
      onScopeChange: vi.fn(),
      onToggleDock: vi.fn(),
      onToggleDrawer: vi.fn(),
      replaceAllMatches: vi.fn(),
      replaceCurrentMatch: vi.fn(),
      resetPosition: vi.fn(),
      selectFindMatch: vi.fn()
    };

    expect(attachFindReplaceModalDomHandlers({ documentRef: document, modal }, handlers)).toBe(true);

    document.getElementById('find-regex')?.click();
    historySelect.dispatchEvent(new Event('change'));
    document.getElementById('find-replace-scope')?.dispatchEvent(new Event('change'));
    document.getElementById('find-replace-reset')?.click();
    document.getElementById('find-replace-dock')?.click();
    document.getElementById('fr-drawer-toggle')?.click();
    findInput.dispatchEvent(new Event('input'));
    findInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    replaceInput.dispatchEvent(new Event('input'));
    document.getElementById('find-next')?.click();
    document.getElementById('find-replace-current')?.click();
    document.getElementById('find-replace-all')?.click();
    document.getElementById('find-replace-close')?.click();
    document.getElementById('find-replace-diff-confirm')?.click();
    document.getElementById('find-replace-diff-cancel')?.click();

    expect(handlers.onOptionToggle).toHaveBeenCalledWith('find-regex');
    expect(handlers.onHistoryChange).toHaveBeenCalledWith('alpha');
    expect(handlers.onScopeChange).toHaveBeenCalledOnce();
    expect(handlers.resetPosition).toHaveBeenCalledOnce();
    expect(handlers.onToggleDock).toHaveBeenCalledOnce();
    expect(handlers.onToggleDrawer).toHaveBeenCalledWith(true);
    expect(drawerContent.style.display).toBe('none');
    expect(handlers.onFindInput).toHaveBeenCalledOnce();
    expect(handlers.selectFindMatch).toHaveBeenCalledWith(-1);
    expect(handlers.selectFindMatch).toHaveBeenCalledWith(1);
    expect(handlers.onReplaceInput).toHaveBeenCalledOnce();
    expect(handlers.replaceCurrentMatch).toHaveBeenCalledOnce();
    expect(handlers.replaceAllMatches).toHaveBeenCalledOnce();
    expect(handlers.closeFindReplaceModal).toHaveBeenCalledOnce();
    expect(handlers.executeBulkReplace).toHaveBeenCalledOnce();
    expect(handlers.closeAppModal).toHaveBeenCalledTimes(2);
  });
});
