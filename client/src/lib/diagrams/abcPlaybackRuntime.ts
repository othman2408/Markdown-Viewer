import { AbcCursorControl } from './abcCursorControl';

export const ABC_SOUND_FONT_URL = 'https://paulrosen.github.io/midi-js-soundfonts/FluidR3_GM/';

type AbcRuntime = {
  TimingCallbacks: new (visualObj: unknown, options: { eventCallback(event: unknown): void }) => { start(): void; stop(): void };
  synth: {
    CreateSynth: new () => {
      init(options: unknown): Promise<void>;
      prime(): Promise<void>;
      start(): Promise<void>;
      stop(): void;
    };
    supportsAudio(): boolean;
  };
};

export type AbcPlaybackRuntimeOptions = {
  alertRef?: (message: string) => void;
  consoleRef?: Pick<Console, 'error' | 'warn'>;
  documentRef?: Document;
  getABCJS(): AbcRuntime | undefined;
};

export type AbcPlaybackRuntime = {
  stopActiveAbcPlayback(): void;
  toggleAbcPlay(visualObj: unknown[] | null | undefined, button: HTMLElement, container: HTMLElement): void;
};

export function createAbcPlaybackRuntime(
  options: AbcPlaybackRuntimeOptions
): AbcPlaybackRuntime {
  const documentRef = options.documentRef ?? document;
  const consoleRef = options.consoleRef ?? console;
  const alertRef = options.alertRef ?? alert;
  let activeAbcSynth: InstanceType<AbcRuntime['synth']['CreateSynth']> | null = null;
  let activeAbcTimingCallbacks: InstanceType<AbcRuntime['TimingCallbacks']> | null = null;
  let activeAbcBtn: HTMLElement | null = null;

  function stopActiveAbcPlayback(): void {
    if (activeAbcSynth) {
      try {
        activeAbcSynth.stop();
      } catch (error) {
        consoleRef.warn('Error stopping ABC playback:', error);
      }
      activeAbcSynth = null;
    }
    if (activeAbcTimingCallbacks) {
      try {
        activeAbcTimingCallbacks.stop();
      } catch (error) {
        consoleRef.warn('Error stopping ABC timing callbacks:', error);
      }
      activeAbcTimingCallbacks = null;
    }

    documentRef.querySelectorAll('.abc-notation svg .abcjs-cursor').forEach((element) => element.remove());
    documentRef.querySelectorAll('.abc-notation svg .abcjs-highlight').forEach((element) => {
      element.classList.remove('abcjs-highlight');
    });

    if (activeAbcBtn) {
      activeAbcBtn.innerHTML = '<i class="bi bi-play-fill"></i> Listen';
      activeAbcBtn.setAttribute('aria-label', 'Listen to score');
      activeAbcBtn = null;
    }
  }

  function toggleAbcPlay(visualObj: unknown[] | null | undefined, btn: HTMLElement, container: HTMLElement): void {
    if (!visualObj || !visualObj[0]) return;
    if (activeAbcBtn === btn) {
      stopActiveAbcPlayback();
      return;
    }

    stopActiveAbcPlayback();
    const ABCJS = options.getABCJS();
    if (!ABCJS || !ABCJS.synth.supportsAudio()) {
      alertRef('Audio playback is not supported in this browser.');
      return;
    }

    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading...';
    activeAbcBtn = btn;

    try {
      const synth = new ABCJS.synth.CreateSynth();
      activeAbcSynth = synth;
      const cursorControl = new AbcCursorControl(container);
      const timingCallbacks = new ABCJS.TimingCallbacks(visualObj[0], {
        eventCallback(event) {
          if (event) {
            cursorControl.onEvent(event);
          } else {
            cursorControl.onFinished();
          }
        }
      });
      activeAbcTimingCallbacks = timingCallbacks;
      synth.init({
        visualObj: visualObj[0],
        options: {
          soundFontUrl: ABC_SOUND_FONT_URL,
          onEnded() {
            if (activeAbcSynth === synth) {
              stopActiveAbcPlayback();
            }
          }
        }
      })
        .then(() => {
          if (activeAbcSynth !== synth) return undefined;
          return synth.prime();
        })
        .then(() => {
          if (activeAbcSynth !== synth) return undefined;
          cursorControl.onStart();
          timingCallbacks.start();
          btn.innerHTML = '<i class="bi bi-stop-fill"></i> Stop';
          btn.setAttribute('aria-label', 'Stop playback');
          return synth.start();
        })
        .catch((error) => {
          consoleRef.error('ABC synth initialization failed:', error);
          btn.innerHTML = originalHtml;
          if (activeAbcBtn === btn) {
            activeAbcBtn = null;
          }
          if (activeAbcSynth === synth) {
            activeAbcSynth = null;
          }
          if (activeAbcTimingCallbacks === timingCallbacks) {
            activeAbcTimingCallbacks = null;
          }
          cursorControl.onFinished();
        });
    } catch (error) {
      consoleRef.error('ABC audio setup error:', error);
      btn.innerHTML = originalHtml;
      activeAbcBtn = null;
      activeAbcSynth = null;
      activeAbcTimingCallbacks = null;
    }
  }

  return {
    stopActiveAbcPlayback,
    toggleAbcPlay
  };
}
