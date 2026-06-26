// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { AbcCursorControl } from '../../../lib/diagrams/abcCursorControl';

function setAbcDom(): HTMLElement {
  document.body.innerHTML = `
    <div id="abc">
      <svg viewBox="0 0 100 240">
        <line class="abcjs-cursor" x1="1" y1="1" x2="1" y2="1"></line>
        <g>
          <path id="note-a"></path>
          <path id="note-b"></path>
          <path id="note-c"></path>
        </g>
      </svg>
    </div>
  `;
  return document.getElementById('abc') as HTMLElement;
}

describe('ABC cursor control', () => {
  it('starts playback by replacing the old cursor with a new SVG line', () => {
    const container = setAbcDom();
    const control = new AbcCursorControl(container);

    control.onStart();

    const cursors = container.querySelectorAll('.abcjs-cursor');
    expect(cursors).toHaveLength(1);
    expect(cursors[0].tagName.toLowerCase()).toBe('line');
    expect(cursors[0].getAttribute('x1')).toBe('0');
    expect(cursors[0].getAttribute('y2')).toBe('0');
  });

  it('highlights current notes and moves the cursor on timing events', () => {
    const container = setAbcDom();
    const control = new AbcCursorControl(container);
    const noteA = container.querySelector<SVGPathElement>('#note-a')!;
    const noteB = container.querySelector<SVGPathElement>('#note-b')!;

    control.onStart();
    control.onEvent({
      elements: [[noteA], [noteB]],
      height: 30,
      left: 42,
      top: 12
    });

    const cursor = container.querySelector<SVGLineElement>('.abcjs-cursor');
    expect(noteA.classList.contains('abcjs-highlight')).toBe(true);
    expect(noteB.classList.contains('abcjs-highlight')).toBe(true);
    expect(cursor?.getAttribute('x1')).toBe('42');
    expect(cursor?.getAttribute('x2')).toBe('42');
    expect(cursor?.getAttribute('y1')).toBe('12');
    expect(cursor?.getAttribute('y2')).toBe('42');
    expect(cursor?.style.display).toBe('block');
  });

  it('removes previous highlights before applying new event highlights', () => {
    const container = setAbcDom();
    const control = new AbcCursorControl(container);
    const noteA = container.querySelector<SVGPathElement>('#note-a')!;
    const noteB = container.querySelector<SVGPathElement>('#note-b')!;

    control.onStart();
    control.onEvent({
      elements: [[noteA]],
      left: 10
    });
    control.onEvent({
      elements: [[noteB]],
      left: 20
    });

    expect(noteA.classList.contains('abcjs-highlight')).toBe(false);
    expect(noteB.classList.contains('abcjs-highlight')).toBe(true);
  });

  it('uses the SVG viewBox height when event height is missing', () => {
    const container = setAbcDom();
    const control = new AbcCursorControl(container);

    control.onStart();
    control.onEvent({
      left: 8
    });

    expect(container.querySelector('.abcjs-cursor')?.getAttribute('y2')).toBe('240');
  });

  it('cleans highlights and cursor when playback finishes', () => {
    const container = setAbcDom();
    const control = new AbcCursorControl(container);
    const noteA = container.querySelector<SVGPathElement>('#note-a')!;

    control.onStart();
    control.onEvent({
      elements: [[noteA]],
      left: 10
    });
    control.onFinished();

    expect(noteA.classList.contains('abcjs-highlight')).toBe(false);
    expect(container.querySelector('.abcjs-cursor')).toBeNull();
  });

  it('does nothing when the container has no SVG', () => {
    document.body.innerHTML = '<div id="abc"></div>';
    const container = document.getElementById('abc') as HTMLElement;
    const control = new AbcCursorControl(container);

    expect(() => {
      control.onStart();
      control.onEvent({ left: 1 });
      control.onFinished();
    }).not.toThrow();
  });
});
