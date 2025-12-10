import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { storagePut } from '../storage';
import { randomBytes } from 'crypto';

/**
 * Google Cloud Text-to-Speech provider
 * Requires GOOGLE_TTS_API_KEY environment variable
 */

export interface GoogleTTSOptions {
  text: string;
  languageCode?: string;
  voiceName?: string;
  speakingRate?: number;
  pitch?: number;
}

/**
 * Convert text to speech using Google Cloud TTS
 */
export async function googleTextToSpeech(options: GoogleTTSOptions): Promise<{ audioUrl: string; audioKey: string }> {
  const {
    text,
    languageCode = 'en-US',
    voiceName = 'en-US-Neural2-F', // Female voice, warm and friendly
    speakingRate = 1.0,
    pitch = 0.0,
  } = options;

  try {
    // Initialize client with API key
    const client = new TextToSpeechClient({
      apiKey: process.env.GOOGLE_TTS_API_KEY,
    });

    // Construct the request
    const request = {
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate,
        pitch,
      },
    };

    // Perform the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);

    if (!response.audioContent) {
      throw new Error('No audio content received from Google TTS');
    }

    // Convert to buffer
    const audioBuffer = Buffer.from(response.audioContent as Uint8Array);

    // Upload to S3
    const audioKey = `voice-comments/${randomBytes(16).toString('hex')}.mp3`;
    const { url: audioUrl } = await storagePut(audioKey, audioBuffer, 'audio/mpeg');

    return { audioUrl, audioKey };
  } catch (error) {
    console.error('[GoogleTTS] Failed to generate speech:', error);
    throw new Error('Failed to generate speech with Google TTS');
  }
}

/**
 * Available Google TTS voices
 */
export const GOOGLE_VOICES = {
  'en-US': [
    { name: 'en-US-Neural2-A', gender: 'Male', description: 'Male voice, neutral' },
    { name: 'en-US-Neural2-C', gender: 'Female', description: 'Female voice, neutral' },
    { name: 'en-US-Neural2-D', gender: 'Male', description: 'Male voice, warm' },
    { name: 'en-US-Neural2-F', gender: 'Female', description: 'Female voice, warm' },
    { name: 'en-US-Neural2-G', gender: 'Female', description: 'Female voice, expressive' },
    { name: 'en-US-Neural2-H', gender: 'Female', description: 'Female voice, clear' },
  ],
  'ja-JP': [
    { name: 'ja-JP-Neural2-B', gender: 'Female', description: 'Female voice, neutral' },
    { name: 'ja-JP-Neural2-C', gender: 'Male', description: 'Male voice, neutral' },
    { name: 'ja-JP-Neural2-D', gender: 'Male', description: 'Male voice, warm' },
  ],
};
