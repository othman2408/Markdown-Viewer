import type { Attachment } from 'svelte/attachments';
import type { MarkdownToolbarCommandController } from './controller';

function getEventElement(event: Event): Element | null {
  return event.target instanceof Element ? event.target : null;
}

export function createMarkdownToolbarDispatchAttachment(
  commandController: MarkdownToolbarCommandController
): Attachment<HTMLDivElement> {
  function handleToolbarMouseDown(event: MouseEvent): void {
    const target = getEventElement(event);
    if (commandController.shouldPreventMouseDown(target)) {
      event.preventDefault();
    }
  }

  function handleToolbarClick(event: MouseEvent): void {
    const target = getEventElement(event);
    if (commandController.runClick(target)) {
      event.preventDefault();
    }
  }

  return (node) => {
    node.addEventListener('mousedown', handleToolbarMouseDown);
    node.addEventListener('click', handleToolbarClick);

    return () => {
      node.removeEventListener('mousedown', handleToolbarMouseDown);
      node.removeEventListener('click', handleToolbarClick);
    };
  };
}
