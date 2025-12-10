import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { storagePut } from "./storage";
import { randomBytes } from "crypto";

/**
 * Text-to-Speech service using ElevenLabs API
 * Converts text to natural-sounding speech audio
 */

// Initialize ElevenLabs client
// Note: In production, add ELEVENLABS_API_KEY to environment variables
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || "",
});

export interface TTSOptions {
  text: string;
  voiceId?: string; // ElevenLabs voice ID
  modelId?: string; // ElevenLabs model ID
}

/**
 * Convert text to speech and return audio URL
 * Returns the URL to the generated audio file stored in S3
 */
export async function textToSpeech(options: TTSOptions): Promise<{ audioUrl: string; audioKey: string }> {
  const {
    text,
    voiceId = "21m00Tcm4TlvDq8ikWAM", // Rachel - warm, friendly female voice
    modelId = "eleven_multilingual_v2", // Supports multiple languages
  } = options;

  try {
    // Generate speech using ElevenLabs
    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text,
      modelId: modelId,
      voiceSettings: {
        stability: 0.5, // Balance between consistency and expressiveness
        similarityBoost: 0.75, // How closely to match the original voice
        style: 0.5, // Style exaggeration (0 = neutral, 1 = exaggerated)
        useSpeakerBoost: true, // Enhance clarity
      },
    });

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream as any) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks.map(c => Buffer.from(c)));

    // Upload to S3
    const audioKey = `voice-comments/${randomBytes(16).toString('hex')}.mp3`;
    const { url: audioUrl } = await storagePut(audioKey, audioBuffer, "audio/mpeg");

    return { audioUrl, audioKey };
  } catch (error) {
    console.error("[TTS] Failed to generate speech:", error);
    throw new Error("Failed to generate speech audio");
  }
}

/**
 * Fallback TTS using browser Web Speech API (client-side)
 * This is a backup option if ElevenLabs is not configured
 */
export function useBrowserTTS(): boolean {
  return !process.env.ELEVENLABS_API_KEY;
}
