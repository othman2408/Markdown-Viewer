// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchShareModeSelection } from '../../../lib/modals/shareBridge';

describe('share modal bridge', () => {
  afterEach(() => {
    delete window.markdownViewerShare;
  });

  it('dispatches share mode selections to the share bridge when available', () => {
    const selectMode = vi.fn();
    window.markdownViewerShare = { selectMode };

    dispatchShareModeSelection('edit');

    expect(selectMode).toHaveBeenCalledWith('edit');
  });

  it('allows share mode selections before the share bridge is registered', () => {
    expect(() => dispatchShareModeSelection('view')).not.toThrow();
  });
});
