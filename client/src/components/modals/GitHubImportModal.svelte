<!-- Svelte-owned GitHub import modal markup. Keep IDs/classes aligned with the stable DOM contract. -->
<!-- GitHub Import Modal -->
        <div id="github-import-modal" class="reset-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="github-import-title" aria-hidden="true" style="display:none;">
          <div class="reset-modal-box">
            <p id="github-import-title" class="reset-modal-message">Import Markdown from GitHub</p>
            <input type="url" id="github-import-url" class="rename-modal-input" placeholder="https://github.com/owner/repo/blob/main/README.md" />
            <select id="github-import-file-select" class="rename-modal-input" style="display:none;"></select>
            <div id="github-import-selection-toolbar" class="github-import-selection-toolbar" style="display:none;">
              <span id="github-import-selected-count" class="github-import-selected-count">0 selected</span>
              <button type="button" class="reset-modal-btn" id="github-import-select-all">Select All</button>
            </div>
            <div id="github-import-tree" class="github-import-tree" style="display:none;"></div>
            <p id="github-import-error" class="github-import-error" style="display:none;"></p>
            <div class="reset-modal-actions">
              <button class="reset-modal-btn reset-modal-cancel" id="github-import-cancel">Cancel</button>
              <button class="reset-modal-btn" id="github-import-submit">Import</button>
            </div>
          </div>
        </div>
