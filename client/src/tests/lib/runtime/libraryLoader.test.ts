import { describe, expect, it } from 'vitest';
import { createLibraryLoader } from '../../../lib/runtime/libraryLoader';

describe('runtime library loader', () => {
  it('uses bundled public vendor assets for the web app', () => {
    const { CDN } = createLibraryLoader();

    expect(CDN.marked).toBe('/vendor/marked/marked.min.js');
    expect(CDN.highlight_powershell).toBe('/vendor/highlight.js/languages/powershell.min.js');
    expect(CDN.dompurify).toBe('/vendor/dompurify/purify.min.js');
  });
});
