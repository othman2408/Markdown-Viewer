// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { ABC_SOUND_FONT_URL, createAbcPlaybackRuntime } from '../../../lib/diagrams/abcPlaybackRuntime';

describe('ABC playback runtime', () => {
  it('alerts when audio playback is unsupported', () => {
    const alertRef = vi.fn();
    const runtime = createAbcPlaybackRuntime({
      alertRef,
      getABCJS: () => ({
        TimingCallbacks: vi.fn() as never,
        synth: {
          CreateSynth: vi.fn() as never,
          supportsAudio: () => false
        }
      })
    });

    runtime.toggleAbcPlay([{}], document.createElement('button'), document.createElement('div'));

    expect(alertRef).toHaveBeenCalledWith('Audio playback is not supported in this browser.');
  });

  it('cleans active ABC cursor and highlight markup on stop', () => {
    document.body.innerHTML = `
      <div class="abc-notation">
        <svg>
          <g class="abcjs-cursor"></g>
          <g id="highlight" class="abcjs-highlight"></g>
        </svg>
      </div>
    `;
    const runtime = createAbcPlaybackRuntime({
      getABCJS: () => undefined
    });

    runtime.stopActiveAbcPlayback();

    expect(document.querySelector('.abcjs-cursor')).toBeNull();
    expect(document.getElementById('highlight')?.classList.contains('abcjs-highlight')).toBe(false);
  });

  it('passes the configured soundfont URL into ABCJS synth initialization', () => {
    const visualObj = {};
    const init = vi.fn(() => Promise.resolve());
    const synth = {
      init,
      prime: vi.fn(() => Promise.resolve()),
      start: vi.fn(() => Promise.resolve()),
      stop: vi.fn()
    };
    const CreateSynth = vi.fn(function CreateSynthMock() {
      return synth;
    });
    const start = vi.fn();
    const TimingCallbacks = vi.fn(function TimingCallbacksMock() {
      return {
      start,
      stop: vi.fn()
      };
    });

    const runtime = createAbcPlaybackRuntime({
      getABCJS: () => ({
        TimingCallbacks: TimingCallbacks as never,
        synth: {
          CreateSynth: CreateSynth as never,
          supportsAudio: () => true
        }
      })
    });

    runtime.toggleAbcPlay([visualObj], document.createElement('button'), document.createElement('div'));

    expect(init).toHaveBeenCalledWith(expect.objectContaining({
      visualObj,
      options: expect.objectContaining({
        soundFontUrl: ABC_SOUND_FONT_URL
      })
    }));
  });
});
