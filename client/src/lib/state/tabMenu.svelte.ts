export interface TabMenuPosition {
  top: number;
  left: number;
}

export interface OpenTabMenuState {
  menuId: string;
  tabId: string;
  mobile: boolean;
  position: TabMenuPosition;
}

export interface ToggleTabMenuInput {
  button: HTMLElement;
  dropdown: HTMLElement | null;
  menuId: string;
  mobile: boolean;
  tabId: string;
}

export interface TabMenuStateApi {
  readonly snapshot: OpenTabMenuState | null;
  subscribe(run: (value: OpenTabMenuState | null) => void): () => void;
  replace(payload: OpenTabMenuState | null): void;
  close(): void;
  toggle(input: ToggleTabMenuInput): void;
}

const MENU_MARGIN = 8;
const FALLBACK_MENU_WIDTH = 130;
const FALLBACK_MENU_HEIGHT = 110;

function normalizePosition(position: Partial<TabMenuPosition> | undefined): TabMenuPosition {
  return {
    top: Number.isFinite(Number(position?.top)) ? Number(position?.top) : 0,
    left: Number.isFinite(Number(position?.left)) ? Number(position?.left) : 0
  };
}

export function normalizeOpenTabMenuState(payload: OpenTabMenuState | null | undefined): OpenTabMenuState | null {
  if (!payload) return null;

  return {
    menuId: String(payload.menuId || ''),
    tabId: String(payload.tabId || ''),
    mobile: Boolean(payload.mobile),
    position: normalizePosition(payload.position)
  };
}

export function createTabMenuState(initial: OpenTabMenuState | null = null): TabMenuStateApi {
  let snapshot = $state<OpenTabMenuState | null>(normalizeOpenTabMenuState(initial));
  const subscribers = new Set<(value: OpenTabMenuState | null) => void>();

  function emit(): void {
    subscribers.forEach((run) => run(normalizeOpenTabMenuState(snapshot)));
  }

  function replace(payload: OpenTabMenuState | null): void {
    snapshot = normalizeOpenTabMenuState(payload);
    emit();
  }

  return {
    get snapshot() {
      return snapshot;
    },
    subscribe(run) {
      run(normalizeOpenTabMenuState(snapshot));
      subscribers.add(run);
      return () => subscribers.delete(run);
    },
    replace(payload) {
      replace(payload);
    },
    close() {
      replace(null);
    },
    toggle(input) {
      if (snapshot?.menuId === input.menuId) {
        replace(null);
        return;
      }

      const rect = input.button.getBoundingClientRect();
      const dropdownWidth = input.dropdown?.offsetWidth || FALLBACK_MENU_WIDTH;
      const dropdownHeight = input.dropdown?.offsetHeight || FALLBACK_MENU_HEIGHT;
      let left = rect.right - dropdownWidth;
      let top = rect.bottom + 4;

      left = Math.max(MENU_MARGIN, Math.min(left, window.innerWidth - dropdownWidth - MENU_MARGIN));
      if (top + dropdownHeight > window.innerHeight - MENU_MARGIN) {
        top = Math.max(MENU_MARGIN, rect.top - dropdownHeight - 4);
      }

      replace({
        menuId: input.menuId,
        tabId: input.tabId,
        mobile: input.mobile,
        position: {
          top,
          left
        }
      });
    }
  };
}

export const tabMenuState = createTabMenuState();

export function closeOpenTabMenu(): void {
  tabMenuState.close();
}

export function toggleOpenTabMenu(input: ToggleTabMenuInput): void {
  tabMenuState.toggle(input);
}
