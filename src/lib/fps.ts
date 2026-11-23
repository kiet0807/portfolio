/** What to do about the 3D scene: keep it, draw fewer pixels, or give it up. */
export type FpsVerdict = 'ok' | 'degrade' | 'fail';

export interface FpsMeter {
  /** Takes the time since the previous frame, in seconds. Returns a verdict when there is one. */
  sample: (delta: number) => FpsVerdict | null;
}

/** The first second is not measured: shaders compile and textures upload. */
const WARMUP_S = 1;
const WINDOW_S = 2;
const MIN_FPS = 30;
/** Longer than this between two frames is not a steady frame rate: start measuring again. */
const GAP_S = 0.25;
/** Longer than this is a pause (a sleeping computer, a debugger), not a slow frame. */
const PAUSE_S = 2;
/** This many long gaps, however far apart, mean a scene too slow to even be measured. */
const MAX_GAPS = 5;

/**
 * Judges the frame rate of the 3D scene from its first seconds. Too slow → 'degrade' once;
 * still too slow → 'fail'. Fast enough → 'ok'. After 'ok' or 'fail' it has nothing more to say.
 */
export function createFpsMeter(): FpsMeter {
  let warmup = 0;
  let frames = 0;
  let time = 0;
  let gaps = 0;
  let degraded = false;
  let done = false;

  const restart = () => {
    warmup = 0;
    frames = 0;
    time = 0;
  };

  const tooSlow = (): FpsVerdict => {
    restart();
    gaps = 0;
    if (degraded) {
      done = true;
      return 'fail';
    }
    degraded = true;
    return 'degrade';
  };

  return {
    sample(delta) {
      if (done) return null;
      if (delta > GAP_S) {
        restart();
        if (delta > PAUSE_S) return null;
        gaps += 1;
        return gaps >= MAX_GAPS ? tooSlow() : null;
      }
      if (warmup < WARMUP_S) {
        warmup += delta;
        return null;
      }
      frames += 1;
      time += delta;
      if (time < WINDOW_S) return null;
      if (frames / time < MIN_FPS) return tooSlow();
      done = true;
      return 'ok';
    },
  };
}
