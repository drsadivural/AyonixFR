import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { storagePut } from "./storage";
import { randomBytes } from "crypto";
import { googleTextToSpeech } from "./tts/googleTTS";
import { azureTextToSpeech } from "./tts/azureTTS";
import * as db from "./db";

/**
 * Unified Text-to-Speech service supporting multiple providers
 * Providers: ElevenLabs, Google Cloud TTS, Azure Cognitive Services, Browser TTS
 */

export type TTSProvider = 'elevenlabs' | 'google' | 'azure' | 'browser';

export interface TTSOptions {
  text: string;
  provider?: TTSProvider;
  voiceName?: string;
  speakingRate?: number;
  pitch?: number;
}

/**
 * Convert text to speech using the configured provider
 * Returns the URL to the generated audio file stored in S3
 */
export async function textToSpeech(options: TTSOptions): Promise<{ audioUrl: string; audioKey: string }> {
  const { text, provider, voiceName, speakingRate, pitch } = options;

  // Get provider from settings if not specified
  let actualProvider = provider;
  if (!actualProvider) {
    const settings = await db.getUserSettings(1); // Get default user settings
    actualProvider = ((settings as any)?.ttsProvider as TTSProvider) || 'browser';
  }

  try {
    switch (actualProvider) {
      case 'elevenlabs':
        return await elevenlabsTTS({ text, voiceName, speakingRate });
      
      case 'google':
        return await googleTextToSpeech({
          text,
          voiceName: voiceName || 'en-US-Neural2-F',
          speakingRate: speakingRate || 1.0,
          pitch: pitch || 0,
        });
      
      case 'azure':
        return await azureTextToSpeech({
          text,
          voiceName: voiceName || 'en-US-JennyNeural',
          speakingRate: speakingRate || 1.0,
          pitch: pitch ? `${pitch > 0 ? '+' : ''}${pitch}Hz` : '+0Hz',
        });
      
      case 'browser':
      default:
        // Browser TTS doesn't generate audio files, handled on client side
        throw new Error('Browser TTS should be handled on client side');
    }
  } catch (error) {
    console.error(`[TTS] Failed to generate speech with ${actualProvider}:`, error);
    throw new Error(`Failed to generate speech with ${actualProvider}`);
  }
}

/**
 * ElevenLabs TTS implementation
 */
async function elevenlabsTTS(options: { text: string; voiceName?: string; speakingRate?: number }): Promise<{ audioUrl: string; audioKey: string }> {
  const {
    text,
    voiceName = "21m00Tcm4TlvDq8ikWAM", // Rachel - warm, friendly female voice
    speakingRate = 1.0,
  } = options;

  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY || "",
  });

  // Generate speech using ElevenLabs
  const audioStream = await elevenlabs.textToSpeech.convert(voiceName, {
    text,
    modelId: "eleven_multilingual_v2",
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.5,
      useSpeakerBoost: true,
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
}

/**
 * Check if browser TTS should be used (no provider configured)
 */
export function useBrowserTTS(provider?: TTSProvider): boolean {
  if (provider) return provider === 'browser';
  
  // Check if any TTS provider is configured
  return !process.env.ELEVENLABS_API_KEY && 
         !process.env.GOOGLE_TTS_API_KEY && 
         !process.env.AZURE_SPEECH_KEY;
}
