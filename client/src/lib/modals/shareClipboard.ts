type ClipboardLike = {
  writeText(text: string): Promise<void>;
};

type NavigatorLike = {
  clipboard?: ClipboardLike;
};

type DocumentLike = Pick<Document, 'body' | 'createElement' | 'execCommand'>;

export interface CopyTextToClipboardOptions {
  documentRef?: DocumentLike;
  isSecureContext?: boolean;
  navigatorRef?: NavigatorLike;
}

function getRuntimeNavigator(): NavigatorLike | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator;
}

function getRuntimeDocument(): DocumentLike | undefined {
  return typeof document === 'undefined' ? undefined : document;
}

function getRuntimeIsSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext;
}

export async function copyTextToClipboard(
  text: string,
  options: CopyTextToClipboardOptions = {}
): Promise<boolean> {
  const navigatorRef = options.navigatorRef ?? getRuntimeNavigator();
  const isSecureContext = options.isSecureContext ?? getRuntimeIsSecureContext();

  if (navigatorRef?.clipboard && isSecureContext) {
    try {
      await navigatorRef.clipboard.writeText(text);
      return true;
    } catch (_) {
      return false;
    }
  }

  const documentRef = options.documentRef ?? getRuntimeDocument();
  if (!documentRef?.body || typeof documentRef.execCommand !== 'function') {
    return false;
  }

  let fallbackInput: HTMLTextAreaElement | null = null;
  try {
    fallbackInput = documentRef.createElement('textarea');
    fallbackInput.value = text;
    documentRef.body.appendChild(fallbackInput);
    fallbackInput.select();
    return documentRef.execCommand('copy');
  } catch (_) {
    return false;
  } finally {
    fallbackInput?.parentNode?.removeChild(fallbackInput);
  }
}
