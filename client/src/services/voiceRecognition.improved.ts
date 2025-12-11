/**
 * Improved Voice Recognition Service
 * Enhanced accuracy with fuzzy matching, multi-language support, and better error handling
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
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Fuzzy match with threshold
 */
function fuzzyMatch(input: string, target: string, threshold: number = 0.7): boolean {
  const distance = levenshteinDistance(input.toLowerCase(), target.toLowerCase());
  const maxLen = Math.max(input.length, target.length);
  const similarity = 1 - (distance / maxLen);
  return similarity >= threshold;
}

/**
 * Enhanced command patterns with fuzzy matching
 */
const COMMAND_PATTERNS = {
  start_enrollment: [
    'enroll', 'register', 'add person', 'new person', 'create profile',
    'start enrollment', 'begin enrollment', 'add new face', 'register face',
    '登録', '新規登録', '顔登録', 'とうろく' // Japanese
  ],
  start_verification: [
    'verify', 'verification', 'check face', 'identify', 'recognize',
    'start verification', 'begin verification', 'check identity', 'who is this',
    '認証', '確認', '顔認証', 'にんしょう', 'かくにん' // Japanese
  ],
  search_person: [
    'search', 'find', 'look for', 'locate', 'show me',
    '検索', '探す', 'けんさく', 'さがす' // Japanese
  ],
  show_dashboard: [
    'dashboard', 'home', 'main page', 'go home', 'show dashboard',
    'ダッシュボード', 'ホーム', 'だっしゅぼーど' // Japanese
  ],
  show_settings: [
    'settings', 'configuration', 'preferences', 'options', 'setup',
    '設定', 'せってい' // Japanese
  ],
};

/**
 * Initialize voice recognition with improved accuracy
 */
export function createVoiceRecognition(
  onResult: (result: VoiceRecognitionResult) => void,
  onCommand?: (command: VoiceCommand, params?: string) => void,
  language: 'en-US' | 'ja-JP' = 'en-US'
): typeof SpeechRecognition | null {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('[VoiceRecognition] Speech recognition not supported');
    return null;
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  // Enhanced configuration for better accuracy
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = language;
  recognition.maxAlternatives = 3; // Get multiple alternatives for better matching

  recognition.onresult = (event: any) => {
    const last = event.results.length - 1;
    const alternatives = event.results[last];
    
    // Try all alternatives for best match
    let bestTranscript = alternatives[0].transcript.trim();
    let bestConfidence = alternatives[0].confidence;
    
    // Check all alternatives for command matches
    for (let i = 0; i < alternatives.length; i++) {
      const transcript = alternatives[i].transcript.trim();
      const command = parseVoiceCommandWithFuzzy(transcript);
      
      if (command.type !== 'unknown') {
        bestTranscript = transcript;
        bestConfidence = alternatives[i].confidence;
        break;
      }
    }

    // Analyze sentiment
    const sentiment = analyzeSentiment(bestTranscript);

    const result: VoiceRecognitionResult = {
      transcript: bestTranscript,
      confidence: bestConfidence,
      sentiment,
    };

    onResult(result);

    // Process voice commands
    if (onCommand) {
      const command = parseVoiceCommandWithFuzzy(bestTranscript);
      if (command.type !== 'unknown') {
        onCommand(command.type, command.params);
      }
    }
  };

  recognition.onerror = (event: any) => {
    console.error('[VoiceRecognition] Error:', event.error);
    
    // Handle specific errors
    if (event.error === 'no-speech') {
      console.log('[VoiceRecognition] No speech detected, continuing...');
    } else if (event.error === 'audio-capture') {
      console.error('[VoiceRecognition] No microphone found');
    } else if (event.error === 'not-allowed') {
      console.error('[VoiceRecognition] Microphone permission denied');
    }
  };

  return recognition;
}

/**
 * Parse voice command with fuzzy matching
 */
function parseVoiceCommandWithFuzzy(transcript: string): { type: VoiceCommand; params?: string } {
  const lower = transcript.toLowerCase();

  // Try exact and fuzzy matching for each command type
  for (const [commandType, patterns] of Object.entries(COMMAND_PATTERNS)) {
    for (const pattern of patterns) {
      // Exact match
      if (lower.includes(pattern.toLowerCase())) {
        return extractCommandParams(commandType as VoiceCommand, lower, pattern);
      }
      
      // Fuzzy match for single-word commands
      const words = lower.split(/\s+/);
      for (const word of words) {
        if (word.length >= 4 && fuzzyMatch(word, pattern, 0.75)) {
          return extractCommandParams(commandType as VoiceCommand, lower, pattern);
        }
      }
    }
  }

  return { type: 'unknown' };
}

/**
 * Extract command parameters
 */
function extractCommandParams(command: VoiceCommand, transcript: string, pattern: string): { type: VoiceCommand; params?: string } {
  if (command === 'search_person') {
    // Extract person name after search keywords
    const searchKeywords = ['search', 'find', 'look for', 'locate', 'show me', '検索', '探す'];
    for (const keyword of searchKeywords) {
      const index = transcript.indexOf(keyword);
      if (index !== -1) {
        const params = transcript.substring(index + keyword.length).trim();
        if (params) {
          return { type: command, params };
        }
      }
    }
  }

  return { type: command };
}

/**
 * Analyze sentiment from text
 * Enhanced with more keywords and better scoring
 */
function analyzeSentiment(text: string): {
  score: number;
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
} {
  const lower = text.toLowerCase();

  // Enhanced positive keywords
  const positiveKeywords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
    'happy', 'love', 'nice', 'perfect', 'awesome', 'brilliant',
    'thank', 'thanks', 'pleased', 'delighted', 'glad', 'joy',
    'beautiful', 'superb', 'outstanding', 'impressive', 'splendid',
    'よい', 'いい', '素晴らしい', 'すばらしい', 'ありがとう', '嬉しい' // Japanese
  ];

  // Enhanced negative keywords
  const negativeKeywords = [
    'bad', 'terrible', 'awful', 'horrible', 'poor', 'worst',
    'hate', 'angry', 'sad', 'upset', 'disappointed', 'frustrated',
    'annoyed', 'irritated', 'unhappy', 'dislike', 'problem', 'issue',
    'fail', 'error', 'wrong', 'broken', 'useless',
    '悪い', 'わるい', 'だめ', '嫌い', 'きらい', '困る' // Japanese
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
  const confidence = Math.min(1, totalKeywords / 3);

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
    confidence,
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

/**
 * Get suggested corrections for unrecognized commands
 */
export function getSuggestedCommands(transcript: string): string[] {
  const suggestions: string[] = [];
  const lower = transcript.toLowerCase();

  // Find closest matches using fuzzy matching
  const allPatterns = Object.values(COMMAND_PATTERNS).flat();
  const matches = allPatterns
    .map(pattern => ({
      pattern,
      distance: levenshteinDistance(lower, pattern.toLowerCase())
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .filter(m => m.distance <= 5)
    .map(m => m.pattern);

  return matches;
}
