<script lang="ts">
  import { onMount } from 'svelte';
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

  const pathName = typeof window === 'undefined' ? '/' : window.location.pathname;
  const isLoginRoute = pathName === '/login';

  onMount(() => {
    if (isLoginRoute) return;
    void startMarkdownViewerApp();
  });
</script>

{#if isLoginRoute}
  <AuthLoginPage />
{:else}
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
{/if}
