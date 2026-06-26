import { describe, expect, it, vi } from 'vitest';
import {
  openShareModalFlow,
  runShareUrlGeneration,
  selectShareModeFlow,
  type ShareGenerationPatch
} from '../../../lib/modals/shareGeneration';
import {
  SHARE_ERROR_MESSAGE,
  SHARE_GENERATING_MESSAGE,
  SHARE_TOO_LARGE_MESSAGE
} from '../../../lib/modals/share';

describe('share generation flow helpers', () => {
  it('runs successful share URL generation and applies start/success patches', async () => {
    const patches: ShareGenerationPatch[] = [];

    await expect(runShareUrlGeneration({
      applyPatch: (patch) => patches.push(patch),
      buildShareUrl: async () => 'https://example.com/#share=abc',
      cloudEnabled: false,
      isCurrentRequest: () => true,
      mode: 'edit'
    })).resolves.toBe('success');

    expect(patches).toEqual([
      {
        shareCopyDisabled: true,
        shareCopySucceeded: false,
        shareMode: 'edit',
        shareUrl: SHARE_GENERATING_MESSAGE
      },
      {
        shareCopyDisabled: false,
        shareCopySucceeded: false,
        shareMode: 'edit',
        shareUrl: 'https://example.com/#share=abc'
      }
    ]);
  });

  it('handles stale, missing, oversized, and thrown share URL generation results', async () => {
    const stalePatches: ShareGenerationPatch[] = [];
    await expect(runShareUrlGeneration({
      applyPatch: (patch) => stalePatches.push(patch),
      buildShareUrl: async () => 'https://example.com/#share=abc',
      cloudEnabled: false,
      isCurrentRequest: () => false,
      mode: 'view'
    })).resolves.toBe('stale');
    expect(stalePatches).toHaveLength(1);

    const missingPatches: ShareGenerationPatch[] = [];
    await expect(runShareUrlGeneration({
      applyPatch: (patch) => missingPatches.push(patch),
      buildShareUrl: async () => null,
      cloudEnabled: false,
      isCurrentRequest: () => true,
      mode: 'view'
    })).resolves.toBe('error');
    expect(missingPatches.at(-1)?.shareUrl).toBe(SHARE_ERROR_MESSAGE);

    const oversizedPatches: ShareGenerationPatch[] = [];
    await expect(runShareUrlGeneration({
      applyPatch: (patch) => oversizedPatches.push(patch),
      buildShareUrl: async () => 'x'.repeat(32001),
      cloudEnabled: false,
      isCurrentRequest: () => true,
      mode: 'view'
    })).resolves.toBe('too-large');
    expect(oversizedPatches.at(-1)?.shareUrl).toBe(SHARE_TOO_LARGE_MESSAGE);

    const consoleRef = { error: vi.fn() };
    const thrownPatches: ShareGenerationPatch[] = [];
    await expect(runShareUrlGeneration({
      applyPatch: (patch) => thrownPatches.push(patch),
      buildShareUrl: async () => {
        throw new Error('failed');
      },
      cloudEnabled: false,
      consoleRef,
      isCurrentRequest: () => true,
      mode: 'edit'
    })).resolves.toBe('error');
    expect(thrownPatches.at(-1)?.shareUrl).toBe(SHARE_ERROR_MESSAGE);
    expect(consoleRef.error).toHaveBeenCalledWith('Share generation failed:', expect.any(Error));
  });

  it('opens share modal after local compression is available', async () => {
    const patches: ShareGenerationPatch[] = [];
    const loadCompression = vi.fn(async () => undefined);
    const generateShareUrl = vi.fn();

    await expect(openShareModalFlow({
      applyPatch: (patch) => patches.push(patch),
      cloudEnabled: false,
      generateShareUrl,
      hasCompressionCodec: () => false,
      loadCompression
    })).resolves.toBe(true);

    expect(loadCompression).toHaveBeenCalledOnce();
    expect(patches[0]).toMatchObject({
      activeModalId: 'share-modal',
      shareCopyDisabled: true,
      shareMode: 'view',
      shareOpen: true,
      shareUrl: ''
    });
    expect(generateShareUrl).toHaveBeenCalledWith('view');
  });

  it('reports local compression load failures without opening the modal', async () => {
    const patches: ShareGenerationPatch[] = [];
    const alertRef = vi.fn();
    const consoleRef = { error: vi.fn() };
    const generateShareUrl = vi.fn();

    await expect(openShareModalFlow({
      alertRef,
      applyPatch: (patch) => patches.push(patch),
      cloudEnabled: false,
      consoleRef,
      generateShareUrl,
      hasCompressionCodec: () => false,
      loadCompression: async () => {
        throw new Error('network');
      }
    })).resolves.toBe(false);

    expect(patches).toEqual([]);
    expect(generateShareUrl).not.toHaveBeenCalled();
    expect(consoleRef.error).toHaveBeenCalledWith('Failed to load pako:', expect.any(Error));
    expect(alertRef).toHaveBeenCalledWith('Failed to load sharing library. Please check your internet connection.');
  });

  it('selects valid share modes and ignores unknown modes', () => {
    const patches: ShareGenerationPatch[] = [];
    const generateShareUrl = vi.fn();

    expect(selectShareModeFlow({
      applyPatch: (patch) => patches.push(patch),
      generateShareUrl,
      mode: 'edit'
    })).toBe(true);
    expect(patches).toEqual([{ shareCopySucceeded: false, shareMode: 'edit' }]);
    expect(generateShareUrl).toHaveBeenCalledWith('edit');

    expect(selectShareModeFlow({
      applyPatch: (patch) => patches.push(patch),
      generateShareUrl,
      mode: 'print'
    })).toBe(false);
    expect(generateShareUrl).toHaveBeenCalledTimes(1);
  });
});
