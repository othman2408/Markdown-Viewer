export type LogoutControlVariant = 'desktop' | 'mobile';

interface AuthBridge {
  logout(variant?: LogoutControlVariant, event?: Event): void;
}

declare global {
  interface Window {
    markdownViewerAuth?: AuthBridge;
  }
}

export function dispatchLogout(variant: LogoutControlVariant = 'desktop', event?: Event): void {
  window.markdownViewerAuth?.logout?.(variant, event);
}
