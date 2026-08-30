// Buffers microphone samples into roughly 20-25 ms chunks for low-latency delivery.
class CarelyPcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(1024);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    let sourceOffset = 0;
    while (sourceOffset < input.length) {
      const length = Math.min(input.length - sourceOffset, this.buffer.length - this.offset);
      this.buffer.set(input.subarray(sourceOffset, sourceOffset + length), this.offset);
      sourceOffset += length;
      this.offset += length;

      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer, [this.buffer.buffer]);
        this.buffer = new Float32Array(1024);
        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor("carely-pcm-capture", CarelyPcmCaptureProcessor);
