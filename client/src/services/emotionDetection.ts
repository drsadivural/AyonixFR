import * as faceapi from 'face-api.js';

/**
 * Emotion Detection Service
 * Uses face-api.js for real-time facial expression and emotion detection
 */

export interface EmotionResult {
  emotion: string;
  confidence: number;
  allEmotions: {
    happy: number;
    sad: number;
    angry: number;
    neutral: number;
    surprised: number;
    fearful: number;
    disgusted: number;
  };
}

let modelsLoaded = false;

/**
 * Load face-api.js models
 * Call this once during app initialization
 */
export async function loadEmotionModels(): Promise<void> {
  if (modelsLoaded) return;

  try {
    const MODEL_URL = '/models'; // Models should be in public/models directory
    
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    ]);

    modelsLoaded = true;
    console.log('[EmotionDetection] Models loaded successfully');
  } catch (error) {
    console.error('[EmotionDetection] Failed to load models:', error);
    throw new Error('Failed to load emotion detection models');
  }
}

/**
 * Detect emotions from a video element or image
 */
export async function detectEmotion(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<EmotionResult | null> {
  if (!modelsLoaded) {
    console.warn('[EmotionDetection] Models not loaded yet');
    return null;
  }

  try {
    const detections = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    if (!detections) {
      return null;
    }

    const expressions = detections.expressions;
    
    // Find the dominant emotion
    let maxEmotion = 'neutral';
    let maxConfidence = 0;
    
    Object.entries(expressions).forEach(([emotion, confidence]) => {
      if (confidence > maxConfidence) {
        maxEmotion = emotion;
        maxConfidence = confidence;
      }
    });

    return {
      emotion: maxEmotion,
      confidence: maxConfidence,
      allEmotions: {
        happy: expressions.happy,
        sad: expressions.sad,
        angry: expressions.angry,
        neutral: expressions.neutral,
        surprised: expressions.surprised,
        fearful: expressions.fearful,
        disgusted: expressions.disgusted,
      },
    };
  } catch (error) {
    console.error('[EmotionDetection] Detection failed:', error);
    return null;
  }
}

/**
 * Get emotion emoji representation
 */
export function getEmotionEmoji(emotion: string): string {
  const emojiMap: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    neutral: '😐',
    surprised: '😲',
    fearful: '😨',
    disgusted: '🤢',
  };
  return emojiMap[emotion] || '😐';
}

/**
 * Get emotion color for UI display
 */
export function getEmotionColor(emotion: string): string {
  const colorMap: Record<string, string> = {
    happy: 'text-green-600',
    sad: 'text-blue-600',
    angry: 'text-red-600',
    neutral: 'text-gray-600',
    surprised: 'text-yellow-600',
    fearful: 'text-purple-600',
    disgusted: 'text-orange-600',
  };
  return colorMap[emotion] || 'text-gray-600';
}

/**
 * Download face-api.js models
 * Models should be placed in public/models directory
 * Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
 */
export function getModelDownloadInfo(): string {
  return `
    To enable emotion detection, download these model files:
    1. tiny_face_detector_model-weights_manifest.json
    2. tiny_face_detector_model-shard1
    3. face_expression_model-weights_manifest.json
    4. face_expression_model-shard1
    5. face_landmark_68_model-weights_manifest.json
    6. face_landmark_68_model-shard1
    
    Place them in: public/models/
    Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
  `;
}
