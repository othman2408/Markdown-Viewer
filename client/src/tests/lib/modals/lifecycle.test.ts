import { describe, expect, it } from 'vitest';
import {
  getModalElementId,
  normalizeModalId,
  prepareModalClose,
  prepareModalOpen,
  prepareShareModalClose,
  prepareShareModalOpen
} from '../../../lib/modals/lifecycle';

describe('modal lifecycle helpers', () => {
  it('normalizes modal ids from strings and elements', () => {
    expect(normalizeModalId(' rename-modal ')).toBe('rename-modal');
    expect(normalizeModalId('')).toBeNull();
    expect(normalizeModalId(null)).toBeNull();
    expect(getModalElementId({ id: 'help-modal' })).toBe('help-modal');
    expect(getModalElementId({ id: '' })).toBeNull();
  });

  it('prepares modal opens and reports when another modal should close first', () => {
    const same = prepareModalOpen('help-modal', 'help-modal');
    const next = prepareModalOpen('help-modal', 'about-modal');

    expect(same).toEqual({
      activeModalId: 'help-modal',
      previousActiveModalId: 'help-modal',
      shouldClosePrevious: false,
      statePatch: {
        activeModalId: 'help-modal'
      }
    });
    expect(next).toEqual({
      activeModalId: 'about-modal',
      previousActiveModalId: 'help-modal',
      shouldClosePrevious: true,
      statePatch: {
        activeModalId: 'about-modal'
      }
    });
  });

  it('prepares modal closes only when closing the active modal', () => {
    expect(prepareModalClose('rename-modal', 'rename-modal')).toEqual({
      activeModalId: null,
      closedActiveModal: true,
      statePatch: {
        activeModalId: null
      }
    });
    expect(prepareModalClose('rename-modal', 'about-modal')).toEqual({
      activeModalId: 'rename-modal',
      closedActiveModal: false,
      statePatch: null
    });
  });

  it('prepares share modal state patches', () => {
    expect(prepareShareModalOpen()).toEqual({
      activeModalId: 'share-modal',
      shareOpen: true
    });
    expect(prepareShareModalClose()).toEqual({
      activeModalId: null,
      shareOpen: false
    });
  });
});
