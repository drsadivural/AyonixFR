/**
 * Comprehensive Voice Assistant Service
 * Handles voice commands, responses, and proactive communication
 */

export interface VoiceCommand {
  pattern: RegExp;
  action: string;
  params?: string[];
  description: string;
}

export interface VoiceResponse {
  text: string;
  priority: 'low' | 'normal' | 'high';
}

// Comprehensive voice command patterns
export const VOICE_COMMANDS: VoiceCommand[] = [
  // Navigation Commands
  { pattern: /(?:go to|open|show|navigate to)\s*(?:the\s*)?dashboard/i, action: 'navigate_dashboard', description: 'Go to dashboard' },
  { pattern: /(?:go to|open|show)\s*(?:the\s*)?enrollment/i, action: 'navigate_enrollment', description: 'Open enrollment page' },
  { pattern: /(?:go to|open|show)\s*(?:the\s*)?enrollees/i, action: 'navigate_enrollees', description: 'Show enrollees list' },
  { pattern: /(?:go to|open|show)\s*(?:the\s*)?verification/i, action: 'navigate_verification', description: 'Open verification page' },
  { pattern: /(?:go to|open|show)\s*(?:the\s*)?events/i, action: 'navigate_events', description: 'Show events log' },
  { pattern: /(?:go to|open|show)\s*settings/i, action: 'navigate_settings', description: 'Open settings' },
  { pattern: /(?:go to|open|show)\s*voice\s*settings/i, action: 'navigate_voice_settings', description: 'Open voice settings' },
  { pattern: /(?:go to|open|show)\s*api\s*keys/i, action: 'navigate_api_keys', description: 'Open API keys settings' },
  { pattern: /(?:go to|open|show)\s*user\s*management/i, action: 'navigate_user_management', description: 'Open user management' },
  
  // Action Commands - Enrollment
  { pattern: /(?:start|begin|initiate)\s*enrollment/i, action: 'start_enrollment', description: 'Start enrollment process' },
  { pattern: /(?:capture|take|snap)\s*(?:a\s*)?photo/i, action: 'capture_photo', description: 'Capture photo' },
  { pattern: /(?:save|register|enroll)\s*(?:this\s*)?person/i, action: 'save_enrollee', description: 'Save enrollee' },
  { pattern: /cancel\s*enrollment/i, action: 'cancel_enrollment', description: 'Cancel enrollment' },
  
  // Action Commands - Verification
  { pattern: /(?:start|begin|initiate)\s*verification/i, action: 'start_verification', description: 'Start verification' },
  { pattern: /(?:verify|check|match)\s*(?:this\s*)?face/i, action: 'verify_face', description: 'Verify face' },
  { pattern: /stop\s*verification/i, action: 'stop_verification', description: 'Stop verification' },
  
  // Query Commands
  { pattern: /how\s*many\s*enrollees/i, action: 'query_enrollee_count', description: 'Get enrollee count' },
  { pattern: /(?:show|list|display)\s*(?:all\s*)?enrollees/i, action: 'query_enrollees', description: 'List all enrollees' },
  { pattern: /(?:show|display)\s*recent\s*events/i, action: 'query_recent_events', description: 'Show recent events' },
  { pattern: /what(?:'s|\s*is)\s*my\s*role/i, action: 'query_user_role', description: 'Get current user role' },
  { pattern: /(?:who\s*am\s*i|my\s*profile)/i, action: 'query_user_profile', description: 'Get user profile' },
  { pattern: /(?:search|find|look for)\s*(?:for\s*)?(.+)/i, action: 'search_enrollee', description: 'Search for enrollee' },
  
  // Control Commands
  { pattern: /(?:stop|pause|halt)/i, action: 'stop', description: 'Stop current action' },
  { pattern: /(?:cancel|abort)/i, action: 'cancel', description: 'Cancel current action' },
  { pattern: /(?:go\s*back|return|previous)/i, action: 'go_back', description: 'Go back' },
  { pattern: /(?:help|what\s*can\s*you\s*do|commands)/i, action: 'help', description: 'Show available commands' },
  { pattern: /(?:refresh|reload)/i, action: 'refresh', description: 'Refresh current page' },
  
  // System Commands
  { pattern: /(?:log\s*out|sign\s*out|logout)/i, action: 'logout', description: 'Log out' },
  { pattern: /(?:enable|turn\s*on)\s*voice/i, action: 'enable_voice', description: 'Enable voice assistant' },
  { pattern: /(?:disable|turn\s*off|mute)\s*voice/i, action: 'disable_voice', description: 'Disable voice assistant' },
  { pattern: /(?:read|speak)\s*(?:the\s*)?menu/i, action: 'read_menu', description: 'Read navigation menu' },
  
  // Voice Shortcuts (Combined Actions)
  { pattern: /enroll\s+(.+)/i, action: 'shortcut_enroll_person', description: 'Quick enroll person with name' },
  { pattern: /verify\s*now/i, action: 'shortcut_verify_now', description: 'Quick start verification' },
  { pattern: /(?:find|search)\s+(.+)/i, action: 'shortcut_search', description: 'Quick search enrollee' },
  { pattern: /show\s+last\s+(\d+)\s+events/i, action: 'shortcut_show_events', description: 'Show recent events' },
  { pattern: /(?:go\s+to\s+enrollment|open\s+enrollment)\s+and\s+start\s+camera/i, action: 'shortcut_enroll_start', description: 'Open enrollment and start camera' },
  { pattern: /refresh\s+dashboard/i, action: 'shortcut_refresh_dashboard', description: 'Refresh dashboard data' },
];

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
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
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
 * Parse voice input and extract command with fuzzy matching
 */
export function parseVoiceCommand(transcript: string): { action: string; params?: string[]; confidence?: number } | null {
  const normalizedTranscript = transcript.trim();
  
  // First try exact regex matching
  for (const command of VOICE_COMMANDS) {
    const match = normalizedTranscript.match(command.pattern);
    if (match) {
      const params = match.slice(1).filter(Boolean);
      return { action: command.action, params, confidence: 1.0 };
    }
  }
  
  // If no exact match, try fuzzy matching on key phrases
  const lower = normalizedTranscript.toLowerCase();
  const words = lower.split(/\s+/);
  
  // Check for fuzzy matches with common command keywords
  const keywordMatches: { action: string; similarity: number }[] = [];
  
  for (const command of VOICE_COMMANDS) {
    // Extract key words from pattern description
    const keyWords = command.description.toLowerCase().split(/\s+/);
    
    for (const keyWord of keyWords) {
      if (keyWord.length < 4) continue; // Skip short words
      
      for (const word of words) {
        if (word.length < 4) continue;
        
        if (fuzzyMatch(word, keyWord, 0.75)) {
          const distance = levenshteinDistance(word, keyWord);
          const similarity = 1 - (distance / Math.max(word.length, keyWord.length));
          keywordMatches.push({ action: command.action, similarity });
        }
      }
    }
  }
  
  // Return best fuzzy match if found
  if (keywordMatches.length > 0) {
    const best = keywordMatches.sort((a, b) => b.similarity - a.similarity)[0];
    if (best.similarity >= 0.75) {
      return { action: best.action, confidence: best.similarity };
    }
  }
  
  return null;
}

/**
 * Voice Response Generator
 * Creates natural, context-aware voice responses
 */
export class VoiceResponseGenerator {
  private static responses: Record<string, string[]> = {
    // Navigation responses
    navigate_dashboard: [
      "Opening dashboard now.",
      "Taking you to the dashboard.",
      "Here's your dashboard."
    ],
    navigate_enrollment: [
      "Opening enrollment page.",
      "Let's enroll a new person.",
      "Ready to register someone new."
    ],
    navigate_enrollees: [
      "Showing all enrollees.",
      "Here's everyone in the system.",
      "Loading enrollee list."
    ],
    navigate_verification: [
      "Opening verification.",
      "Ready to verify faces.",
      "Let's check who's here."
    ],
    navigate_events: [
      "Showing recent events.",
      "Here's the activity log.",
      "Loading event history."
    ],
    navigate_settings: [
      "Opening settings.",
      "Let's configure the system.",
      "Settings panel ready."
    ],
    
    // Action responses
    start_enrollment: [
      "Starting enrollment. Please look at the camera.",
      "Let's register a new face. Smile!",
      "Enrollment started. Make sure you're in frame."
    ],
    capture_photo: [
      "Photo captured!",
      "Got it! Nice shot.",
      "Perfect! Photo saved."
    ],
    save_enrollee: [
      "Person registered successfully!",
      "Enrollment complete. Welcome aboard!",
      "All set! New person added to the system."
    ],
    start_verification: [
      "Starting verification. Please look at the camera.",
      "Let's see who you are.",
      "Verification in progress..."
    ],
    verify_face: [
      "Checking... One moment please.",
      "Analyzing face...",
      "Running verification..."
    ],
    stop_verification: [
      "Verification stopped.",
      "Stopping camera.",
      "All done."
    ],
    
    // Query responses
    query_enrollee_count: [
      "You have {count} people enrolled.",
      "There are {count} enrollees in the system.",
      "{count} people registered so far."
    ],
    query_user_role: [
      "You are an {role}.",
      "Your role is {role}.",
      "You're logged in as {role}."
    ],
    
    // Control responses
    stop: [
      "Stopped.",
      "Okay, stopping.",
      "Action cancelled."
    ],
    cancel: [
      "Cancelled.",
      "Okay, never mind.",
      "Operation cancelled."
    ],
    go_back: [
      "Going back.",
      "Returning to previous page.",
      "Okay, going back."
    ],
    help: [
      "I can help you navigate, enroll people, verify faces, and more. Try saying 'go to dashboard' or 'start enrollment'.",
      "You can control the entire app with your voice. Say things like 'open enrollment', 'start verification', or 'show enrollees'.",
      "I'm your voice assistant. Ask me to navigate, take actions, or answer questions about the system."
    ],
    
    // Error responses
    error_no_camera: [
      "Sorry, I can't access the camera.",
      "Camera not available right now.",
      "Please check camera permissions."
    ],
    error_not_found: [
      "Sorry, I couldn't find that.",
      "No results found.",
      "I don't see anything matching that."
    ],
    error_permission_denied: [
      "Sorry, you don't have permission for that.",
      "Access denied. You need admin rights.",
      "That action requires higher privileges."
    ],
    
    // Success responses
    success_generic: [
      "Done!",
      "Success!",
      "All set!"
    ],
    
    // Confirmation responses
    confirm_action: [
      "Are you sure?",
      "Should I proceed?",
      "Confirm to continue."
    ]
  };

  static getResponse(action: string, context?: Record<string, any>): string {
    const templates = this.responses[action] || this.responses.success_generic;
    let response = templates[Math.floor(Math.random() * templates.length)];
    
    // Replace placeholders with context values
    if (context) {
      Object.keys(context).forEach(key => {
        response = response.replace(`{${key}}`, String(context[key]));
      });
    }
    
    return response;
  }

  static getErrorResponse(errorType: string): string {
    return this.getResponse(`error_${errorType}`);
  }
}

// Global speaking state tracker
let globalSpeakingCallback: ((isSpeaking: boolean) => void) | null = null;

export function setSpeakingStateCallback(callback: (isSpeaking: boolean) => void) {
  globalSpeakingCallback = callback;
}

/**
 * Text-to-Speech Helper
 * Speaks text using browser TTS
 */
export function speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): void {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate || 1.0;
  utterance.pitch = options?.pitch || 1.0;
  utterance.volume = options?.volume || 1.0;
  utterance.lang = 'en-US';
  
  utterance.onstart = () => {
    if (globalSpeakingCallback) globalSpeakingCallback(true);
  };
  
  utterance.onend = () => {
    if (globalSpeakingCallback) globalSpeakingCallback(false);
  };
  
  utterance.onerror = () => {
    if (globalSpeakingCallback) globalSpeakingCallback(false);
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Get list of available commands for help
 */
export function getAvailableCommands(): string[] {
  return VOICE_COMMANDS.map(cmd => cmd.description);
}

/**
 * Get command suggestions based on current page
 */
export function getContextualCommands(currentPath: string): VoiceCommand[] {
  const pathCommands: Record<string, string[]> = {
    '/dashboard': ['navigate_enrollment', 'navigate_verification', 'query_enrollee_count'],
    '/enrollment': ['start_enrollment', 'capture_photo', 'save_enrollee', 'cancel_enrollment'],
    '/enrollees': ['query_enrollees', 'search_enrollee', 'navigate_enrollment'],
    '/verification': ['start_verification', 'verify_face', 'stop_verification'],
    '/events': ['query_recent_events', 'navigate_dashboard'],
    '/settings': ['navigate_voice_settings', 'navigate_api_keys', 'navigate_user_management'],
  };

  const relevantActions = pathCommands[currentPath] || [];
  return VOICE_COMMANDS.filter(cmd => relevantActions.includes(cmd.action));
}
