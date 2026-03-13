/**
 * PCM Recorder AudioWorklet Processor
 *
 * Captures microphone audio and converts Float32 samples to Int16 PCM.
 * When used with AudioContext({ sampleRate: 16000 }), no manual downsampling
 * is needed — the browser resamples natively.
 *
 * Output: ArrayBuffer of Int16 PCM samples, transferred via zero-copy postMessage.
 */
class PCMRecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input || input.length === 0) return true;

    // Convert Float32 [-1, 1] → Int16 [-32768, 32767]
    const pcm = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Transfer ownership (zero-copy) to main thread
    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    return true;
  }
}

registerProcessor("pcm-recorder-processor", PCMRecorderProcessor);
