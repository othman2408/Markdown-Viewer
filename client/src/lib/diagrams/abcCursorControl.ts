const SVG_NS = 'http://www.w3.org/2000/svg';

export interface AbcTimingEvent {
  elements?: Element[][];
  height?: number;
  left?: number;
  top?: number;
}

export class AbcCursorControl {
  private readonly container: ParentNode;
  private currentElements: Element[] = [];
  private cursor: SVGLineElement | null = null;

  constructor(container: ParentNode) {
    this.container = container;
  }

  onStart(): void {
    const svg = this.container.querySelector('svg');
    if (!svg) return;

    svg.querySelector('.abcjs-cursor')?.remove();
    const documentRef = svg.ownerDocument;
    this.cursor = documentRef.createElementNS(SVG_NS, 'line');
    this.cursor.setAttribute('class', 'abcjs-cursor');
    this.cursor.setAttribute('x1', '0');
    this.cursor.setAttribute('y1', '0');
    this.cursor.setAttribute('x2', '0');
    this.cursor.setAttribute('y2', '0');
    svg.appendChild(this.cursor);
  }

  onEvent(event: AbcTimingEvent): void {
    this.removeHighlight();

    if (event.elements) {
      for (const note of event.elements) {
        for (const element of note) {
          element.classList.add('abcjs-highlight');
          this.currentElements.push(element);
        }
      }
    }

    if (!this.cursor || typeof event.left !== 'number') return;

    const svg = this.container.querySelector('svg');
    if (!svg) return;

    const x = event.left;
    const y1 = event.top || 0;
    const viewBoxHeight = svg.viewBox.baseVal.height || 500;
    const y2 = ((event.top ?? 0) + (event.height ?? 0)) || viewBoxHeight;
    this.cursor.setAttribute('x1', String(x));
    this.cursor.setAttribute('x2', String(x));
    this.cursor.setAttribute('y1', String(y1));
    this.cursor.setAttribute('y2', String(y2));
    this.cursor.style.display = 'block';
  }

  removeHighlight(): void {
    for (const element of this.currentElements) {
      element.classList.remove('abcjs-highlight');
    }
    this.currentElements = [];
  }

  onFinished(): void {
    this.removeHighlight();
    if (this.cursor) {
      this.cursor.remove();
      this.cursor = null;
    }
  }
}
