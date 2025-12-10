/**
 * Multi-language Voice Support
 * Supports Japanese and English voice recognition and responses
 */

export type SupportedLanguage = 'en' | 'ja';

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  voiceLang: string;
  ttsVoice?: string;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    voiceLang: 'en-US',
    ttsVoice: 'en-US',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    voiceLang: 'ja-JP',
    ttsVoice: 'ja-JP',
  },
};

/**
 * Voice command translations
 */
export const VOICE_COMMANDS_I18N: Record<SupportedLanguage, Record<string, RegExp>> = {
  en: {
    navigate_dashboard: /(?:go to|open|show|navigate to)\s*(?:the\s*)?dashboard/i,
    navigate_enrollment: /(?:go to|open|show)\s*(?:the\s*)?enrollment/i,
    navigate_enrollees: /(?:go to|open|show)\s*(?:the\s*)?enrollees/i,
    navigate_verification: /(?:go to|open|show)\s*(?:the\s*)?verification/i,
    navigate_events: /(?:go to|open|show)\s*(?:the\s*)?events/i,
    navigate_settings: /(?:go to|open|show)\s*settings/i,
    start_enrollment: /(?:start|begin|initiate)\s*enrollment/i,
    start_verification: /(?:start|begin|initiate)\s*verification/i,
    capture_photo: /(?:capture|take|snap)\s*(?:a\s*)?photo/i,
    query_enrollee_count: /how\s*many\s*enrollees/i,
    help: /(?:help|what\s*can\s*you\s*do|commands)/i,
    stop: /(?:stop|pause|halt)/i,
    go_back: /(?:go\s*back|return|previous)/i,
  },
  ja: {
    navigate_dashboard: /(?:ダッシュボード|だっしゅぼーど)(?:を)?(?:開いて|ひらいて|表示|ひょうじ)/i,
    navigate_enrollment: /(?:登録|とうろく|エンロールメント|えんろーるめんと)(?:を)?(?:開いて|ひらいて|表示|ひょうじ)/i,
    navigate_enrollees: /(?:登録者|とうろくしゃ|エンローリー|えんろーりー)(?:を)?(?:開いて|ひらいて|表示|ひょうじ)/i,
    navigate_verification: /(?:認証|にんしょう|検証|けんしょう|ベリフィケーション|べりふぃけーしょん)(?:を)?(?:開いて|ひらいて|表示|ひょうじ)/i,
    navigate_events: /(?:イベント|いべんと|履歴|りれき)(?:を)?(?:開いて|ひらいて|表示|ひょうじ)/i,
    navigate_settings: /(?:設定|せってい|セッティング|せってぃんぐ)(?:を)?(?:開いて|ひらいて|表示|ひょうじ)/i,
    start_enrollment: /(?:登録|とうろく)(?:を)?(?:開始|かいし|始めて|はじめて)/i,
    start_verification: /(?:認証|にんしょう|検証|けんしょう)(?:を)?(?:開始|かいし|始めて|はじめて)/i,
    capture_photo: /(?:写真|しゃしん|フォト|ふぉと)(?:を)?(?:撮って|とって|キャプチャ|きゃぷちゃ)/i,
    query_enrollee_count: /(?:登録者|とうろくしゃ)(?:は)?(?:何人|なんにん|いくつ)/i,
    help: /(?:ヘルプ|へるぷ|助けて|たすけて|使い方|つかいかた)/i,
    stop: /(?:止めて|とめて|ストップ|すとっぷ|停止|ていし)/i,
    go_back: /(?:戻って|もどって|前|まえ|バック|ばっく)/i,
  },
};

/**
 * Voice response translations
 */
