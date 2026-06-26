<!-- Svelte-owned core modal markup. Keep IDs/classes aligned with the stable DOM contract. -->
<!-- Reset Confirmation Modal -->
        <div id="reset-confirm-modal" class="reset-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title" aria-hidden="true" style="display:none;">
          <div class="reset-modal-box reset-modal-box--wide">
            <p id="reset-modal-title" class="reset-modal-message">Are you sure you want to delete all files?</p>
            <div class="reset-modal-actions">
              <button class="reset-modal-btn reset-modal-cancel" id="reset-modal-cancel">Cancel</button>
              <button class="reset-modal-btn reset-modal-confirm" id="reset-modal-confirm">Delete All</button>
            </div>
          </div>
        </div>

        <!-- Clear Markdown Formatting Modal -->
        <div id="clear-formatting-modal" class="reset-modal-overlay modal-overlay" role="dialog" aria-modal="true" aria-labelledby="clear-formatting-title" aria-hidden="true" style="display:none;">
          <div class="reset-modal-box reset-modal-box--wide modal-box">
            <div class="modal-header">
              <p id="clear-formatting-title" class="reset-modal-message">Clear active document?</p>
              <button type="button" class="modal-close-btn" id="clear-formatting-close" aria-label="Close clear document dialog">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <p class="modal-subtext">Are you sure you want to clear the content of the active document? The document itself will not be deleted.</p>
            <div class="reset-modal-actions">
              <button class="reset-modal-btn reset-modal-cancel" id="clear-formatting-cancel">Cancel</button>
              <button class="reset-modal-btn reset-modal-confirm" id="clear-formatting-confirm">Clear Document</button>
            </div>
          </div>
        </div>
