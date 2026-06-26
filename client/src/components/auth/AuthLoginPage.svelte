<script lang="ts">
  import { onMount } from 'svelte';

  let emailInput: HTMLInputElement | null = null;

  function sanitizeReturnTo(value: string | null): string {
    if (!value) return '/';
    if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
    if (value.startsWith('/api/') || value.startsWith('/login')) return '/';
    return value;
  }

  const params = typeof window === 'undefined'
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search);
  const returnTo = sanitizeReturnTo(params.get('returnTo'));
  const hasError = params.get('error') === '1';

  onMount(() => {
    emailInput?.focus();
  });
</script>

<svelte:head>
  <title>Sign in - Markdown Viewer</title>
</svelte:head>

<main class="auth-page">
  <section class="auth-card" aria-labelledby="login-title">
    <header class="auth-brand">
      <span class="auth-kicker">Markdown Viewer</span>
      <h1 id="login-title">Sign in</h1>
      <p class="auth-copy">Welcome back.</p>
    </header>

    {#if hasError}
      <div id="login-error" class="auth-alert" role="alert">Invalid email or password.</div>
    {/if}

    <form
      class="auth-form"
      method="post"
      action="/api/login"
      aria-describedby={hasError ? 'login-error' : undefined}
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      <div class="auth-field">
        <label for="email">Email</label>
        <input
          bind:this={emailInput}
          id="email"
          name="email"
          type="email"
          inputmode="email"
          autocomplete="username"
          placeholder="admin@example.com"
          spellcheck="false"
          required
        />
      </div>
      <div class="auth-field">
        <label for="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          placeholder="Enter password"
          required
        />
      </div>
      <button class="auth-submit" type="submit">Sign in</button>
    </form>
  </section>
</main>

<style>
  .auth-page {
    --auth-bg: #0d1117;
    --auth-panel: #161b22;
    --auth-border: #30363d;
    --auth-border-strong: #3d444d;
    --auth-text: #c9d1d9;
    --auth-muted: #8b949e;
    --auth-accent: #58a6ff;
    --auth-accent-bg: #1f6feb;
    --auth-accent-hover: #388bfd;
    --auth-danger: #ff7b72;
    --auth-danger-bg: rgba(248, 81, 73, 0.12);
    --auth-danger-border: rgba(248, 81, 73, 0.38);
    color-scheme: dark;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 32px 18px;
    background: var(--auth-bg);
    color: var(--auth-text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  }

  .auth-page * {
    box-sizing: border-box;
  }

  .auth-card {
    width: min(100%, 420px);
    padding: 32px;
    border: 1px solid var(--auth-border);
    border-radius: 8px;
    background: var(--auth-panel);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
  }

  .auth-brand {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 24px;
  }

  .auth-kicker {
    color: var(--auth-muted);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0;
  }

  h1 {
    margin: 0;
    color: var(--auth-text);
    font-size: 28px;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: 0;
  }

  .auth-copy {
    margin: 0;
    color: var(--auth-muted);
    font-size: 14px;
    line-height: 1.5;
  }

  .auth-alert {
    margin: 0 0 18px;
    padding: 11px 12px;
    border: 1px solid var(--auth-danger-border);
    border-radius: 6px;
    background: var(--auth-danger-bg);
    color: var(--auth-danger);
    font-size: 14px;
    line-height: 1.35;
  }

  .auth-form {
    display: grid;
    gap: 16px;
  }

  .auth-field {
    display: grid;
    gap: 7px;
  }

  label {
    color: var(--auth-text);
    font-size: 14px;
    font-weight: 600;
  }

  input {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid var(--auth-border);
    border-radius: 6px;
    background: var(--auth-bg);
    color: var(--auth-text);
    font: inherit;
    font-size: 15px;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }

  input:hover {
    border-color: var(--auth-border-strong);
  }

  input:focus-visible {
    border-color: var(--auth-accent);
    box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.18);
  }

  input::placeholder {
    color: #6e7681;
  }

  .auth-submit {
    width: 100%;
    min-height: 44px;
    margin-top: 4px;
    padding: 10px 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    background: var(--auth-accent-bg);
    color: #ffffff;
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  }

  .auth-submit:hover {
    background: var(--auth-accent-hover);
  }

  .auth-submit:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.24);
  }

  .auth-submit:active {
    transform: translateY(1px);
  }

  @media (prefers-color-scheme: light) {
    .auth-page {
      color-scheme: light;
      --auth-bg: #f6f8fa;
      --auth-panel: #ffffff;
      --auth-border: #d0d7de;
      --auth-border-strong: #8c959f;
      --auth-text: #24292f;
      --auth-muted: #57606a;
      --auth-accent: #0969da;
      --auth-accent-bg: #0969da;
      --auth-accent-hover: #0757b7;
      --auth-danger: #cf222e;
      --auth-danger-bg: #ffebe9;
      --auth-danger-border: #ff8182;
    }

    .auth-card {
      box-shadow: 0 18px 50px rgba(140, 149, 159, 0.2);
    }

    input::placeholder {
      color: #8c959f;
    }
  }

  @media (max-width: 480px) {
    .auth-page {
      padding: 18px;
      align-items: start;
    }

    .auth-card {
      padding: 24px;
    }

    h1 {
      font-size: 24px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    input,
    .auth-submit {
      transition: none;
    }

    .auth-submit:active {
      transform: none;
    }
  }
</style>
