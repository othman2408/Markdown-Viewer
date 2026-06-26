// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createScreenReaderAnnouncer } from '../../../lib/a11y/screenReaderAnnouncer';

describe('screen reader announcer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('clears current text and announces after the configured delay', () => {
    const element = document.createElement('div');
    const queued: Array<() => void> = [];
    const setTimeoutFn = vi.fn((callback: () => void) => {
      queued.push(callback);
      return queued.length;
    });
    element.id = 'app-accessibility-announcer';
    element.textContent = 'Previous';
    document.body.appendChild(element);
    const announcer = createScreenReaderAnnouncer({
      documentRef: document,
      setTimeoutFn
    });

    announcer.announce('Imported.');

    expect(element.textContent).toBe('');
    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 50);

    queued[0]();
    expect(element.textContent).toBe('Imported.');
  });

  it('clears pending announcements before scheduling a new one', () => {
    const element = document.createElement('div');
    const queued: Array<() => void> = [];
    const clearTimeoutFn = vi.fn<(handle: unknown) => void>();
    const setTimeoutFn = vi.fn((callback: () => void) => {
      queued.push(callback);
      return `timer-${queued.length}`;
    });
    element.id = 'app-accessibility-announcer';
    document.body.appendChild(element);
    const announcer = createScreenReaderAnnouncer({
      clearTimeoutFn,
      documentRef: document,
      setTimeoutFn
    });

    announcer.announce('First');
    announcer.announce('Second');

    expect(clearTimeoutFn).toHaveBeenCalledWith('timer-1');
    queued[1]();
    expect(element.textContent).toBe('Second');
  });

  it('supports custom announcer ids and explicit clear', () => {
    const element = document.createElement('div');
    const clearTimeoutFn = vi.fn<(handle: unknown) => void>();
    const setTimeoutFn = vi.fn(() => 99);
    element.id = 'custom-announcer';
    document.body.appendChild(element);
    const announcer = createScreenReaderAnnouncer({
      clearTimeoutFn,
      documentRef: document,
      elementId: 'custom-announcer',
      setTimeoutFn
    });

    announcer.announce('Ready');
    announcer.clear();

    expect(clearTimeoutFn).toHaveBeenCalledWith(99);
  });

  it('ignores missing announcer elements without scheduling timers', () => {
    const setTimeoutFn = vi.fn();
    const announcer = createScreenReaderAnnouncer({
      documentRef: document,
      elementId: 'missing-announcer',
      setTimeoutFn
    });

    announcer.announce('No-op');

    expect(setTimeoutFn).not.toHaveBeenCalled();
  });
});
