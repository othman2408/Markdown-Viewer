export type ThemePreference = 'dark' | 'light';
export type ContentDirection = 'ltr' | 'rtl';

export interface GlobalPreferencesSnapshot {
  direction?: ContentDirection;
  theme?: ThemePreference;
  [key: string]: unknown;
}

export interface GlobalPreferencesStorage {
  readStorageItem(key: string): string | null;
  saveStorageItem(key: string, value: string): void;
}

export interface GlobalPreferencesControllerOptions extends GlobalPreferencesStorage {
  key: string;
  syncWorkspaceState?: () => void;
}

export interface GlobalPreferencesController {
  getInitialDirection(): ContentDirection;
  getInitialTheme(prefersDarkMode: boolean): ThemePreference;
  load(): GlobalPreferencesSnapshot;
  save(patch: GlobalPreferencesSnapshot): GlobalPreferencesSnapshot;
}

export interface ContentDirectionControllerOptions {
  initialDirection: unknown;
  persistDirection: (direction: ContentDirection) => void;
  syncDirection: (direction: ContentDirection) => void;
}

export interface ContentDirectionController {
  apply(direction: unknown): ContentDirection;
  getDirection(): ContentDirection;
  toggle(): ContentDirection;
}

export function normalizeContentDirection(direction: unknown): ContentDirection {
  return direction === 'rtl' ? 'rtl' : 'ltr';
}

export function normalizeThemePreference(theme: unknown, prefersDarkMode: boolean): ThemePreference {
  return theme === 'dark' || theme === 'light'
    ? theme
    : prefersDarkMode ? 'dark' : 'light';
}

export function createGlobalPreferencesController(
  options: GlobalPreferencesControllerOptions
): GlobalPreferencesController {
  let cache: GlobalPreferencesSnapshot | null = null;

  const load = (): GlobalPreferencesSnapshot => {
    if (cache) return cache;
    try {
      const parsed = JSON.parse(options.readStorageItem(options.key) || '{}');
      cache = parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      cache = {};
    }
    return cache ?? {};
  };

  const save = (patch: GlobalPreferencesSnapshot): GlobalPreferencesSnapshot => {
    cache = {
      ...load(),
      ...patch
    };
    options.saveStorageItem(options.key, JSON.stringify(cache));
    options.syncWorkspaceState?.();
    return cache;
  };

  return {
    getInitialDirection() {
      return normalizeContentDirection(load().direction);
    },
    getInitialTheme(prefersDarkMode: boolean) {
      return normalizeThemePreference(load().theme, prefersDarkMode);
    },
    load,
    save
  };
}

export function createContentDirectionController(
  options: ContentDirectionControllerOptions
): ContentDirectionController {
  let currentDirection = normalizeContentDirection(options.initialDirection);

  const apply = (direction: unknown): ContentDirection => {
    currentDirection = normalizeContentDirection(direction);
    options.syncDirection(currentDirection);
    return currentDirection;
  };

  return {
    apply,
    getDirection() {
      return currentDirection;
    },
    toggle() {
      const nextDirection = currentDirection === 'rtl' ? 'ltr' : 'rtl';
      apply(nextDirection);
      options.persistDirection(nextDirection);
      return nextDirection;
    }
  };
}
