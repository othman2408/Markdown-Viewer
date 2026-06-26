export type ExportSanitizeMode = 'canvas' | 'standalone-html';

export interface ExportSanitizeOptions {
  ADD_ATTR: string[];
  ADD_TAGS: string[];
  ALLOWED_URI_REGEXP: RegExp;
}

const allowedExportUriPattern = /^(?:(?:https?|mailto|tel|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

const sharedExportAttributes = [
  'id',
  'class',
  'style',
  'align',
  'type',
  'checked',
  'disabled',
  'data-original-code'
];

const standaloneHtmlTags = ['mjx-container', 'input'];

const canvasExportTags = [
  'mjx-container',
  'svg',
  'path',
  'g',
  'marker',
  'defs',
  'pattern',
  'clipPath',
  'input'
];

const canvasExportAttributes = [
  'id',
  'class',
  'style',
  'align',
  'viewBox',
  'd',
  'fill',
  'stroke',
  'transform',
  'marker-end',
  'marker-start',
  'type',
  'checked',
  'disabled',
  'data-original-code'
];

export function createExportSanitizeOptions(mode: ExportSanitizeMode): ExportSanitizeOptions {
  return {
    ADD_ATTR: [...(mode === 'canvas' ? canvasExportAttributes : sharedExportAttributes)],
    ADD_TAGS: [...(mode === 'canvas' ? canvasExportTags : standaloneHtmlTags)],
    ALLOWED_URI_REGEXP: allowedExportUriPattern
  };
}
