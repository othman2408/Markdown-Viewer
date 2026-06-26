// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyTabOverflowState,
  createTabBarOverflowControls,
  getTabOverflowState,
  scrollTabList
} from '../../../lib/tabs/tabBarOverflowBehavior';

function createTabBar(): { tabBar: HTMLDivElement; tabList: HTMLDivElement } {
  const tabBar = document.createElement('div');
  tabBar.innerHTML = `
    <button type="button" class="tab-scroll-btn tab-scroll-left"></button>
    <div id="tab-list" class="tab-list"></div>
    <button type="button" class="tab-scroll-btn tab-scroll-right"></button>
  `;
  document.body.appendChild(tabBar);
  const tabList = tabBar.querySelector<HTMLDivElement>('#tab-list');
  if (!tabList) throw new Error('Expected test tab list');

  Object.defineProperty(tabList, 'clientWidth', { configurable: true, value: 100 });
  Object.defineProperty(tabList, 'scrollWidth', { configurable: true, value: 300 });
  Object.defineProperty(tabList, 'scrollLeft', { configurable: true, writable: true, value: 0 });

  return {
    tabBar,
    tabList
  };
}

function installAnimationFrameQueue(): FrameRequestCallback[] {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  return frames;
}

function flushAnimationFrames(frames: FrameRequestCallback[]): void {
  while (frames.length > 0) {
    frames.shift()?.(0);
  }
}

describe('tab bar overflow behavior', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('detects and applies tab overflow classes', () => {
    const { tabBar, tabList } = createTabBar();

    expect(getTabOverflowState(tabList)).toEqual({ hasLeft: false, hasRight: true });
    applyTabOverflowState(tabBar, { hasLeft: true, hasRight: false });

    expect(tabBar.classList.contains('has-overflow-left')).toBe(true);
    expect(tabBar.classList.contains('has-overflow-right')).toBe(false);
  });

  it('scrolls through smooth scroll when available and falls back to scrollLeft', () => {
    const { tabList } = createTabBar();
    const scrollBy = vi.fn();
    tabList.scrollBy = scrollBy;

    scrollTabList(tabList, 200);
    expect(scrollBy).toHaveBeenCalledWith({ left: 200, behavior: 'smooth' });

    tabList.scrollBy = undefined as unknown as typeof tabList.scrollBy;
    scrollTabList(tabList, -50);
    expect(tabList.scrollLeft).toBe(-50);
  });

  it('updates overflow state from scroll buttons and vertical wheel movement', () => {
    const frames = installAnimationFrameQueue();
    const { tabBar, tabList } = createTabBar();
    tabList.scrollBy = ((options?: number | ScrollToOptions) => {
      const left = typeof options === 'number' ? options : options?.left;
      tabList.scrollLeft += Number(left || 0);
      tabList.dispatchEvent(new Event('scroll'));
    }) as typeof tabList.scrollBy;
    const cleanup = createTabBarOverflowControls()(tabBar);

    flushAnimationFrames(frames);
    expect(tabBar.classList.contains('has-overflow-left')).toBe(false);
    expect(tabBar.classList.contains('has-overflow-right')).toBe(true);

    tabBar.querySelector<HTMLButtonElement>('.tab-scroll-right')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    flushAnimationFrames(frames);

    expect(tabList.scrollLeft).toBe(200);
    expect(tabBar.classList.contains('has-overflow-left')).toBe(true);
    expect(tabBar.classList.contains('has-overflow-right')).toBe(false);

    tabList.dispatchEvent(new WheelEvent('wheel', { deltaY: -50, deltaX: 0, bubbles: true, cancelable: true }));
    flushAnimationFrames(frames);

    expect(tabList.scrollLeft).toBe(150);
    expect(tabBar.classList.contains('has-overflow-left')).toBe(true);
    expect(tabBar.classList.contains('has-overflow-right')).toBe(true);
    cleanup?.();
  });

  it('ignores mostly horizontal wheel movement', () => {
    const frames = installAnimationFrameQueue();
    const { tabBar, tabList } = createTabBar();
    const cleanup = createTabBarOverflowControls()(tabBar);
    flushAnimationFrames(frames);

    const wheelEvent = new WheelEvent('wheel', { deltaY: 10, deltaX: 20, bubbles: true, cancelable: true });
    tabList.dispatchEvent(wheelEvent);

    expect(wheelEvent.defaultPrevented).toBe(false);
    expect(tabList.scrollLeft).toBe(0);
    cleanup?.();
  });
});
