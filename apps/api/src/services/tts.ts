import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { env } from "../config/env.js";

const client = new TextToSpeechClient();

/**
 * Synthesizes speech from text and returns a base64 encoded MP3 string.
 */
export async function synthesizeSpeech(text: string): Promise<string> {
  const request = {
    input: { text },
    voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" as const },
    audioConfig: { audioEncoding: "MP3" as const },
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    const audioContent = response.audioContent;

    if (!audioContent) {
      throw new Error("No audio content returned from TTS API");
    }

    // Convert Buffer to base64 string
    const base64 =
      typeof audioContent === "string"
        ? audioContent
        : Buffer.from(audioContent).toString("base64");

    return base64;
  } catch (error) {
    console.error("TTS Synthesis Error:", error);
    throw error;
  }
}
