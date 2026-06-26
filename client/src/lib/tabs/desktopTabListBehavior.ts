import type { Attachment } from 'svelte/attachments';

export interface DesktopTabListDispatchOptions {
  dispatchTabReorder(draggedTabId: string, targetTabId: string): void;
  dispatchTabSelect(tabId: string, closeMobileAfterSelect?: boolean): void;
}

export function getEventElement(event: Event): Element | null {
  return event.target instanceof Element ? event.target : null;
}

export function getKeyboardTargetIndex(key: string, activeIndex: number, itemCount: number): number {
  if (itemCount === 0 || activeIndex < 0) return -1;

  if (key === 'ArrowRight') return (activeIndex + 1) % itemCount;
  if (key === 'ArrowLeft') return (activeIndex - 1 + itemCount) % itemCount;
  if (key === 'Home') return 0;
  if (key === 'End') return itemCount - 1;

  return -1;
}

export function scheduleActiveTabScroll(tabListElement: HTMLDivElement): () => void {
  const rafId = requestAnimationFrame(() => {
    const activeItem = tabListElement.querySelector<HTMLElement>('.tab-item.active');
    activeItem?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    tabListElement.dispatchEvent(new Event('scroll'));
  });

  return () => cancelAnimationFrame(rafId);
}

function getTabItems(node: HTMLElement): HTMLElement[] {
  return Array.from(node.querySelectorAll<HTMLElement>('.tab-item'));
}

function getTabItemFromEvent(event: Event): HTMLElement | null {
  const target = getEventElement(event);
  return target?.closest<HTMLElement>('.tab-item') || null;
}

function eventStartedOnTabMenu(event: Event): boolean {
  return Boolean(getEventElement(event)?.closest('.tab-menu-btn'));
}

function getFocusedTabItem(items: HTMLElement[]): HTMLElement | null {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return null;

  return items.find((item) => item === activeElement || item.contains(activeElement)) || null;
}

function focusTabItem(items: HTMLElement[], targetIndex: number): void {
  items.forEach((item, index) => {
    item.tabIndex = index === targetIndex ? 0 : -1;
  });
  items[targetIndex]?.focus();
}

export function createDesktopTabListDispatch(options: DesktopTabListDispatchOptions): Attachment<HTMLDivElement> {
  return (node) => {
    let draggedTabId: string | null = null;

    function handleClick(event: MouseEvent): void {
      const target = getEventElement(event);
      if (!target || target.closest('.tab-menu-btn, .tab-menu-item')) return;

      const tabItem = target.closest<HTMLElement>('.tab-item');
      const tabId = tabItem?.dataset.tabId;
      if (!tabId) return;

      options.dispatchTabSelect(tabId, false);
    }

    function handleKeydown(event: KeyboardEvent): void {
      const items = getTabItems(node);
      const focusedItem = getFocusedTabItem(items);
      if (!focusedItem) return;

      const activeIndex = items.indexOf(focusedItem);
      const targetIndex = getKeyboardTargetIndex(event.key, activeIndex, items.length);
      if (targetIndex !== -1) {
        event.preventDefault();
        focusTabItem(items, targetIndex);
        return;
      }

      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      const tabId = focusedItem.dataset.tabId;
      if (!tabId) return;

      options.dispatchTabSelect(tabId, false);
      requestAnimationFrame(() => {
        getTabItems(node).find((item) => item.dataset.tabId === tabId)?.focus();
      });
    }

    function handleMouseDown(event: MouseEvent): void {
      if (eventStartedOnTabMenu(event)) {
        event.stopPropagation();
      }
    }

    function handleDragStart(event: DragEvent): void {
      if (eventStartedOnTabMenu(event)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const item = getTabItemFromEvent(event);
      if (!item) return;

      draggedTabId = item.dataset.tabId || null;
      if (draggedTabId && event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', draggedTabId);
      }
      setTimeout(() => item.classList.add('dragging'), 0);
    }

    function handleDragEnd(event: DragEvent): void {
      getTabItemFromEvent(event)?.classList.remove('dragging');
      draggedTabId = null;
    }

    function handleDragOver(event: DragEvent): void {
      const item = getTabItemFromEvent(event);
      if (!item) return;
      event.preventDefault();
      item.classList.add('drag-over');
    }

    function handleDragLeave(event: DragEvent): void {
      getTabItemFromEvent(event)?.classList.remove('drag-over');
    }

    function handleDrop(event: DragEvent): void {
      const item = getTabItemFromEvent(event);
      if (!item) return;

      event.preventDefault();
      item.classList.remove('drag-over');

      const targetTabId = item.dataset.tabId;
      if (!draggedTabId || !targetTabId || draggedTabId === targetTabId) return;

      options.dispatchTabReorder(draggedTabId, targetTabId);
    }

    node.addEventListener('mousedown', handleMouseDown);
    node.addEventListener('click', handleClick);
    node.addEventListener('keydown', handleKeydown);
    node.addEventListener('dragstart', handleDragStart);
    node.addEventListener('dragend', handleDragEnd);
    node.addEventListener('dragover', handleDragOver);
    node.addEventListener('dragleave', handleDragLeave);
    node.addEventListener('drop', handleDrop);

    return () => {
      node.removeEventListener('mousedown', handleMouseDown);
      node.removeEventListener('click', handleClick);
      node.removeEventListener('keydown', handleKeydown);
      node.removeEventListener('dragstart', handleDragStart);
      node.removeEventListener('dragend', handleDragEnd);
      node.removeEventListener('dragover', handleDragOver);
      node.removeEventListener('dragleave', handleDragLeave);
      node.removeEventListener('drop', handleDrop);
    };
  };
}
