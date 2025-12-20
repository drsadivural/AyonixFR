/**
 * Global Voice Assistant with Wake Word Detection
 * Provides hands-free operation across the entire application
 */

import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { VoiceRecognitionService, TextToSpeechService } from '../services/voiceRecognitionEnhanced';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';

export function GlobalVoiceAssistantEnhanced() {
  const [isListening, setIsListening] = useState(false);
  const [isWaitingForWakeWord, setIsWaitingForWakeWord] = useState(true);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [location, setLocation] = useLocation();
  
  const voiceServiceRef = useRef<VoiceRecognitionService | null>(null);
  const ttsServiceRef = useRef<TextToSpeechService | null>(null);

  useEffect(() => {
    // Initialize services
    voiceServiceRef.current = new VoiceRecognitionService({
      wakeWord: 'ayonix',
      language: 'en-US',
      continuous: true,
      interimResults: true,
    });

    ttsServiceRef.current = new TextToSpeechService();

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
  }, []);

  const speak = (text: string) => {
    setIsSpeaking(true);
    ttsServiceRef.current?.speak(text);
    setTimeout(() => setIsSpeaking(false), text.length * 50); // Estimate speaking duration
  };

  const processVoiceCommand = (transcript: string) => {
    const lower = transcript.toLowerCase().trim();

    // Navigation commands
    if (lower.includes('dashboard') || lower.includes('home')) {
      setLocation('/dashboard');
      speak('Opening dashboard');
      return;
    }

    if (lower.includes('enrollment') || lower.includes('enroll')) {
      setLocation('/enrollment');
      speak('Opening enrollment page');
      return;
    }

    if (lower.includes('verification') || lower.includes('verify')) {
      setLocation('/verification');
      speak('Opening verification page');
      return;
    }

    if (lower.includes('enrollees') || lower.includes('people') || lower.includes('list')) {
      setLocation('/enrollees');
      speak('Opening enrollees list');
      return;
    }

    if (lower.includes('events') || lower.includes('history') || lower.includes('log')) {
      setLocation('/events');
      speak('Opening events page');
      return;
    }

    if (lower.includes('settings') || lower.includes('configuration')) {
      setLocation('/settings');
      speak('Opening settings');
      return;
    }

    // Action commands (page-specific)
    if (lower.includes('start camera') || lower.includes('begin enrollment')) {
      if (location === '/enrollment') {
        speak('Starting camera for enrollment');
        // Trigger enrollment start via localStorage flag
        localStorage.setItem('voice_action', 'start_enrollment');
        window.dispatchEvent(new Event('storage'));
      } else {
        setLocation('/enrollment');
        speak('Opening enrollment page');
      }
      return;
    }

    if (lower.includes('capture') || lower.includes('take photo')) {
      if (location === '/enrollment') {
        speak('Capturing photo');
        localStorage.setItem('voice_action', 'capture_photo');
        window.dispatchEvent(new Event('storage'));
      } else {
        speak('Please go to enrollment page first');
      }
      return;
    }

    if (lower.includes('start verification') || lower.includes('begin verification')) {
      if (location === '/verification') {
        speak('Starting verification');
        localStorage.setItem('voice_action', 'start_verification');
        window.dispatchEvent(new Event('storage'));
      } else {
        setLocation('/verification');
        speak('Opening verification page');
      }
      return;
    }

    // Query commands
    if (lower.includes('how many') || lower.includes('count')) {
      speak('Please check the dashboard for statistics');
      setLocation('/dashboard');
      return;
    }

    if (lower.includes('help') || lower.includes('what can')) {
      speak('You can say commands like: go to dashboard, start enrollment, verify face, show enrollees, or open settings');
      return;
    }

    // Unknown command
    speak('Sorry, I did not understand that command. Say help for available commands.');
    toast.info('Unknown command. Say "help" for available commands.');
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
      toast.success('Voice assistant started. Say "Ayonix" to activate.');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="p-4 shadow-lg bg-white/95 backdrop-blur-sm">
        <div className="flex flex-col gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm">
            {isListening ? (
              isWaitingForWakeWord ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-gray-700">Listening for "Ayonix"...</span>
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

          {/* Help text */}
          <div className="text-xs text-gray-500 text-center">
            Say "Ayonix" then your command
          </div>
        </div>
      </Card>
    </div>
  );
}
