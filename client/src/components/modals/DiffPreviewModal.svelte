<div id="find-replace-diff-modal" class="reset-modal-overlay modal-overlay" role="dialog" aria-modal="true" aria-labelledby="diff-modal-title" aria-hidden="true" style="display:none;">
  <div class="reset-modal-box reset-modal-box--xl modal-box">
    <div class="modal-header">
      <p id="diff-modal-title" class="reset-modal-message">Replace All Diff Preview</p>
      <button type="button" class="modal-close-btn" id="find-replace-diff-close-icon" aria-label="Close diff preview dialog">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div class="modal-body diff-preview-body">
      <p class="modal-subtext">Review the proposed changes before committing them to the document.</p>
      <div class="diff-container" id="find-replace-diff-container">
        <!-- Populated dynamically -->
      </div>
    </div>
    <div class="reset-modal-actions">
      <button class="reset-modal-btn reset-modal-cancel" id="find-replace-diff-cancel">Cancel</button>
      <button class="reset-modal-btn reset-modal-confirm" id="find-replace-diff-confirm">Commit Replacements</button>
    </div>
  </div>
</div>
