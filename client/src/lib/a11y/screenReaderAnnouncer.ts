export interface ScreenReaderAnnouncerOptions {
  clearTimeoutFn?: (handle: unknown) => void;
  delayMs?: number;
  documentRef?: Document;
  elementId?: string;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
}

export interface ScreenReaderAnnouncer {
  announce(message: string): void;
  clear(): void;
}

const DEFAULT_ANNOUNCER_ID = 'app-accessibility-announcer';
const DEFAULT_DELAY_MS = 50;

export function createScreenReaderAnnouncer(
  options: ScreenReaderAnnouncerOptions = {}
): ScreenReaderAnnouncer {
  const documentRef = options.documentRef ?? document;
  const elementId = options.elementId ?? DEFAULT_ANNOUNCER_ID;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const setTimeoutFn = options.setTimeoutFn ?? ((callback, delay) => setTimeout(callback, delay));
  const clearTimeoutFn = options.clearTimeoutFn ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  let timeoutId: unknown = null;

  const clear = () => {
    if (timeoutId !== null) {
      clearTimeoutFn(timeoutId);
      timeoutId = null;
    }
  };

  return {
    announce(message: string) {
      const announcer = documentRef.getElementById(elementId);
      if (!announcer) return;

      announcer.textContent = '';
      clear();
      timeoutId = setTimeoutFn(() => {
        announcer.textContent = message;
        timeoutId = null;
      }, delayMs);
    },
    clear
  };
}
