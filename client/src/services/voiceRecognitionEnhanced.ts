/**
 * Enhanced Voice Recognition Service
 * Provides wake word detection and continuous voice listening
 * Standalone implementation without Manus dependencies
 */

// Type definitions for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface VoiceCommand {
  transcript: string;
  confidence: number;
  timestamp: Date;
}

export interface VoiceRecognitionConfig {
  wakeWord: string;
  language: string;
  continuous: boolean;
  interimResults: boolean;
}

export class VoiceRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private isWaitingForWakeWord: boolean = true;
  private config: VoiceRecognitionConfig;
  private onCommandCallback: ((command: VoiceCommand) => void) | null = null;
  private onWakeWordCallback: (() => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  constructor(config?: Partial<VoiceRecognitionConfig>) {
    this.config = {
      wakeWord: config?.wakeWord || 'ayonix',
      language: config?.language || 'en-US',
      continuous: config?.continuous !== undefined ? config.continuous : true,
      interimResults: config?.interimResults !== undefined ? config.interimResults : true,
    };

    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    // Check if browser supports Web Speech API
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    if (!this.recognition) return;
    
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;

    // Handle recognition results
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();
      const confidence = event.results[last][0].confidence;

      console.log('[Voice] Recognized:', transcript, 'Confidence:', confidence);

      // Check for wake word
      if (this.isWaitingForWakeWord) {
        if (transcript.includes(this.config.wakeWord.toLowerCase())) {
          console.log('[Voice] Wake word detected!');
          this.isWaitingForWakeWord = false;
          if (this.onWakeWordCallback) {
            this.onWakeWordCallback();
          }
        }
      } else {
        // Process command
        if (this.onCommandCallback && event.results[last].isFinal) {
          this.onCommandCallback({
            transcript,
            confidence,
            timestamp: new Date(),
          });
        }
      }
    };

    // Handle recognition errors
    this.recognition.onerror = (event: any) => {
      console.error('[Voice] Recognition error:', event.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }

      // Auto-restart on certain errors
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (this.isListening) {
            this.start();
          }
        }, 1000);
      }
    };

    // Handle recognition end
    this.recognition.onend = () => {
      console.log('[Voice] Recognition ended');
      // Auto-restart if continuous mode is enabled
      if (this.isListening && this.config.continuous) {
        setTimeout(() => {
          this.start();
        }, 100);
      }
    };
  }

  /**
   * Start listening for wake word and commands
   */
  start() {
    if (!this.recognition) {
      console.error('[Voice] Speech Recognition not initialized');
      return;
    }

    if (this.isListening) {
      console.warn('[Voice] Already listening');
      return;
    }

    try {
      if (!this.recognition) return;
      this.recognition.start();
      this.isListening = true;
      this.isWaitingForWakeWord = true;
      console.log('[Voice] Started listening for wake word:', this.config.wakeWord);
    } catch (error) {
      console.error('[Voice] Failed to start recognition:', error);
    }
  }

  /**
   * Stop listening
   */
  stop() {
    if (!this.recognition) {
      return;
    }

    try {
      if (!this.recognition) return;
      this.recognition.stop();
      this.isListening = false;
      this.isWaitingForWakeWord = true;
      console.log('[Voice] Stopped listening');
    } catch (error) {
      console.error('[Voice] Failed to stop recognition:', error);
    }
  }

  /**
   * Set callback for when wake word is detected
   */
  onWakeWord(callback: () => void) {
    this.onWakeWordCallback = callback;
  }

  /**
   * Set callback for when a command is recognized
   */
  onCommand(callback: (command: VoiceCommand) => void) {
    this.onCommandCallback = callback;
  }

  /**
   * Set callback for errors
   */
  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  /**
   * Reset wake word detection (start listening for wake word again)
   */
  resetWakeWord() {
    this.isWaitingForWakeWord = true;
    console.log('[Voice] Reset to wake word detection mode');
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Check if waiting for wake word
   */
  getIsWaitingForWakeWord(): boolean {
    return this.isWaitingForWakeWord;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VoiceRecognitionConfig>) {
    this.config = { ...this.config, ...config };
    
    if (this.recognition) {
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
    }
  }
}

/**
 * Text-to-Speech Service
 * Provides voice feedback for hands-free operation
 */
export class TextToSpeechService {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private config: {
    rate: number;
    pitch: number;
    volume: number;
    lang: string;
  };

  constructor() {
    this.synth = window.speechSynthesis;
    this.config = {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      lang: 'en-US',
    };

    // Load voices
    this.loadVoices();
  }

  private loadVoices() {
    if (!this.synth) return;

    const voices = this.synth.getVoices();
    if (voices.length > 0) {
      // Prefer English voice
      this.voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    }

    // Chrome loads voices asynchronously
    this.synth.onvoiceschanged = () => {
      const voices = this.synth!.getVoices();
      this.voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    };
  }

  /**
   * Speak text
   */
  speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }) {
    if (!this.synth) {
      console.error('[TTS] Speech Synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.rate = options?.rate || this.config.rate;
    utterance.pitch = options?.pitch || this.config.pitch;
    utterance.volume = options?.volume || this.config.volume;
    utterance.lang = this.config.lang;

    console.log('[TTS] Speaking:', text);
    this.synth.speak(utterance);
  }

  /**
   * Stop speaking
   */
  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synth ? this.synth.speaking : false;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<typeof this.config>) {
    this.config = { ...this.config, ...config };
  }
}
