// Captures 16 kHz PCM microphone audio and schedules 24 kHz PCM playback.
export function downsampleToPcm16(input: Float32Array, inputRate: number, outputRate = 16_000) {
  if (outputRate > inputRate) throw new Error("The output sample rate must not exceed the input rate.");

  const ratio = inputRate / outputRate;
  const output = new ArrayBuffer(Math.floor(input.length / ratio) * 2);
  const view = new DataView(output);

  for (let index = 0; index < output.byteLength / 2; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.max(start + 1, Math.floor((index + 1) * ratio));
    let total = 0;
    for (let sample = start; sample < end && sample < input.length; sample += 1) total += input[sample];
    const value = Math.max(-1, Math.min(1, total / (end - start)));
    view.setInt16(index * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }

  return output;
}

export type CallAudio = {
  close: () => Promise<void>;
  play: (pcm: ArrayBuffer) => void;
  stopPlayback: () => void;
};

export async function createCallAudio(
  onMicrophoneAudio: (pcm: ArrayBuffer) => void,
  onPlaybackIdle: () => void,
): Promise<CallAudio> {
  const context = new AudioContext();
  let stream: MediaStream;
  try {
    await context.resume();
    await context.audioWorklet.addModule("/pcm-capture-worklet.js");
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { autoGainControl: true, echoCancellation: true, noiseSuppression: true },
    });
  } catch (error) {
    await context.close();
    throw error;
  }

  const source = context.createMediaStreamSource(stream);
  const capture = new AudioWorkletNode(context, "carely-pcm-capture", { numberOfOutputs: 0 });
  const playing = new Set<AudioBufferSourceNode>();
  let nextStartTime = 0;

  capture.port.onmessage = (event: MessageEvent<Float32Array>) => {
    onMicrophoneAudio(downsampleToPcm16(event.data, context.sampleRate));
  };
  source.connect(capture);

  function stopPlayback() {
    for (const node of playing) node.stop();
    playing.clear();
    nextStartTime = context.currentTime;
  }

  return {
    play(pcm) {
      const view = new DataView(pcm);
      const sampleCount = Math.floor(view.byteLength / 2);
      if (!sampleCount) return;

      const buffer = context.createBuffer(1, sampleCount, 24_000);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < sampleCount; index += 1) {
        channel[index] = view.getInt16(index * 2, true) / 0x8000;
      }

      const node = context.createBufferSource();
      node.buffer = buffer;
      node.connect(context.destination);
      node.onended = () => {
        playing.delete(node);
        if (!playing.size) onPlaybackIdle();
      };
      const startAt = Math.max(context.currentTime + 0.02, nextStartTime);
      node.start(startAt);
      nextStartTime = startAt + buffer.duration;
      playing.add(node);
    },
    stopPlayback,
    async close() {
      stopPlayback();
      source.disconnect();
      capture.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      await context.close();
    },
  };
}
