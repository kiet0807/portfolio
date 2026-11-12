import { describe, expect, it } from 'vitest';
import { isLowEndDevice, type DeviceSignals } from '@/lib/device';

const capable: DeviceSignals = {
  webgl: true,
  hardwareConcurrency: 8,
  deviceMemory: 8,
  saveData: false,
  viewportWidth: 1280,
  reducedMotion: false,
};

describe('isLowEndDevice', () => {
  it('accepts a capable desktop', () => {
    expect(isLowEndDevice(capable)).toBe(false);
  });
  it('accepts browsers that do not report cores or memory', () => {
    expect(isLowEndDevice({ ...capable, hardwareConcurrency: undefined, deviceMemory: undefined })).toBe(
      false,
    );
  });
  it.each<[string, Partial<DeviceSignals>]>([
    ['no WebGL', { webgl: false }],
    ['4 cores or fewer', { hardwareConcurrency: 4 }],
    ['4 GB of memory or less', { deviceMemory: 4 }],
    ['Save-Data enabled', { saveData: true }],
    ['viewport narrower than 768px', { viewportWidth: 767 }],
    ['reduced motion', { reducedMotion: true }],
  ])('treats %s as low-end', (_label, override) => {
    expect(isLowEndDevice({ ...capable, ...override })).toBe(true);
  });
});
