export interface EmojiEntry {
  name: string;
  shortcode: string;
  search: string;
  url: string;
}

export interface JoyPixelsAdapter {
  shortnameToUnicode(shortname: string): string;
}

export interface EmojiPostProcessorOptions {
  consoleRef?: Pick<Console, 'error'>;
  emojiApiUrl?: string;
  fetchEmojiData?: (url: string) => Promise<Record<string, string>>;
  getJoypixels: () => JoyPixelsAdapter | undefined;
  joypixelsCssUrl: string;
  joypixelsScriptUrl: string;
  loadScript: (url: string) => Promise<unknown>;
  loadStyle: (url: string) => Promise<unknown>;
  renderMarkdown: (options: { force: true; reason: 'emoji-refresh' }) => void;
}

export interface EmojiPostProcessor {
  getEntries(): readonly EmojiEntry[];
  hasLookupLoaded(): boolean;
  loadEntries(): Promise<EmojiEntry[]>;
  process(element: HTMLElement): void;
}

const DEFAULT_EMOJI_API_URL = 'https://api.github.com/emojis';
const EMOJI_SHORTCODE_REGEX = /:([\w+-]+):/g;

async function fetchEmojiJson(url: string): Promise<Record<string, string>> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Emoji request failed (${response.status})`);
  return response.json();
}

function buildEmojiEntries(data: Record<string, string>): EmojiEntry[] {
  return Object.keys(data)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      url: data[name],
      shortcode: `:${name}:`,
      search: `${name} :${name}:`.toLowerCase()
    }));
}

export function createEmojiPostProcessor(options: EmojiPostProcessorOptions): EmojiPostProcessor {
  const emojiApiUrl = options.emojiApiUrl ?? DEFAULT_EMOJI_API_URL;
  const fetchEmojiData = options.fetchEmojiData ?? fetchEmojiJson;
  let loadPromise: Promise<EmojiEntry[]> | null = null;
  let entries: EmojiEntry[] = [];
  let urlMap = new Map<string, string>();
  let lookupLoaded = false;
  let renderScheduled = false;

  const loadEntries = (): Promise<EmojiEntry[]> => {
    if (loadPromise) return loadPromise;

    loadPromise = fetchEmojiData(emojiApiUrl)
      .then((data) => {
        entries = buildEmojiEntries(data);
        urlMap = new Map(entries.map((entry) => [entry.name, entry.url]));
        lookupLoaded = true;
        return entries;
      })
      .catch((error) => {
        options.consoleRef?.error('Failed to load GitHub emojis:', error);
        entries = [];
        urlMap = new Map();
        lookupLoaded = true;
        return entries;
      });
    return loadPromise;
  };

  const scheduleLookupRefresh = () => {
    if (lookupLoaded || renderScheduled) return;
    renderScheduled = true;
    loadEntries()
      .then(() => {
        if (urlMap.size) {
          options.renderMarkdown({ force: true, reason: 'emoji-refresh' });
        }
      })
      .finally(() => {
        renderScheduled = false;
      });
  };

  const process = (element: HTMLElement): void => {
    if (!element.textContent || !element.textContent.includes(':')) return;

    const joypixels = options.getJoypixels();
    if (!joypixels) {
      Promise.all([
        options.loadScript(options.joypixelsScriptUrl),
        options.loadStyle(options.joypixelsCssUrl)
      ]).then(() => {
        process(element);
      });
      return;
    }

    const textNodes = collectEmojiTextNodes(element);
    let needsEmojiLookup = false;
    textNodes.forEach((textNode) => {
      const didReplace = replaceEmojiShortcodes(textNode, {
        joypixels,
        lookupLoaded,
        urlMap,
        markNeedsEmojiLookup() {
          needsEmojiLookup = true;
        }
      });
      return didReplace;
    });

    if (needsEmojiLookup) {
      scheduleLookupRefresh();
    }
  };

  return {
    getEntries: () => entries,
    hasLookupLoaded: () => lookupLoaded,
    loadEntries,
    process
  };
}

function collectEmojiTextNodes(element: HTMLElement): Text[] {
  const documentRef = element.ownerDocument;
  const walker = documentRef.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT
  );
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.nodeValue?.includes(':')) continue;
    if (isInsideCodeContainer(node, element)) continue;
    textNodes.push(node);
  }
  return textNodes;
}

function isInsideCodeContainer(node: Node, root: HTMLElement): boolean {
  let parent = node.parentNode;
  while (parent && parent !== root) {
    if (
      parent instanceof HTMLElement &&
      (parent.tagName === 'PRE' || parent.tagName === 'CODE')
    ) {
      return true;
    }
    parent = parent.parentNode;
  }
  return false;
}

function replaceEmojiShortcodes(
  textNode: Text,
  options: {
    joypixels: JoyPixelsAdapter;
    lookupLoaded: boolean;
    markNeedsEmojiLookup: () => void;
    urlMap: ReadonlyMap<string, string>;
  }
): boolean {
  const text = textNode.nodeValue || '';
  EMOJI_SHORTCODE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let hasEmoji = false;
  const fragment = textNode.ownerDocument.createDocumentFragment();

  while ((match = EMOJI_SHORTCODE_REGEX.exec(text)) !== null) {
    const shortcode = match[1];
    const shortname = `:${shortcode}:`;
    const emoji = options.joypixels.shortnameToUnicode(shortname);

    if (emoji !== shortname) {
      hasEmoji = true;
      appendTextBeforeMatch(fragment, textNode, text, lastIndex, match.index);
      fragment.appendChild(textNode.ownerDocument.createTextNode(emoji));
      lastIndex = EMOJI_SHORTCODE_REGEX.lastIndex;
      continue;
    }

    const emojiUrl = options.urlMap.get(shortcode);
    if (emojiUrl) {
      hasEmoji = true;
      appendTextBeforeMatch(fragment, textNode, text, lastIndex, match.index);
      fragment.appendChild(createEmojiImage(textNode.ownerDocument, shortcode, emojiUrl));
      lastIndex = EMOJI_SHORTCODE_REGEX.lastIndex;
    } else if (!options.lookupLoaded) {
      options.markNeedsEmojiLookup();
    }
  }

  if (!hasEmoji) return false;
  if (lastIndex < text.length) {
    fragment.appendChild(textNode.ownerDocument.createTextNode(text.substring(lastIndex)));
  }
  textNode.parentNode?.replaceChild(fragment, textNode);
  return true;
}

function appendTextBeforeMatch(
  fragment: DocumentFragment,
  textNode: Text,
  text: string,
  lastIndex: number,
  matchIndex: number
): void {
  if (matchIndex > lastIndex) {
    fragment.appendChild(textNode.ownerDocument.createTextNode(text.substring(lastIndex, matchIndex)));
  }
}

function createEmojiImage(documentRef: Document, shortcode: string, emojiUrl: string): HTMLImageElement {
  const image = documentRef.createElement('img');
  image.className = 'emoji-inline';
  image.src = emojiUrl;
  image.alt = `:${shortcode}:`;
  image.loading = 'lazy';
  image.setAttribute('aria-label', `:${shortcode}:`);
  return image;
}
