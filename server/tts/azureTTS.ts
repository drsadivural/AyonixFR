import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { storagePut } from '../storage';
import { randomBytes } from 'crypto';

/**
 * Azure Cognitive Services Speech provider
 * Requires AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables
 */

export interface AzureTTSOptions {
  text: string;
  voiceName?: string;
  speakingRate?: number;
  pitch?: string;
}

/**
 * Convert text to speech using Azure Cognitive Services
 */
export async function azureTextToSpeech(options: AzureTTSOptions): Promise<{ audioUrl: string; audioKey: string }> {
  const {
    text,
    voiceName = 'en-US-JennyNeural', // Female voice, warm and friendly
    speakingRate = 1.0,
    pitch = '+0Hz',
  } = options;

  return new Promise((resolve, reject) => {
    try {
      const speechKey = process.env.AZURE_SPEECH_KEY;
      const speechRegion = process.env.AZURE_SPEECH_REGION || 'eastus';

      if (!speechKey) {
        throw new Error('AZURE_SPEECH_KEY not configured');
      }

      // Configure speech synthesis
      const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
      speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

      // Create synthesizer with null output (we'll get audio from result)
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, undefined as any);

      // Build SSML for advanced control
      const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
          <voice name="${voiceName}">
            <prosody rate="${speakingRate}" pitch="${pitch}">
              ${text}
            </prosody>
          </voice>
        </speak>
      `;

      // Synthesize speech
      synthesizer.speakSsmlAsync(
        ssml,
        async (result) => {
          synthesizer.close();

          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            try {
              // Get audio data
              const audioBuffer = Buffer.from(result.audioData);

              // Upload to S3
              const audioKey = `voice-comments/${randomBytes(16).toString('hex')}.mp3`;
              const { url: audioUrl } = await storagePut(audioKey, audioBuffer, 'audio/mpeg');

              resolve({ audioUrl, audioKey });
            } catch (error) {
              reject(error);
            }
          } else {
            reject(new Error(`Speech synthesis failed: ${result.errorDetails}`));
          }
        },
        (error) => {
          synthesizer.close();
          reject(new Error(`Speech synthesis error: ${error}`));
        }
      );
    } catch (error) {
      console.error('[AzureTTS] Failed to generate speech:', error);
      reject(new Error('Failed to generate speech with Azure TTS'));
    }
  });
}

/**
 * Available Azure TTS voices
 */
export const AZURE_VOICES = {
  'en-US': [
    { name: 'en-US-JennyNeural', gender: 'Female', description: 'Female voice, warm and friendly' },
    { name: 'en-US-AriaNeural', gender: 'Female', description: 'Female voice, neutral' },
    { name: 'en-US-GuyNeural', gender: 'Male', description: 'Male voice, neutral' },
    { name: 'en-US-DavisNeural', gender: 'Male', description: 'Male voice, warm' },
    { name: 'en-US-AmberNeural', gender: 'Female', description: 'Female voice, expressive' },
    { name: 'en-US-AshleyNeural', gender: 'Female', description: 'Female voice, clear' },
  ],
  'ja-JP': [
    { name: 'ja-JP-NanamiNeural', gender: 'Female', description: 'Female voice, neutral' },
    { name: 'ja-JP-KeitaNeural', gender: 'Male', description: 'Male voice, neutral' },
    { name: 'ja-JP-AoiNeural', gender: 'Female', description: 'Female voice, warm' },
  ],
};
