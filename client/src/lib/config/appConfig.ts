export const GLOBAL_STATE_KEY = 'markdownViewerGlobalState';
export const STORAGE_KEY = 'markdownViewerTabs';
export const ACTIVE_TAB_KEY = 'markdownViewerActiveTab';
export const UNTITLED_COUNTER_KEY = 'markdownViewerUntitledCounter';
export const FIND_REPLACE_DOCKED_KEY = 'find-replace-docked';

export const APP_VERSION = '3.7.9-cloud.1';

export const LARGE_DOCUMENT_THRESHOLD = 15000;
export const HUGE_DOCUMENT_THRESHOLD = 100000;

export const PREVIEW_ENGINE_V2_ENABLED = true;
export const PREVIEW_WORKER_THRESHOLD = 50000;
export const PREVIEW_WORKER_TIMEOUT = 12000;
export const PREVIEW_SEGMENT_MIN_BLOCKS = 8;
export const PREVIEW_BLOCK_REUSE_LIMIT = 12000;
export const PREVIEW_SANITIZE_OPTIONS = {
  ADD_TAGS: ['mjx-container', 'input'],
  ADD_ATTR: ['id', 'class', 'style', 'align', 'type', 'checked', 'disabled', 'data-original-code', 'role', 'aria-labelledby', 'aria-describedby'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
};

export const RENDER_DELAY = 100;
export const LARGE_RENDER_DELAY = 160;
export const HUGE_RENDER_DELAY = 240;

export const SCROLL_SYNC_DELAY = 10;

export const LARGE_EDITOR_WORK_DELAY = 180;
export const HUGE_EDITOR_WORK_DELAY = 320;
export const FIND_REFRESH_DELAY = 120;
export const LARGE_FIND_REFRESH_DELAY = 320;
