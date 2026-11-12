export interface DeviceSignals {
  webgl: boolean;
  hardwareConcurrency: number | undefined;
  deviceMemory: number | undefined;
  saveData: boolean;
  viewportWidth: number;
  reducedMotion: boolean;
}

interface NavigatorExtras {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/**
 * True when a hardware-accelerated WebGL context can be created. Software
 * renderers are rejected (`failIfMajorPerformanceCaveat`), exactly like the real
 * scene does, so such devices never download the 3D chunk in the first place.
 */
export function supportsWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const options: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true };
    const gl = canvas.getContext('webgl2', options) ?? canvas.getContext('webgl', options);
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function readDeviceSignals(): DeviceSignals {
  const nav = (typeof navigator === 'undefined' ? {} : navigator) as Navigator & NavigatorExtras;
  return {
    webgl: supportsWebGL(),
    hardwareConcurrency: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : undefined,
    deviceMemory: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : undefined,
    saveData: nav.connection?.saveData === true,
    viewportWidth: typeof window === 'undefined' ? 0 : window.innerWidth,
    reducedMotion:
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

/**
 * A device is treated as low-end (no 3D chunk is downloaded) when ANY of these hold:
 * no WebGL, ≤4 logical cores, ≤4 GB memory, Save-Data enabled, viewport < 768px,
 * or the user prefers reduced motion.
 */
export function isLowEndDevice(s: DeviceSignals): boolean {
  if (!s.webgl) return true;
  if (s.hardwareConcurrency !== undefined && s.hardwareConcurrency <= 4) return true;
  if (s.deviceMemory !== undefined && s.deviceMemory <= 4) return true;
  if (s.saveData) return true;
  if (s.viewportWidth < 768) return true;
  if (s.reducedMotion) return true;
  return false;
}
