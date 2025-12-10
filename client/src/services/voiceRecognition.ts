/**
 * Voice Recognition & Sentiment Analysis Service
 * Uses Web Speech API for voice recognition and sentiment analysis
 */

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  sentiment?: {
    score: number; // -1 (negative) to 1 (positive)
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
}

export type VoiceCommand = 
  | 'start_enrollment'
  | 'start_verification'
  | 'search_person'
  | 'show_dashboard'
  | 'show_settings'
  | 'unknown';

/**
 * Initialize voice recognition
 */
export function createVoiceRecognition(
  onResult: (result: VoiceRecognitionResult) => void,
  onCommand?: (command: VoiceCommand, params?: string) => void
): SpeechRecognition | null {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('[VoiceRecognition] Speech recognition not supported');
    return null;
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event: any) => {
    const last = event.results.length - 1;
    const transcript = event.results[last][0].transcript.trim();
    const confidence = event.results[last][0].confidence;

    // Analyze sentiment
    const sentiment = analyzeSentiment(transcript);

    const result: VoiceRecognitionResult = {
      transcript,
      confidence,
      sentiment,
    };

    onResult(result);

    // Process voice commands
    if (onCommand) {
      const command = parseVoiceCommand(transcript);
      if (command.type !== 'unknown') {
        onCommand(command.type, command.params);
      }
    }
  };

  recognition.onerror = (event: any) => {
    console.error('[VoiceRecognition] Error:', event.error);
  };

  return recognition;
}

/**
 * Parse voice command from transcript
 */
function parseVoiceCommand(transcript: string): { type: VoiceCommand; params?: string } {
  const lower = transcript.toLowerCase();

  if (lower.includes('enroll') || lower.includes('register') || lower.includes('add person')) {
    return { type: 'start_enrollment' };
  }

  if (lower.includes('verify') || lower.includes('verification') || lower.includes('check face')) {
    return { type: 'start_verification' };
  }

  if (lower.includes('search') || lower.includes('find')) {
    // Extract person name after "search" or "find"
    const match = lower.match(/(?:search|find)\s+(.+)/);
    return { type: 'search_person', params: match?.[1] };
  }

  if (lower.includes('dashboard') || lower.includes('home')) {
    return { type: 'show_dashboard' };
  }

  if (lower.includes('settings') || lower.includes('configuration')) {
    return { type: 'show_settings' };
  }

  return { type: 'unknown' };
}

/**
 * Analyze sentiment from text
 * Simple keyword-based sentiment analysis
 * For production, consider using a proper NLP library or API
 */
function analyzeSentiment(text: string): {
  score: number;
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
} {
  const lower = text.toLowerCase();

  // Positive keywords
  const positiveKeywords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
    'happy', 'love', 'nice', 'perfect', 'awesome', 'brilliant',
    'thank', 'thanks', 'pleased', 'delighted', 'glad', 'joy',
  ];

  // Negative keywords
  const negativeKeywords = [
    'bad', 'terrible', 'awful', 'horrible', 'poor', 'worst',
    'hate', 'angry', 'sad', 'upset', 'disappointed', 'frustrated',
    'annoyed', 'irritated', 'unhappy', 'dislike', 'problem', 'issue',
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveKeywords.forEach(keyword => {
    if (lower.includes(keyword)) positiveCount++;
  });

  negativeKeywords.forEach(keyword => {
    if (lower.includes(keyword)) negativeCount++;
  });

  const totalKeywords = positiveCount + negativeCount;
  
  if (totalKeywords === 0) {
    return { score: 0, label: 'neutral', confidence: 0.5 };
  }

  const score = (positiveCount - negativeCount) / totalKeywords;
  const confidence = totalKeywords / 3; // Normalize confidence

  let label: 'positive' | 'negative' | 'neutral';
  if (score > 0.2) {
    label = 'positive';
  } else if (score < -0.2) {
    label = 'negative';
  } else {
    label = 'neutral';
  }

  return {
    score: Math.max(-1, Math.min(1, score)),
    label,
    confidence: Math.min(1, confidence),
  };
}

/**
 * Get sentiment color for UI display
 */
export function getSentimentColor(label: 'positive' | 'negative' | 'neutral'): string {
  const colorMap = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  };
  return colorMap[label];
}

/**
 * Get sentiment emoji
 */
export function getSentimentEmoji(label: 'positive' | 'negative' | 'neutral'): string {
  const emojiMap = {
    positive: '😊',
    negative: '😞',
    neutral: '😐',
  };
  return emojiMap[label];
}

/**
 * Check if voice recognition is supported
 */
export function isVoiceRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}
