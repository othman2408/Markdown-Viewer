<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import {
    startMarkdownViewerApp,
    type MarkdownViewerAppRuntime
  } from './lib/app/markdownViewerApp';
  import AppHeader from './components/AppHeader.svelte';
  import WorkspaceChrome from './components/WorkspaceChrome.svelte';
  import AppModals from './components/AppModals.svelte';
  import EditorWorkspace from './components/EditorWorkspace.svelte';
  import DiagramModals from './components/DiagramModals.svelte';
  import DefaultMarkdownTemplate from './components/DefaultMarkdownTemplate.svelte';
  import AccessibilityAnnouncer from './components/AccessibilityAnnouncer.svelte';
  import TabMenuController from './components/tabs/TabMenuController.svelte';
  import AuthLoginPage from './components/auth/AuthLoginPage.svelte';
  import AppBootScreen from './components/AppBootScreen.svelte';
  import PageTransition from './components/PageTransition.svelte';

  type RouteSnapshot = {
    hash: string;
    pathName: string;
    search: string;
  };

  type AppBootState = 'checking' | 'login' | 'ready';

  function readRoute(): RouteSnapshot {
    if (typeof window === 'undefined') return { hash: '', pathName: '/', search: '' };
    return {
      hash: window.location.hash,
      pathName: window.location.pathname,
      search: window.location.search
    };
  }

  function isLoginRoute(pathName = route.pathName): boolean {
    return pathName === '/login';
  }

  function isPublicShareRoute(pathName = route.pathName): boolean {
    return /^\/share\/[^/]+/.test(pathName);
  }

  function getRouteUrl(routeSnapshot = route): string {
    return routeSnapshot.pathName + routeSnapshot.search + routeSnapshot.hash;
  }

  function getInitialBootState(routeSnapshot: RouteSnapshot): AppBootState {
    if (isLoginRoute(routeSnapshot.pathName)) return 'login';
    if (isPublicShareRoute(routeSnapshot.pathName)) return 'ready';
    return 'checking';
  }

  const initialRoute = readRoute();
  let route = $state<RouteSnapshot>(initialRoute);
  let bootState = $state<AppBootState>(getInitialBootState(initialRoute));
  let appRuntime: MarkdownViewerAppRuntime | null = null;
  let appStarting = false;
  let destroyed = false;

  function getLoginUrl(): string {
    return '/login?returnTo=' + encodeURIComponent(getRouteUrl());
  }

  function replaceRoute(url: string): void {
    window.history.replaceState({}, '', url);
    route = readRoute();
  }

  function destroyEditorRuntime(): void {
    appRuntime?.destroy();
    appRuntime = null;
  }

  async function startEditorRuntime(): Promise<void> {
    if (appRuntime || appStarting || destroyed) return;

    appStarting = true;
    try {
      const runtime = await startMarkdownViewerApp({
        onLogout: () => {
          showLogin('/login');
        }
      });
      if (destroyed) {
        runtime?.destroy();
        return;
      }
      appRuntime = runtime;
    } finally {
      appStarting = false;
    }
  }

  async function showEditor(url: string): Promise<void> {
    replaceRoute(url);
    bootState = 'ready';
    await tick();
    await startEditorRuntime();
  }

  function showLogin(url = getLoginUrl()): void {
    destroyEditorRuntime();
    replaceRoute(url);
    bootState = 'login';
  }

  async function handleLoginSuccess(returnTo: string): Promise<void> {
    await showEditor(returnTo || '/');
  }

  async function isAuthenticated(): Promise<boolean> {
    try {
      const response = await fetch('/api/session', {
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json'
        }
      });
      if (!response.ok) return false;
      const session = await response.json();
      return Boolean(session.authenticated);
    } catch (_) {
      return false;
    }
  }

  onMount(() => {
    if (isLoginRoute()) return;

    async function bootApp(): Promise<void> {
      if (!isPublicShareRoute()) {
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          showLogin();
          return;
        }
      }

      await showEditor(getRouteUrl());
    }

    void bootApp();
  });

  onDestroy(() => {
    destroyed = true;
    destroyEditorRuntime();
  });
</script>

<PageTransition pageKey={bootState} app={bootState === 'ready'}>
  {#if bootState === 'login'}
    <AuthLoginPage onLoginSuccess={handleLoginSuccess} />
  {:else if bootState === 'ready'}
    <div class="app-container">
      <AppHeader />
      <WorkspaceChrome />
      <AppModals />
      <EditorWorkspace />
    </div>

    <DiagramModals />
    <DefaultMarkdownTemplate />
    <AccessibilityAnnouncer />
    <TabMenuController />
  {:else}
    <AppBootScreen />
  {/if}
</PageTransition>
