/**
 * Global Voice Assistant with Wake Word Detection
 * Provides hands-free operation across the entire application
 */

import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { VoiceRecognitionService, TextToSpeechService } from '@/services/voiceRecognitionEnhanced';
import { getVoiceIdentificationService, type VoiceIdentificationResult } from '@/services/voiceIdentification';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';

export function GlobalVoiceAssistantEnhanced() {
  const [isListening, setIsListening] = useState(false);
  const [isWaitingForWakeWord, setIsWaitingForWakeWord] = useState(true);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState<'en-US' | 'ja-JP'>('en-US');
  const [speakerIdentity, setSpeakerIdentity] = useState<VoiceIdentificationResult | null>(null);
  const [location, setLocation] = useLocation();
  
  const voiceServiceRef = useRef<VoiceRecognitionService | null>(null);
  const ttsServiceRef = useRef<TextToSpeechService | null>(null);
  const voiceIdServiceRef = useRef(getVoiceIdentificationService());

  useEffect(() => {
    // Initialize services
    voiceServiceRef.current = new VoiceRecognitionService({
      wakeWord: 'atlas',
      language: language,
      continuous: true,
      interimResults: true,
    });

    ttsServiceRef.current = new TextToSpeechService(language);

    // Set up callbacks
    voiceServiceRef.current.onWakeWord(() => {
      console.log('[GlobalVoice] Wake word detected!');
      setIsWaitingForWakeWord(false);
      speak('Yes, how can I help you?');
      toast.success('Wake word detected! Listening for command...');
    });

    voiceServiceRef.current.onCommand((command) => {
      console.log('[GlobalVoice] Command received:', command.transcript);
      setLastCommand(command.transcript);
      processVoiceCommand(command.transcript);
      
      // Reset to wake word mode after processing command
      setTimeout(() => {
        voiceServiceRef.current?.resetWakeWord();
        setIsWaitingForWakeWord(true);
      }, 2000);
    });

    voiceServiceRef.current.onError((error) => {
      console.error('[GlobalVoice] Error:', error);
      if (error !== 'no-speech' && error !== 'aborted') {
        toast.error(`Voice recognition error: ${error}`);
      }
    });

    return () => {
      voiceServiceRef.current?.stop();
    };
  }, [language]);

  const speak = (text: string) => {
    setIsSpeaking(true);
    ttsServiceRef.current?.speak(text);
    setTimeout(() => setIsSpeaking(false), text.length * 50); // Estimate speaking duration
  };

  const processVoiceCommand = (transcript: string) => {
    const lower = transcript.toLowerCase().trim();

    // Japanese command translations
    const isJapanese = language === 'ja-JP';
    const responses = {
      dashboard: isJapanese ? 'ダッシュボードを開きます' : 'Opening dashboard',
      enrollment: isJapanese ? '登録ページを開きます' : 'Opening enrollment page',
      verification: isJapanese ? '認証ページを開きます' : 'Opening verification page',
      enrollees: isJapanese ? '登録者リストを開きます' : 'Opening enrollees list',
      events: isJapanese ? 'イベントページを開きます' : 'Opening events page',
      settings: isJapanese ? '設定を開きます' : 'Opening settings',
      startCamera: isJapanese ? 'カメラを起動します' : 'Starting camera for enrollment',
      capture: isJapanese ? '写真を撮影します' : 'Capturing photo',
      startVerification: isJapanese ? '認証を開始します' : 'Starting verification',
      goToEnrollment: isJapanese ? '登録ページに移動してください' : 'Please go to enrollment page first',
      checkDashboard: isJapanese ? 'ダッシュボードで統計を確認してください' : 'Please check the dashboard for statistics',
      help: isJapanese ? 'ダッシュボードへ移動、登録開始、顔認証、登録者表示、設定を開くなどのコマンドが使えます' : 'You can say commands like: go to dashboard, start enrollment, verify face, show enrollees, or open settings',
      unknown: isJapanese ? 'コマンドが理解できませんでした。ヘルプと言ってください' : 'Sorry, I did not understand that command. Say help for available commands',
    };

    // Navigation commands (English and Japanese)
    if (lower.includes('dashboard') || lower.includes('home') || lower.includes('ダッシュボード') || lower.includes('ホーム')) {
      setLocation('/dashboard');
      speak(responses.dashboard);
      return;
    }

    if (lower.includes('enrollment') || lower.includes('enroll') || lower.includes('登録') || lower.includes('とうろく')) {
      setLocation('/enrollment');
      speak(responses.enrollment);
      return;
    }

    if (lower.includes('verification') || lower.includes('verify') || lower.includes('認証') || lower.includes('にんしょう') || lower.includes('確認')) {
      setLocation('/verification');
      speak(responses.verification);
      return;
    }

    if (lower.includes('enrollees') || lower.includes('people') || lower.includes('list') || lower.includes('登録者') || lower.includes('リスト')) {
      setLocation('/enrollees');
      speak(responses.enrollees);
      return;
    }

    if (lower.includes('events') || lower.includes('history') || lower.includes('log') || lower.includes('イベント') || lower.includes('履歴')) {
      setLocation('/events');
      speak(responses.events);
      return;
    }

    if (lower.includes('settings') || lower.includes('configuration') || lower.includes('設定') || lower.includes('せってい')) {
      setLocation('/settings');
      speak(responses.settings);
      return;
    }

    // Action commands (page-specific)
    if (lower.includes('start camera') || lower.includes('begin enrollment') || lower.includes('カメラ') || lower.includes('かめら')) {
      if (location === '/enrollment') {
        speak(responses.startCamera);
        // Trigger enrollment start via localStorage flag
        localStorage.setItem('voice_action', 'start_enrollment');
        window.dispatchEvent(new Event('storage'));
      } else {
        setLocation('/enrollment');
        speak(responses.enrollment);
      }
      return;
    }

    if (lower.includes('capture') || lower.includes('take photo') || lower.includes('撮影') || lower.includes('さつえい')) {
      if (location === '/enrollment') {
        speak(responses.capture);
        localStorage.setItem('voice_action', 'capture_photo');
        window.dispatchEvent(new Event('storage'));
      } else {
        speak(responses.goToEnrollment);
      }
      return;
    }

    if (lower.includes('start verification') || lower.includes('begin verification') || lower.includes('認証開始') || lower.includes('確認開始')) {
      if (location === '/verification') {
        speak(responses.startVerification);
        localStorage.setItem('voice_action', 'start_verification');
        window.dispatchEvent(new Event('storage'));
      } else {
        setLocation('/verification');
        speak(responses.verification);
      }
      return;
    }

    // Query commands
    if (lower.includes('how many') || lower.includes('count') || lower.includes('何人') || lower.includes('統計')) {
      speak(responses.checkDashboard);
      setLocation('/dashboard');
      return;
    }

    if (lower.includes('help') || lower.includes('what can') || lower.includes('ヘルプ') || lower.includes('へるぷ')) {
      speak(responses.help);
      return;
    }

    // Unknown command
    speak(responses.unknown);
    toast.info(isJapanese ? 'コマンドが認識できません。「ヘルプ」と言ってください' : 'Unknown command. Say "help" for available commands.');
  };

  const toggleListening = () => {
    if (isListening) {
      voiceServiceRef.current?.stop();
      setIsListening(false);
      setIsWaitingForWakeWord(true);
      toast.info('Voice assistant stopped');
    } else {
      voiceServiceRef.current?.start();
      setIsListening(true);
      setIsWaitingForWakeWord(true);
      toast.success('Voice assistant started. Say "ATLAS" to activate.');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="p-4 shadow-lg bg-white/95 backdrop-blur-sm">
        <div className="flex flex-col gap-3">
          {/* Speaker Identity */}
          {speakerIdentity && speakerIdentity.isIdentified && (
            <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
              <span className="font-semibold">{speakerIdentity.userName}</span>
              <span className="text-blue-500">({(speakerIdentity.confidence * 100).toFixed(0)}%)</span>
            </div>
          )}

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm">
            {isListening ? (
              isWaitingForWakeWord ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-gray-700">Listening for "ATLAS"...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-gray-700">Ready for command</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-gray-500">Voice assistant off</span>
              </div>
            )}
          </div>

          {/* Last command */}
          {lastCommand && (
            <div className="text-xs text-gray-600 max-w-[200px] truncate">
              Last: "{lastCommand}"
            </div>
          )}

          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Volume2 className="w-3 h-3 animate-pulse" />
              <span>Speaking...</span>
            </div>
          )}

          {/* Control button */}
          <Button
            onClick={toggleListening}
            variant={isListening ? 'default' : 'outline'}
            size="lg"
            className={`w-full ${isListening ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
          >
            {isListening ? (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <MicOff className="w-5 h-5 mr-2" />
                Start Listening
              </>
            )}
          </Button>

          {/* Language switcher */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">Language:</span>
            <div className="flex gap-1">
              <Button
                onClick={() => setLanguage('en-US')}
                variant={language === 'en-US' ? 'default' : 'outline'}
                size="sm"
                className="text-xs px-2 py-1 h-auto"
              >
                EN
              </Button>
              <Button
                onClick={() => setLanguage('ja-JP')}
                variant={language === 'ja-JP' ? 'default' : 'outline'}
                size="sm"
                className="text-xs px-2 py-1 h-auto"
              >
                JP
              </Button>
            </div>
          </div>

          {/* Help text */}
          <div className="text-xs text-gray-500 text-center">
            {language === 'ja-JP' ? '「アトラス」と言ってからコマンドを話してください' : 'Say "ATLAS" then your command'}
          </div>
        </div>
      </Card>
    </div>
  );
}
