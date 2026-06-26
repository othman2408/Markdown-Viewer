// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  createAppModalLifecycle,
  getFocusableModalElements,
  trapFocusInModal
} from '../../../lib/modals/appModalLifecycle';
import type { ModalLifecyclePatch } from '../../../lib/modals/lifecycle';

function makeVisible(element: HTMLElement): void {
  Object.defineProperty(element, 'offsetParent', {
    configurable: true,
    get: () => document.body
  });
}

function createModal(id = 'test-modal'): HTMLElement {
  const modal = document.createElement('div');
  modal.id = id;
  modal.setAttribute('aria-hidden', 'true');
  modal.style.display = 'none';
  document.body.appendChild(modal);
  return modal;
}

describe('app modal lifecycle DOM helpers', () => {
  it('finds enabled visible focusable elements only', () => {
    const modal = createModal();
    const button = document.createElement('button');
    const hiddenInput = document.createElement('input');
    const disabledButton = document.createElement('button');
    disabledButton.disabled = true;
    modal.append(button, hiddenInput, disabledButton);
    makeVisible(button);
    makeVisible(disabledButton);

    expect(getFocusableModalElements(modal)).toEqual([button]);
  });

  it('traps Tab focus inside the modal', () => {
    const modal = createModal();
    const first = document.createElement('button');
    const last = document.createElement('button');
    modal.append(first, last);
    makeVisible(first);
    makeVisible(last);

    first.focus();
    const shiftTab = new KeyboardEvent('keydown', { bubbles: true, key: 'Tab', shiftKey: true });
    const preventShiftTab = vi.spyOn(shiftTab, 'preventDefault');
    trapFocusInModal(modal, shiftTab);
    expect(preventShiftTab).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(last);

    const tab = new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' });
    const preventTab = vi.spyOn(tab, 'preventDefault');
    trapFocusInModal(modal, tab);
    expect(preventTab).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(first);
  });

  it('opens and closes modals with state sync, focus, and delayed hiding', () => {
    const patches: ModalLifecyclePatch[] = [];
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const modal = createModal('help-modal');
    const input = document.createElement('input');
    modal.appendChild(input);
    makeVisible(input);

    const timers: Array<() => void> = [];
    const lifecycle = createAppModalLifecycle({
      requestFrame: (callback) => {
        callback(0);
        return 1;
      },
      setTimer: (callback) => {
        timers.push(callback);
        return 1;
      },
      syncModalState: (patch) => patches.push(patch)
    });

    lifecycle.open(modal);

    expect(modal.style.display).toBe('flex');
    expect(modal.classList.contains('is-visible')).toBe(true);
    expect(modal.getAttribute('aria-hidden')).toBe('false');
    expect(document.activeElement).toBe(input);
    expect(lifecycle.getActiveModal()).toBe(modal);
    expect(patches).toEqual([{ activeModalId: 'help-modal' }]);

    lifecycle.close(modal);

    expect(modal.classList.contains('is-visible')).toBe(false);
    expect(modal.getAttribute('aria-hidden')).toBe('true');
    expect(lifecycle.getActiveModal()).toBeNull();
    expect(patches.at(-1)).toEqual({ activeModalId: null });
    expect(document.activeElement).toBe(opener);
    expect(modal.style.display).toBe('flex');

    timers[0]();
    expect(modal.style.display).toBe('none');
  });

  it('closes the previous modal when opening another modal', () => {
    const patches: ModalLifecyclePatch[] = [];
    const first = createModal('first-modal');
    const second = createModal('second-modal');
    const timers: Array<() => void> = [];
    const lifecycle = createAppModalLifecycle({
      requestFrame: (callback) => {
        callback(0);
        return 1;
      },
      setTimer: (callback) => {
        timers.push(callback);
        return 1;
      },
      syncModalState: (patch) => patches.push(patch)
    });

    lifecycle.open(first);
    lifecycle.open(second);

    expect(first.getAttribute('aria-hidden')).toBe('true');
    expect(second.getAttribute('aria-hidden')).toBe('false');
    expect(lifecycle.getActiveModal()).toBe(second);
    expect(patches).toEqual([
      { activeModalId: 'first-modal' },
      { activeModalId: null },
      { activeModalId: 'second-modal' }
    ]);
  });

  it('handles Escape and overlay pointer close callbacks', () => {
    const closeCallback = vi.fn();
    const modal = createModal('escape-modal');
    const lifecycle = createAppModalLifecycle({
      syncModalState: vi.fn()
    });

    lifecycle.open(modal, { onClose: closeCallback });

    const escape = new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' });
    const preventEscape = vi.spyOn(escape, 'preventDefault');
    modal.dispatchEvent(escape);
    expect(preventEscape).toHaveBeenCalledOnce();
    expect(closeCallback).toHaveBeenCalledOnce();

    modal.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(closeCallback).toHaveBeenCalledTimes(2);
  });
});
