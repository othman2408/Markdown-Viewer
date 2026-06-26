import type { ViewMode } from './workspace';
import type { LineNumberRenderState } from '../editor/lineNumbers';

export interface TextSelection {
  start: number;
  end: number;
  direction?: 'forward' | 'backward' | 'none';
}

export interface EditorState {
  value: string;
  selection: TextSelection;
  scrollTop: number;
  scrollLeft: number;
  viewMode: ViewMode;
  syncScrollingEnabled: boolean;
  lineNumbers: LineNumberRenderState;
}

export type MarkdownFormatAction =
  | 'undo'
  | 'redo'
  | 'clear-formatting'
  | 'bold'
  | 'strike'
  | 'italic'
  | 'quote'
  | 'title-case'
  | 'uppercase'
  | 'lowercase'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'heading'
  | 'unordered-list'
  | 'ordered-list'
  | 'horizontal-rule'
  | 'link'
  | 'reference'
  | 'image'
  | 'inline-code'
  | 'code-block'
  | 'terminal-block'
  | 'table'
  | 'date-time'
  | 'math'
  | 'mermaid'
  | 'emoji'
  | 'symbols'
  | 'alert'
  | 'fullscreen'
  | 'find'
  | 'help'
  | 'info'
  | 'find-replace';
