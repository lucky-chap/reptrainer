/**
 * PCM Player AudioWorklet Processor (Ring Buffer)
 *
 * Receives Int16 PCM chunks from the main thread and plays them back
 * through a ring buffer. When used with AudioContext({ sampleRate: 24000 }),
 * output matches the Gemini Live API's native 24kHz audio.
 *
 * Messages from main thread:
 *   - ArrayBuffer: Int16 PCM audio data to enqueue
 *   - { command: "clear" }: Clear the buffer (on interruption)
 *   - { command: "query_state" }: Reply with current buffer state
 *
 * Messages to main thread:
 *   - { type: "state", playing: boolean, buffered: number }
 *   - { type: "drain" }: Buffer has emptied (playback finished)
 */
class PCMPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // 10-second ring buffer at 24kHz
    this._bufferSize = 24000 * 10;
    this._buffer = new Float32Array(this._bufferSize);
    this._writePos = 0;
    this._readPos = 0;
    this._count = 0; // samples available to read
    this._wasPlaying = false;

    this.port.onmessage = (event) => {
      const data = event.data;

      // Clear command (interruption)
      if (data && data.command === "clear") {
        this._readPos = this._writePos;
        this._count = 0;
        this._wasPlaying = false;
        return;
      }

      // Query state
      if (data && data.command === "query_state") {
        this.port.postMessage({
          type: "state",
          playing: this._count > 0,
          buffered: this._count,
        });
        return;
      }

      // Audio data: Int16 PCM ArrayBuffer
      if (data instanceof ArrayBuffer || data.byteLength !== undefined) {
        const pcm = new Int16Array(data);
        for (let i = 0; i < pcm.length; i++) {
          this._buffer[this._writePos % this._bufferSize] = pcm[i] / 32768;
          this._writePos++;
          this._count++;
        }
        this._wasPlaying = true;
      }
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0]?.[0];
    if (!output) return true;

    for (let i = 0; i < output.length; i++) {
      if (this._count > 0) {
        output[i] = this._buffer[this._readPos % this._bufferSize];
        this._readPos++;
        this._count--;
      } else {
        output[i] = 0; // Silence (buffer underrun)
      }
    }

    // Notify main thread when buffer drains
    if (this._count === 0 && this._wasPlaying) {
      this._wasPlaying = false;
      this.port.postMessage({ type: "drain" });
    }

    return true;
  }
}

registerProcessor("pcm-player-processor", PCMPlayerProcessor);
