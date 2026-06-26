// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createMarkdownToolbarCommandController, resolveMarkdownToolbarAction, targetIsDirectionToggle } from '../../../lib/toolbar/controller';

describe('markdown toolbar command controller', () => {
  it('resolves valid markdown toolbar action buttons from nested targets', () => {
    const button = document.createElement('button');
    const icon = document.createElement('i');
    button.dataset.mdAction = 'heading';
    button.dataset.mdLevel = '2';
    button.appendChild(icon);

    const command = resolveMarkdownToolbarAction(icon);

    expect(command?.action).toBe('heading');
    expect(command?.button).toBe(button);
  });

  it('ignores missing or unknown toolbar actions', () => {
    const missing = document.createElement('button');
    const unknown = document.createElement('button');
    unknown.dataset.mdAction = 'not-real';

    expect(resolveMarkdownToolbarAction(missing)).toBeNull();
    expect(resolveMarkdownToolbarAction(unknown)).toBeNull();
    expect(resolveMarkdownToolbarAction(null)).toBeNull();
  });

  it('detects direction toggle targets', () => {
    const button = document.createElement('button');
    const child = document.createElement('span');
    button.id = 'direction-toggle';
    button.appendChild(child);

    expect(targetIsDirectionToggle(child)).toBe(true);
    expect(targetIsDirectionToggle(document.createElement('button'))).toBe(false);
  });

  it('routes clicks and mousedown prevention through typed handlers', () => {
    const calls: string[] = [];
    const actionButton = document.createElement('button');
    const directionButton = document.createElement('button');
    const unknownButton = document.createElement('button');
    actionButton.dataset.mdAction = 'bold';
    directionButton.id = 'direction-toggle';

    const controller = createMarkdownToolbarCommandController({
      runMarkdownTool(action, button) {
        calls.push(`tool:${action}:${button === actionButton}`);
      },
      toggleContentDirection() {
        calls.push('direction');
      }
    });

    expect(controller.shouldPreventMouseDown(actionButton)).toBe(true);
    expect(controller.shouldPreventMouseDown(directionButton)).toBe(true);
    expect(controller.shouldPreventMouseDown(unknownButton)).toBe(false);
    expect(controller.runClick(actionButton)).toBe(true);
    expect(controller.runClick(directionButton)).toBe(true);
    expect(controller.runClick(unknownButton)).toBe(false);
    expect(calls).toEqual(['tool:bold:true', 'direction']);
  });
});
