/**
 * Voice Activity Detection (VAD) AudioWorklet Processor
 *
 * Detects speech onset/offset using RMS energy thresholding with
 * hysteresis (onset and offset frame counts).
 *
 * Messages to main thread:
 *   - { type: "vad", event: "activity_start" } — user started speaking
 *   - { type: "vad", event: "activity_end" }   — user stopped speaking
 *
 * These messages are forwarded by the hook to the Python live-agent service
 * as JSON WebSocket frames, which translates them to ADK LiveRequestQueue
 * activity signals (replacing server-side VAD).
 */

// Tuning constants
const ENERGY_THRESHOLD = 0.02; // RMS energy threshold for voice detection
const ONSET_FRAMES = 8;        // Consecutive voiced frames to trigger start
const OFFSET_FRAMES = 60;      // Consecutive silent frames to trigger end (~480ms)

class VADProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._voicedFrames = 0;
    this._silentFrames = 0;
    this._isSpeaking = false;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input || input.length === 0) return true;

    // Compute RMS energy
    let sum = 0;
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * input[i];
    }
    const energy = Math.sqrt(sum / input.length);

    if (energy > ENERGY_THRESHOLD) {
      this._voicedFrames++;
      this._silentFrames = 0;

      if (!this._isSpeaking && this._voicedFrames >= ONSET_FRAMES) {
        this._isSpeaking = true;
        this.port.postMessage({ type: "vad", event: "activity_start" });
      }
    } else {
      this._silentFrames++;
      this._voicedFrames = 0;

      if (this._isSpeaking && this._silentFrames >= OFFSET_FRAMES) {
        this._isSpeaking = false;
        this.port.postMessage({ type: "vad", event: "activity_end" });
      }
    }

    return true;
  }
}

registerProcessor("vad-processor", VADProcessor);
