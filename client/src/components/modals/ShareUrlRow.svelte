<script lang="ts">
  type ShareUrlRowProps = {
    shareUrl: string;
    copyDisabled: boolean;
    copySucceeded: boolean;
    oncopy: () => void | Promise<void>;
  };

  let { shareUrl, copyDisabled, copySucceeded, oncopy }: ShareUrlRowProps = $props();
</script>

<div class="share-url-row">
  <input type="text" id="share-url-input" class="rename-modal-input share-url-input" readonly placeholder="Generating link..." aria-label="Share URL" value={shareUrl} />
  <button class="reset-modal-btn share-copy-btn" id="share-copy-btn" title="Copy link" disabled={copyDisabled} onclick={oncopy}>
    <i class={`bi ${copySucceeded ? 'bi-check-lg' : 'bi-clipboard'}`}></i>
  </button>
</div>
