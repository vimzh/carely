// Verifies the microphone resampler produces correctly bounded PCM16 data.
import { expect, test } from "bun:test";

import { downsampleToPcm16 } from "./voice-audio";

test("downsamples microphone samples to 16 kHz PCM", () => {
  const pcm = downsampleToPcm16(new Float32Array([1, 1, 1, -1, -1, -1]), 48_000);
  const samples = new DataView(pcm);

  expect(pcm.byteLength).toBe(4);
  expect(samples.getInt16(0, true)).toBe(0x7fff);
  expect(samples.getInt16(2, true)).toBe(-0x8000);
});
