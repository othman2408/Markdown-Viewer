// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import FindReplacePanel from '../../components/modals/FindReplacePanel.svelte';
import { modalState } from '../../lib/state/modals.svelte';

function resetModalState() {
  modalState.replace({
    activeModalId: null,
    findReplaceOpen: false,
    findReplaceDocked: false,
    findReplaceDrawerOpen: false,
    findReplaceErrorVisible: false,
    findReplaceErrorMessage: '',
    findReplaceMatchCurrent: 0,
    findReplaceMatchTotal: 0,
    findReplaceHasQuery: false,
    findReplaceMatchCase: false,
    findReplaceWholeWord: false,
    findReplaceUseRegex: false,
    findReplaceInSelection: false,
    findReplacePreserveCase: false,
    findReplaceWrapAround: true,
    shareOpen: false,
    shareMode: 'view',
    shareUrl: '',
    shareCopyDisabled: true,
    shareCopySucceeded: false
  });
}

describe('FindReplacePanel', () => {
  beforeEach(() => {
    resetModalState();
  });

  afterEach(() => {
    cleanup();
    resetModalState();
  });

  it('renders open and docked visual state from Svelte modal state', async () => {
    const { container } = render(FindReplacePanel);
    const panel = container.querySelector<HTMLDivElement>('#find-replace-modal');

    expect(panel).not.toBeNull();
    expect(panel?.style.display).toBe('none');
    expect(panel?.classList.contains('docked')).toBe(false);

    modalState.replace({
      findReplaceOpen: true,
      findReplaceDocked: true
    });
    await tick();

    expect(panel?.style.display).toBe('flex');
    expect(panel?.classList.contains('docked')).toBe(true);

    modalState.replace({
      findReplaceOpen: false,
      findReplaceDocked: false
    });
    await tick();

    expect(panel?.style.display).toBe('none');
    expect(panel?.classList.contains('docked')).toBe(false);
  });

  it('renders advanced drawer visual state from Svelte modal state', async () => {
    const { container } = render(FindReplacePanel);
    const toggle = container.querySelector<HTMLButtonElement>('#fr-drawer-toggle');
    const icon = toggle?.querySelector<HTMLElement>('i');
    const drawer = container.querySelector<HTMLDivElement>('#fr-drawer-content');

    expect(toggle).not.toBeNull();
    expect(drawer).not.toBeNull();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(icon?.classList.contains('bi-chevron-right')).toBe(true);
    expect(icon?.classList.contains('bi-chevron-down')).toBe(false);
    expect(drawer?.style.display).toBe('none');

    modalState.replace({
      findReplaceDrawerOpen: true
    });
    await tick();

    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(icon?.classList.contains('bi-chevron-right')).toBe(false);
    expect(icon?.classList.contains('bi-chevron-down')).toBe(true);
    expect(drawer?.style.display).toBe('flex');

    modalState.replace({
      findReplaceDrawerOpen: false
    });
    await tick();

    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(icon?.classList.contains('bi-chevron-right')).toBe(true);
    expect(icon?.classList.contains('bi-chevron-down')).toBe(false);
    expect(drawer?.style.display).toBe('none');
  });

  it('renders regex error drawer state from Svelte modal state', async () => {
    const { container } = render(FindReplacePanel);
    const error = container.querySelector<HTMLDivElement>('#find-replace-error');
    const message = container.querySelector<HTMLSpanElement>('#regex-error-msg');

    expect(error).not.toBeNull();
    expect(message).not.toBeNull();
    expect(error?.style.display).toBe('none');
    expect(message?.textContent).toBe('');

    modalState.replace({
      findReplaceErrorVisible: true,
      findReplaceErrorMessage: 'Invalid regular expression'
    });
    await tick();

    expect(error?.style.display).toBe('block');
    expect(message?.textContent).toBe('Invalid regular expression');

    modalState.replace({
      findReplaceErrorVisible: false
    });
    await tick();

    expect(error?.style.display).toBe('none');
    expect(message?.textContent).toBe('Invalid regular expression');
  });

  it('renders match counts and action disabled state from Svelte modal state', async () => {
    const { container } = render(FindReplacePanel);
    const count = container.querySelector<HTMLSpanElement>('#find-replace-count');
    const previous = container.querySelector<HTMLButtonElement>('#find-prev');
    const next = container.querySelector<HTMLButtonElement>('#find-next');
    const replaceCurrent = container.querySelector<HTMLButtonElement>('#find-replace-current');
    const replaceAll = container.querySelector<HTMLButtonElement>('#find-replace-all');

    expect(count?.textContent).toBe('0 of 0 matches');
    expect(previous?.disabled).toBe(true);
    expect(next?.disabled).toBe(true);
    expect(replaceCurrent?.disabled).toBe(true);
    expect(replaceAll?.disabled).toBe(true);

    modalState.replace({
      findReplaceMatchCurrent: 2,
      findReplaceMatchTotal: 5,
      findReplaceHasQuery: true
    });
    await tick();

    expect(count?.textContent).toBe('2 of 5 matches');
    expect(previous?.disabled).toBe(false);
    expect(next?.disabled).toBe(false);
    expect(replaceCurrent?.disabled).toBe(false);
    expect(replaceAll?.disabled).toBe(false);

    modalState.replace({
      findReplaceHasQuery: false
    });
    await tick();

    expect(previous?.disabled).toBe(false);
    expect(next?.disabled).toBe(false);
    expect(replaceCurrent?.disabled).toBe(false);
    expect(replaceAll?.disabled).toBe(true);
  });

  it('renders option button active and pressed state from Svelte modal state', async () => {
    const { container } = render(FindReplacePanel);
    const matchCase = container.querySelector<HTMLButtonElement>('#find-case');
    const wholeWord = container.querySelector<HTMLButtonElement>('#find-word');
    const regex = container.querySelector<HTMLButtonElement>('#find-regex');
    const inSelection = container.querySelector<HTMLButtonElement>('#find-sel');
    const preserveCase = container.querySelector<HTMLButtonElement>('#replace-preserve-case');
    const wrap = container.querySelector<HTMLButtonElement>('#find-wrap');

    expect(matchCase?.classList.contains('active')).toBe(false);
    expect(matchCase?.getAttribute('aria-pressed')).toBe('false');
    expect(wholeWord?.classList.contains('active')).toBe(false);
    expect(regex?.classList.contains('active')).toBe(false);
    expect(inSelection?.classList.contains('active')).toBe(false);
    expect(preserveCase?.classList.contains('active')).toBe(false);
    expect(wrap?.classList.contains('active')).toBe(true);
    expect(wrap?.getAttribute('aria-pressed')).toBe('true');

    modalState.replace({
      findReplaceMatchCase: true,
      findReplaceWholeWord: true,
      findReplaceUseRegex: true,
      findReplaceInSelection: true,
      findReplacePreserveCase: true,
      findReplaceWrapAround: false
    });
    await tick();

    expect(matchCase?.classList.contains('active')).toBe(true);
    expect(matchCase?.getAttribute('aria-pressed')).toBe('true');
    expect(wholeWord?.classList.contains('active')).toBe(true);
    expect(wholeWord?.getAttribute('aria-pressed')).toBe('true');
    expect(regex?.classList.contains('active')).toBe(true);
    expect(regex?.getAttribute('aria-pressed')).toBe('true');
    expect(inSelection?.classList.contains('active')).toBe(true);
    expect(inSelection?.getAttribute('aria-pressed')).toBe('true');
    expect(preserveCase?.classList.contains('active')).toBe(true);
    expect(preserveCase?.getAttribute('aria-pressed')).toBe('true');
    expect(wrap?.classList.contains('active')).toBe(false);
    expect(wrap?.getAttribute('aria-pressed')).toBe('false');
  });
});
