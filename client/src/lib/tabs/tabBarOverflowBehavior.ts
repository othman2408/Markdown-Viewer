import type { Attachment } from 'svelte/attachments';
import { getEventElement } from './desktopTabListBehavior';

export const TAB_SCROLL_DELTA = 200;

export interface TabOverflowState {
  hasLeft: boolean;
  hasRight: boolean;
}

export function getTabOverflowState(tabList: HTMLDivElement): TabOverflowState {
  return {
    hasLeft: tabList.scrollLeft > 1,
    hasRight: tabList.scrollLeft < (tabList.scrollWidth - tabList.clientWidth - 1)
  };
}

export function applyTabOverflowState(tabBar: HTMLElement, state: TabOverflowState): void {
  tabBar.classList.toggle('has-overflow-left', state.hasLeft);
  tabBar.classList.toggle('has-overflow-right', state.hasRight);
}

export function scrollTabList(tabList: HTMLDivElement, delta: number): void {
  if (typeof tabList.scrollBy === 'function') {
    tabList.scrollBy({ left: delta, behavior: 'smooth' });
    return;
  }

  tabList.scrollLeft += delta;
}

function getScrollButtonDelta(button: HTMLButtonElement): number {
  return button.classList.contains('tab-scroll-left') ? -TAB_SCROLL_DELTA : TAB_SCROLL_DELTA;
}

export function createTabBarOverflowControls(): Attachment<HTMLDivElement> {
  return (node) => {
    const resolvedTabList = node.querySelector<HTMLDivElement>('#tab-list');
    if (!resolvedTabList) return;

    const tabList = resolvedTabList;
    let overflowRafId = 0;
    let resizeObserver: ResizeObserver | null = null;

    function updateOverflowState(): void {
      if (overflowRafId) return;

      overflowRafId = requestAnimationFrame(() => {
        overflowRafId = 0;
        applyTabOverflowState(node, getTabOverflowState(tabList));
      });
    }

    function handleClick(event: MouseEvent): void {
      const target = getEventElement(event);
      const button = target?.closest<HTMLButtonElement>('.tab-scroll-btn');
      if (!button) return;

      scrollTabList(tabList, getScrollButtonDelta(button));
      updateOverflowState();
    }

    function handleWheel(event: WheelEvent): void {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      event.preventDefault();
      tabList.scrollLeft += event.deltaY;
      updateOverflowState();
    }

    node.addEventListener('click', handleClick);
    tabList.addEventListener('scroll', updateOverflowState);
    tabList.addEventListener('wheel', handleWheel, { passive: false });

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateOverflowState);
      resizeObserver.observe(tabList);
    } else {
      window.addEventListener('resize', updateOverflowState);
    }

    updateOverflowState();

    return () => {
      node.removeEventListener('click', handleClick);
      tabList.removeEventListener('scroll', updateOverflowState);
      tabList.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', updateOverflowState);
      resizeObserver?.disconnect();
      if (overflowRafId) cancelAnimationFrame(overflowRafId);
    };
  };
}
