<div id="image-modal" class="reset-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="image-modal-title" aria-hidden="true" style="display:none;">
  <div class="reset-modal-box reset-modal-box--wide">
    <p id="image-modal-title" class="reset-modal-message">Insert image</p>
    <div class="reset-modal-toggle-group">
      <label class="reset-modal-option">
        <input type="radio" name="image-source" id="image-source-upload" value="upload">
        Upload from Device
      </label>
      <label class="reset-modal-option">
        <input type="radio" name="image-source" id="image-source-url" value="url" checked>
        External Image (URL)
      </label>
    </div>
    <div id="image-upload-fields" class="reset-modal-field-group" style="display:none;">
      <input type="file" id="image-modal-file" class="rename-modal-input" accept="image/*" />
    </div>
    <div id="image-url-fields" class="reset-modal-field-group">
      <div class="reset-modal-field">
        <label class="reset-modal-label" for="image-modal-url">Image URL</label>
        <input type="url" id="image-modal-url" class="rename-modal-input" value="https://" />
      </div>
    </div>
    <div class="reset-modal-field">
      <label class="reset-modal-label" for="image-modal-alt">Alt Text (used for title)</label>
      <input type="text" id="image-modal-alt" class="rename-modal-input" placeholder="Image description" />
    </div>
    <div class="reset-modal-actions">
      <button class="reset-modal-btn reset-modal-cancel" id="image-modal-cancel">Cancel</button>
      <button class="reset-modal-btn" id="image-modal-insert">Insert</button>
    </div>
  </div>
</div>
