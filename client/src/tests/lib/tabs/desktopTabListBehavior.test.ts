// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDesktopTabListDispatch,
  getKeyboardTargetIndex,
  scheduleActiveTabScroll
} from '../../../lib/tabs/desktopTabListBehavior';

function createTabList(): HTMLDivElement {
  const list = document.createElement('div');
  list.innerHTML = `
    <div class="tab-item" data-tab-id="one" tabindex="0"><span class="tab-title">One</span><button class="tab-menu-btn">Menu</button></div>
    <div class="tab-item active" data-tab-id="two" tabindex="-1"><span class="tab-title">Two</span></div>
    <div class="tab-item" data-tab-id="three" tabindex="-1"><span class="tab-title">Three</span></div>
  `;
  document.body.appendChild(list);
  return list;
}

describe('desktop tab list behavior', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('resolves keyboard navigation targets using the DOM tab order', () => {
    expect(getKeyboardTargetIndex('ArrowRight', 1, 3)).toBe(2);
    expect(getKeyboardTargetIndex('ArrowRight', 2, 3)).toBe(0);
    expect(getKeyboardTargetIndex('ArrowLeft', 0, 3)).toBe(2);
    expect(getKeyboardTargetIndex('Home', 2, 3)).toBe(0);
    expect(getKeyboardTargetIndex('End', 0, 3)).toBe(2);
    expect(getKeyboardTargetIndex('PageDown', 0, 3)).toBe(-1);
    expect(getKeyboardTargetIndex('ArrowRight', -1, 3)).toBe(-1);
    expect(getKeyboardTargetIndex('ArrowRight', 0, 0)).toBe(-1);
  });

  it('dispatches tab selection from item clicks and ignores menu clicks', () => {
    const list = createTabList();
    const dispatchTabSelect = vi.fn();
    const cleanup = createDesktopTabListDispatch({
      dispatchTabReorder: vi.fn(),
      dispatchTabSelect
    })(list);

    list.querySelector<HTMLElement>('[data-tab-id="one"] .tab-title')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    list.querySelector<HTMLElement>('[data-tab-id="one"] .tab-menu-btn')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(dispatchTabSelect).toHaveBeenCalledTimes(1);
    expect(dispatchTabSelect).toHaveBeenCalledWith('one', false);
    cleanup?.();
  });

  it('moves focus with arrow keys and dispatches selection with Enter', () => {
    const list = createTabList();
    const dispatchTabSelect = vi.fn();
    const cleanup = createDesktopTabListDispatch({
      dispatchTabReorder: vi.fn(),
      dispatchTabSelect
    })(list);
    const tabs = Array.from(list.querySelectorAll<HTMLElement>('.tab-item'));

    tabs[0].focus();
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);

    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(dispatchTabSelect).toHaveBeenCalledWith('two', false);
    cleanup?.();
  });

  it('dispatches tab reorder through drag and drop events', async () => {
    const list = createTabList();
    const dispatchTabReorder = vi.fn();
    const cleanup = createDesktopTabListDispatch({
      dispatchTabReorder,
      dispatchTabSelect: vi.fn()
    })(list);
    const firstTab = list.querySelector<HTMLElement>('[data-tab-id="one"]');
    const thirdTab = list.querySelector<HTMLElement>('[data-tab-id="three"]');

    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn()
    };
    const dragStartEvent = new Event('dragstart', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(dragStartEvent, 'dataTransfer', { value: dataTransfer });
    firstTab?.dispatchEvent(dragStartEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dataTransfer.effectAllowed).toBe('move');
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'one');
    expect(firstTab?.classList.contains('dragging')).toBe(true);

    const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true });
    thirdTab?.dispatchEvent(dragOverEvent);
    expect(dragOverEvent.defaultPrevented).toBe(true);
    expect(thirdTab?.classList.contains('drag-over')).toBe(true);

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
    thirdTab?.dispatchEvent(dropEvent);

    expect(dispatchTabReorder).toHaveBeenCalledWith('one', 'three');
    expect(thirdTab?.classList.contains('drag-over')).toBe(false);
    cleanup?.();
  });

  it('scrolls the active tab into view on the next animation frame', () => {
    const list = createTabList();
    const activeTab = list.querySelector<HTMLElement>('.tab-item.active');
    const scrollIntoView = vi.fn();
    const scrollListener = vi.fn();
    const animationFrameRef: { current: FrameRequestCallback | null } = { current: null };
    activeTab!.scrollIntoView = scrollIntoView;
    list.addEventListener('scroll', scrollListener);
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      animationFrameRef.current = callback;
      return 7;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const cleanup = scheduleActiveTabScroll(list);
    const runAnimationFrame = animationFrameRef.current;
    if (!runAnimationFrame) throw new Error('Expected active tab scroll to schedule an animation frame');
    runAnimationFrame(1);

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
    expect(scrollListener).toHaveBeenCalledTimes(1);

    cleanup();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
  });
});
