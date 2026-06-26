import { describe, expect, it, vi } from 'vitest';
import {
  createContentDirectionController,
  createGlobalPreferencesController,
  normalizeContentDirection,
  normalizeThemePreference
} from '../../../lib/preferences/globalPreferences';

describe('global preferences helpers', () => {
  it('normalizes content direction and theme preferences', () => {
    expect(normalizeContentDirection('rtl')).toBe('rtl');
    expect(normalizeContentDirection('sideways')).toBe('ltr');
    expect(normalizeThemePreference('dark', false)).toBe('dark');
    expect(normalizeThemePreference('light', true)).toBe('light');
    expect(normalizeThemePreference(undefined, true)).toBe('dark');
    expect(normalizeThemePreference(undefined, false)).toBe('light');
  });

  it('loads cached global preferences and tolerates invalid storage', () => {
    const readStorageItem = vi.fn(() => '{bad json');
    const saveStorageItem = vi.fn();
    const controller = createGlobalPreferencesController({
      key: 'global',
      readStorageItem,
      saveStorageItem
    });

    expect(controller.load()).toEqual({});
    expect(controller.getInitialDirection()).toBe('ltr');
    expect(controller.getInitialTheme(true)).toBe('dark');
    expect(readStorageItem).toHaveBeenCalledOnce();
    expect(controller.load()).toEqual({});
    expect(readStorageItem).toHaveBeenCalledOnce();
  });

  it('reads initial theme and direction from storage', () => {
    const controller = createGlobalPreferencesController({
      key: 'global',
      readStorageItem: () => JSON.stringify({
        direction: 'rtl',
        theme: 'light'
      }),
      saveStorageItem: vi.fn()
    });

    expect(controller.getInitialDirection()).toBe('rtl');
    expect(controller.getInitialTheme(true)).toBe('light');
  });

  it('saves patches over cached global preferences and syncs workspace state', () => {
    const saveStorageItem = vi.fn();
    const syncWorkspaceState = vi.fn();
    const controller = createGlobalPreferencesController({
      key: 'global',
      readStorageItem: () => JSON.stringify({
        theme: 'dark'
      }),
      saveStorageItem,
      syncWorkspaceState
    });

    expect(controller.save({ direction: 'rtl' })).toEqual({
      direction: 'rtl',
      theme: 'dark'
    });
    expect(saveStorageItem).toHaveBeenCalledWith('global', expect.any(String));
    expect(JSON.parse(saveStorageItem.mock.calls[0][1])).toEqual({
      direction: 'rtl',
      theme: 'dark'
    });
    expect(syncWorkspaceState).toHaveBeenCalledOnce();
  });

  it('applies and toggles content direction with separate sync and persistence hooks', () => {
    const persistDirection = vi.fn();
    const syncDirection = vi.fn();
    const controller = createContentDirectionController({
      initialDirection: 'rtl',
      persistDirection,
      syncDirection
    });

    expect(controller.getDirection()).toBe('rtl');
    expect(controller.apply('bad')).toBe('ltr');
    expect(syncDirection).toHaveBeenCalledWith('ltr');
    expect(persistDirection).not.toHaveBeenCalled();

    expect(controller.toggle()).toBe('rtl');
    expect(syncDirection).toHaveBeenLastCalledWith('rtl');
    expect(persistDirection).toHaveBeenCalledWith('rtl');
  });
});
