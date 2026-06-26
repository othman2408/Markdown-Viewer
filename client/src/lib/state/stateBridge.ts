import { cloudState, type CloudStateSnapshot } from './cloud.svelte';
import { editorState, type EditorStateSnapshot } from './editor.svelte';
import { modalState, type ModalStateSnapshot } from './modals.svelte';
import { uiState, type UiStateSnapshot } from './ui.svelte';
import { workspaceState } from './workspace.svelte';
import type { WorkspacePayload } from '../types/workspace';

export function syncWorkspaceState(payload: WorkspacePayload): void {
  workspaceState.replace(payload);
}

export function syncCloudState(patch: Partial<CloudStateSnapshot>): void {
  cloudState.replace(patch);
}

export function syncUiState(patch: Partial<UiStateSnapshot>): void {
  uiState.replace(patch);
}

export function syncEditorState(patch: Partial<EditorStateSnapshot>): void {
  editorState.replace(patch);
}

export function syncModalState(patch: Partial<ModalStateSnapshot>): void {
  modalState.replace(patch);
}
