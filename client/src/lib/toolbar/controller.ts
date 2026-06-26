import type { MarkdownFormatAction } from '../types/editor';

const MARKDOWN_TOOLBAR_ACTIONS: MarkdownFormatAction[] = [
  'undo',
  'redo',
  'clear-formatting',
  'bold',
  'strike',
  'italic',
  'quote',
  'title-case',
  'uppercase',
  'lowercase',
  'align-left',
  'align-center',
  'align-right',
  'heading',
  'unordered-list',
  'ordered-list',
  'horizontal-rule',
  'link',
  'reference',
  'image',
  'inline-code',
  'code-block',
  'terminal-block',
  'table',
  'date-time',
  'math',
  'mermaid',
  'emoji',
  'symbols',
  'alert',
  'fullscreen',
  'find',
  'help',
  'info',
  'find-replace'
];

const markdownToolbarActionSet = new Set<string>(MARKDOWN_TOOLBAR_ACTIONS);
const toolbarActionSelector = '[data-md-action]';
const directionToggleSelector = '#direction-toggle';

export interface MarkdownToolbarCommandHandlers {
  runMarkdownTool(action: MarkdownFormatAction, button: HTMLElement): void;
  toggleContentDirection(): void;
}

export interface MarkdownToolbarCommandController {
  runClick(target: Element | null): boolean;
  shouldPreventMouseDown(target: Element | null): boolean;
}

interface MarkdownToolbarActionCommand {
  action: MarkdownFormatAction;
  button: HTMLElement;
}

function isMarkdownFormatAction(action: string | undefined): action is MarkdownFormatAction {
  return Boolean(action && markdownToolbarActionSet.has(action));
}

export function resolveMarkdownToolbarAction(target: Element | null): MarkdownToolbarActionCommand | null {
  const button = target?.closest<HTMLElement>(toolbarActionSelector) || null;
  const action = button?.dataset.mdAction;
  if (!button || !isMarkdownFormatAction(action)) return null;

  return {
    action,
    button
  };
}

export function targetIsDirectionToggle(target: Element | null): boolean {
  return Boolean(target?.closest(directionToggleSelector));
}

export function createMarkdownToolbarCommandController(
  handlers: MarkdownToolbarCommandHandlers
): MarkdownToolbarCommandController {
  return {
    runClick(target) {
      const command = resolveMarkdownToolbarAction(target);
      if (command) {
        handlers.runMarkdownTool(command.action, command.button);
        return true;
      }

      if (targetIsDirectionToggle(target)) {
        handlers.toggleContentDirection();
        return true;
      }

      return false;
    },
    shouldPreventMouseDown(target) {
      return Boolean(resolveMarkdownToolbarAction(target) || targetIsDirectionToggle(target));
    }
  };
}
