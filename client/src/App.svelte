<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { startMarkdownViewerApp } from './lib/app/markdownViewerApp';
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

  const pathName = typeof window === 'undefined' ? '/' : window.location.pathname;
  const search = typeof window === 'undefined' ? '' : window.location.search;
  const hash = typeof window === 'undefined' ? '' : window.location.hash;
  const isLoginRoute = pathName === '/login';
  const isPublicShareRoute = /^\/share\/[^/]+/.test(pathName);
  type AppBootState = 'checking' | 'login' | 'ready';

  let bootState = $state<AppBootState>(
    isLoginRoute ? 'login' : isPublicShareRoute ? 'ready' : 'checking'
  );

  function getLoginUrl(): string {
    return '/login?returnTo=' + encodeURIComponent(pathName + search + hash);
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
    if (isLoginRoute) return;

    async function bootApp(): Promise<void> {
      if (!isPublicShareRoute) {
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          window.location.href = getLoginUrl();
          return;
        }
        bootState = 'ready';
        await tick();
      }

      await startMarkdownViewerApp();
    }

    void bootApp();
  });
</script>

{#if bootState === 'login'}
  <AuthLoginPage />
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
