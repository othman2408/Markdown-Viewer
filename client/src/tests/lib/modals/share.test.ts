import { describe, expect, it } from 'vitest';
import {
  prepareShareGenerationError,
  prepareShareGenerationStart,
  prepareShareGenerationSuccess,
  prepareShareGenerationTooLarge,
  prepareShareCopyIdle,
  prepareShareCopySucceeded,
  prepareShareModalReset,
  prepareShareModeSelection,
  SHARE_ERROR_MESSAGE,
  SHARE_GENERATING_MESSAGE,
  SHARE_TOO_LARGE_MESSAGE
} from '../../../lib/modals/share';

describe('share modal helpers', () => {
  it('resets to a disabled empty view-mode state by default', () => {
    expect(prepareShareModalReset()).toEqual({
      shareMode: 'view',
      shareUrl: '',
      shareCopyDisabled: true,
      shareCopySucceeded: false
    });
  });

  it('normalizes share mode selections', () => {
    expect(prepareShareModeSelection('edit')).toEqual({ shareMode: 'edit', shareCopySucceeded: false });
    expect(prepareShareModeSelection('unknown')).toEqual({ shareMode: 'view', shareCopySucceeded: false });
  });

  it('prepares generating, success, error, and too-large URL states', () => {
    expect(prepareShareGenerationStart('edit')).toEqual({
      shareMode: 'edit',
      shareUrl: SHARE_GENERATING_MESSAGE,
      shareCopyDisabled: true,
      shareCopySucceeded: false
    });
    expect(prepareShareGenerationSuccess('edit', 'https://example.com/share/abc')).toEqual({
      shareMode: 'edit',
      shareUrl: 'https://example.com/share/abc',
      shareCopyDisabled: false,
      shareCopySucceeded: false
    });
    expect(prepareShareGenerationError('edit')).toEqual({
      shareMode: 'edit',
      shareUrl: SHARE_ERROR_MESSAGE,
      shareCopyDisabled: true,
      shareCopySucceeded: false
    });
    expect(prepareShareGenerationTooLarge('edit')).toEqual({
      shareMode: 'edit',
      shareUrl: SHARE_TOO_LARGE_MESSAGE,
      shareCopyDisabled: true,
      shareCopySucceeded: false
    });
  });

  it('prepares copy feedback state transitions', () => {
    expect(prepareShareCopySucceeded()).toEqual({ shareCopySucceeded: true });
    expect(prepareShareCopyIdle()).toEqual({ shareCopySucceeded: false });
  });
});