export const VOICE_RESPONSES_I18N: Record<SupportedLanguage, Record<string, string[]>> = {
  en: {
    navigate_dashboard: ['Opening dashboard now.', 'Taking you to the dashboard.', 'Here\'s your dashboard.'],
    navigate_enrollment: ['Opening enrollment page.', 'Let\'s enroll a new person.', 'Ready to register someone new.'],
    navigate_enrollees: ['Showing all enrollees.', 'Here\'s everyone in the system.', 'Loading enrollee list.'],
    navigate_verification: ['Opening verification.', 'Ready to verify faces.', 'Let\'s check who\'s here.'],
    navigate_events: ['Showing recent events.', 'Here\'s the activity log.', 'Loading event history.'],
    navigate_settings: ['Opening settings.', 'Let\'s configure the system.', 'Settings panel ready.'],
    start_enrollment: ['Starting enrollment. Please look at the camera.', 'Let\'s register a new face. Smile!', 'Enrollment started. Make sure you\'re in frame.'],
    start_verification: ['Starting verification. Please look at the camera.', 'Let\'s see who you are.', 'Verification in progress...'],
    capture_photo: ['Photo captured!', 'Got it! Nice shot.', 'Perfect! Photo saved.'],
    query_enrollee_count: ['You have {count} people enrolled.', 'There are {count} enrollees in the system.', '{count} people registered so far.'],
    help: ['I can help you navigate, enroll people, verify faces, and more. Try saying "go to dashboard" or "start enrollment".'],
    stop: ['Stopped.', 'Okay, stopping.', 'Action cancelled.'],
    go_back: ['Going back.', 'Returning to previous page.', 'Okay, going back.'],
    welcome: ['Welcome! I\'m your voice assistant. Say "help" to see what I can do.'],
  },
  ja: {
    navigate_dashboard: ['ダッシュボードを開きます。', 'ダッシュボードに移動します。', 'ダッシュボードです。'],
    navigate_enrollment: ['登録ページを開きます。', '新しい人を登録しましょう。', '登録の準備ができました。'],
    navigate_enrollees: ['登録者一覧を表示します。', 'システム内の全員を表示します。', '登録者リストを読み込んでいます。'],
    navigate_verification: ['認証を開きます。', '顔認証の準備ができました。', '誰がいるか確認しましょう。'],
    navigate_events: ['最近のイベントを表示します。', 'アクティビティログです。', 'イベント履歴を読み込んでいます。'],
    navigate_settings: ['設定を開きます。', 'システムを設定しましょう。', '設定パネルの準備ができました。'],
    start_enrollment: ['登録を開始します。カメラを見てください。', '新しい顔を登録しましょう。笑顔でお願いします！', '登録を開始しました。フレーム内にいることを確認してください。'],
    start_verification: ['認証を開始します。カメラを見てください。', 'あなたが誰か確認しましょう。', '認証中です...'],
    capture_photo: ['写真を撮影しました！', 'できました！いい写真です。', '完璧！写真を保存しました。'],
    query_enrollee_count: ['{count}人が登録されています。', 'システムに{count}人の登録者がいます。', 'これまでに{count}人が登録されています。'],
    help: ['ナビゲーション、人の登録、顔認証などをお手伝いできます。「ダッシュボードを開いて」や「登録を開始」と言ってみてください。'],
    stop: ['停止しました。', 'わかりました、停止します。', 'アクションをキャンセルしました。'],
    go_back: ['戻ります。', '前のページに戻ります。', 'わかりました、戻ります。'],
    welcome: ['ようこそ！私はあなたの音声アシスタントです。「ヘルプ」と言うと、できることがわかります。'],
  },
};

/**
 * Parse voice command in specified language
 */
export function parseVoiceCommandI18N(transcript: string, language: SupportedLanguage): { action: string; params?: string[] } | null {
  const commands = VOICE_COMMANDS_I18N[language];
  
  for (const [action, pattern] of Object.entries(commands)) {
    const match = transcript.match(pattern);
    if (match) {
      const params = match.slice(1).filter(Boolean);
      return { action, params };
    }
  }
  
  return null;
}

/**
 * Get voice response in specified language
 */
export function getVoiceResponseI18N(action: string, language: SupportedLanguage, context?: Record<string, any>): string {
  const responses = VOICE_RESPONSES_I18N[language];
  const templates = responses[action] || responses['welcome'];
  
  if (!templates || templates.length === 0) {
    return language === 'ja' ? 'わかりました。' : 'Okay.';
  }
  
  let response = templates[Math.floor(Math.random() * templates.length)];
  
  // Replace placeholders with context values
  if (context) {
    Object.keys(context).forEach(key => {
      response = response.replace(`{${key}}`, String(context[key]));
    });
  }
  
  return response;
}

/**
 * Speak text in specified language
 */
export function speakI18N(text: string, language: SupportedLanguage, options?: { rate?: number; pitch?: number; volume?: number }): void {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SUPPORTED_LANGUAGES[language].voiceLang;
  utterance.rate = options?.rate || 1.0;
  utterance.pitch = options?.pitch || 1.0;
  utterance.volume = options?.volume || 1.0;

  // Try to find a native voice for the language
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(v => v.lang.startsWith(language));
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Get/Set user's preferred language
 */
export function getUserLanguage(): SupportedLanguage {
  const stored = localStorage.getItem('voiceLanguage');
  if (stored && (stored === 'en' || stored === 'ja')) {
    return stored;
  }
  
  // Default to English
  return 'en';
}

export function setUserLanguage(language: SupportedLanguage): void {
  localStorage.setItem('voiceLanguage', language);
}
