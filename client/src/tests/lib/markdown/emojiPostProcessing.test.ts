// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  createEmojiPostProcessor,
  type JoyPixelsAdapter
} from '../../../lib/markdown/emojiPostProcessing';

function createProcessor(input: {
  fetchEmojiData?: (url: string) => Promise<Record<string, string>>;
  getJoypixels?: () => JoyPixelsAdapter | undefined;
  loadScript?: (url: string) => Promise<unknown>;
  loadStyle?: (url: string) => Promise<unknown>;
  renderMarkdown?: (options: { force: true; reason: 'emoji-refresh' }) => void;
} = {}) {
  return createEmojiPostProcessor({
    consoleRef: { error: vi.fn() },
    emojiApiUrl: 'https://emoji.test/api',
    fetchEmojiData: input.fetchEmojiData ?? vi.fn(async () => ({})),
    getJoypixels: input.getJoypixels ?? (() => ({
      shortnameToUnicode: (shortname) => shortname === ':smile:' ? '\u{1F604}' : shortname
    })),
    joypixelsCssUrl: 'joypixels.css',
    joypixelsScriptUrl: 'joypixels.js',
    loadScript: input.loadScript ?? vi.fn(async () => undefined),
    loadStyle: input.loadStyle ?? vi.fn(async () => undefined),
    renderMarkdown: input.renderMarkdown ?? vi.fn()
  });
}

describe('emoji post-processing', () => {
  it('loads GitHub emoji lookup data once and sorts entries', async () => {
    const fetchEmojiData = vi.fn(async () => ({
      zebra: 'https://emoji.test/zebra.png',
      octocat: 'https://emoji.test/octocat.png'
    }));
    const processor = createProcessor({ fetchEmojiData });

    await expect(processor.loadEntries()).resolves.toEqual([
      {
        name: 'octocat',
        url: 'https://emoji.test/octocat.png',
        shortcode: ':octocat:',
        search: 'octocat :octocat:'
      },
      {
        name: 'zebra',
        url: 'https://emoji.test/zebra.png',
        shortcode: ':zebra:',
        search: 'zebra :zebra:'
      }
    ]);
    await processor.loadEntries();

    expect(fetchEmojiData).toHaveBeenCalledOnce();
    expect(processor.hasLookupLoaded()).toBe(true);
    expect(processor.getEntries()).toHaveLength(2);
  });

  it('falls back to an empty loaded lookup after fetch failure', async () => {
    const consoleRef = { error: vi.fn() };
    const processor = createEmojiPostProcessor({
      consoleRef,
      emojiApiUrl: 'https://emoji.test/api',
      fetchEmojiData: vi.fn(async () => {
        throw new Error('offline');
      }),
      getJoypixels: () => undefined,
      joypixelsCssUrl: 'joypixels.css',
      joypixelsScriptUrl: 'joypixels.js',
      loadScript: vi.fn(async () => undefined),
      loadStyle: vi.fn(async () => undefined),
      renderMarkdown: vi.fn()
    });

    await expect(processor.loadEntries()).resolves.toEqual([]);

    expect(processor.hasLookupLoaded()).toBe(true);
    expect(consoleRef.error).toHaveBeenCalledWith('Failed to load GitHub emojis:', expect.any(Error));
  });

  it('converts JoyPixels-supported shortcodes while skipping code containers', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>Hello :smile:</p><code>:smile:</code>';
    const processor = createProcessor();

    processor.process(container);

    expect(container.querySelector('p')?.textContent).toBe('Hello \u{1F604}');
    expect(container.querySelector('code')?.textContent).toBe(':smile:');
  });

  it('renders GitHub emoji lookup images for unsupported JoyPixels shortcodes', async () => {
    const container = document.createElement('div');
    container.textContent = 'Meet :octocat:';
    const processor = createProcessor({
      fetchEmojiData: vi.fn(async () => ({
        octocat: 'https://emoji.test/octocat.png'
      })),
      getJoypixels: () => ({
        shortnameToUnicode: (shortname) => shortname
      })
    });
    await processor.loadEntries();

    processor.process(container);

    const image = container.querySelector<HTMLImageElement>('img.emoji-inline');
    expect(container.textContent).toBe('Meet ');
    expect(image?.src).toBe('https://emoji.test/octocat.png');
    expect(image?.alt).toBe(':octocat:');
    expect(image?.loading).toBe('lazy');
    expect(image?.getAttribute('aria-label')).toBe(':octocat:');
  });

  it('lazy-loads JoyPixels assets before processing shortcode text', async () => {
    const container = document.createElement('div');
    container.textContent = 'Hello :smile:';
    let adapter: JoyPixelsAdapter | undefined;
    const loadScript = vi.fn(async () => {
      adapter = { shortnameToUnicode: () => '\u{1F604}' };
    });
    const loadStyle = vi.fn(async () => undefined);
    const processor = createProcessor({
      getJoypixels: () => adapter,
      loadScript,
      loadStyle
    });

    processor.process(container);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(loadScript).toHaveBeenCalledWith('joypixels.js');
    expect(loadStyle).toHaveBeenCalledWith('joypixels.css');
    expect(container.textContent).toBe('Hello \u{1F604}');
  });

  it('loads lookup data and requests a re-render for unknown shortcodes', async () => {
    const container = document.createElement('div');
    container.textContent = 'Meet :octocat:';
    const renderMarkdown = vi.fn<(options: { force: true; reason: 'emoji-refresh' }) => void>();
    const processor = createProcessor({
      fetchEmojiData: vi.fn(async () => ({
        octocat: 'https://emoji.test/octocat.png'
      })),
      getJoypixels: () => ({
        shortnameToUnicode: (shortname) => shortname
      }),
      renderMarkdown
    });

    processor.process(container);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(renderMarkdown).toHaveBeenCalledWith({ force: true, reason: 'emoji-refresh' });
    expect(processor.hasLookupLoaded()).toBe(true);
  });
});
