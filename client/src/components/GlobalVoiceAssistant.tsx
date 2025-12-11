import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, HelpCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { 
  parseVoiceCommand, 
  VoiceResponseGenerator, 
  speak, 
  getContextualCommands,
  getAvailableCommands,
  setSpeakingStateCallback
} from '@/services/voiceAssistant';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

interface GlobalVoiceAssistantProps {
  onCommand?: (action: string, params?: string[]) => void;
}

export function GlobalVoiceAssistant({ onCommand }: GlobalVoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [lastTranscript, setLastTranscript] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  
  const { data: enrollees } = trpc.enrollees.list.useQuery();
  const enrolleeCount = enrollees?.length ?? 0;

  useEffect(() => {
    // Set up speaking state callback
    setSpeakingStateCallback(setIsSpeaking);
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice recognition not supported in this browser');
      setIsEnabled(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      setLastTranscript(transcript);
      
      // Interrupt ongoing speech if user speaks
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      
      handleVoiceCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Silently restart
        if (isListening) {
          setTimeout(() => recognition.start(), 100);
        }
      } else {
        toast.error(`Voice error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isListening && isEnabled) {
        // Auto-restart if still enabled
        setTimeout(() => recognition.start(), 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening, isEnabled]);

  const handleVoiceCommand = (transcript: string) => {
    const command = parseVoiceCommand(transcript);
    
    if (!command) {
      speak("Sorry, I didn't understand that command.");
      return;
    }

    const { action, params } = command;
    
    // Handle navigation commands
    if (action.startsWith('navigate_')) {
      const page = action.replace('navigate_', '');
      const routes: Record<string, string> = {
        dashboard: '/',
        enrollment: '/enrollment',
        enrollees: '/enrollees',
        verification: '/verification',
        events: '/events',
        settings: '/settings',
        voice_settings: '/voice-settings',
        api_keys: '/api-keys',
        user_management: '/user-management',
      };
      
      const route = routes[page];
      if (route) {
        const response = VoiceResponseGenerator.getResponse(action);
        speak(response);
        navigate(route);
        return;
      }
    }

    // Handle query commands
    if (action === 'query_enrollee_count') {
      const count = enrolleeCount || 0;
      const response = VoiceResponseGenerator.getResponse(action, { count });
      speak(response);
      return;
    }

    if (action === 'query_user_role') {
      const role = user?.role || 'user';
      const response = VoiceResponseGenerator.getResponse(action, { role });
      speak(response);
      return;
    }

    if (action === 'query_user_profile') {
      const name = user?.name || 'there';
      speak(`Hi ${name}! You're logged in as ${user?.email}.`);
      return;
    }

    // Handle control commands
    if (action === 'help') {
      const response = VoiceResponseGenerator.getResponse(action);
      speak(response);
      setShowCommands(true);
      return;
    }

    if (action === 'go_back') {
      const response = VoiceResponseGenerator.getResponse(action);
      speak(response);
      window.history.back();
      return;
    }

    if (action === 'refresh') {
      speak("Refreshing page.");
      window.location.reload();
      return;
    }

    if (action === 'logout') {
      speak("Logging you out. Goodbye!");
      // Trigger logout via auth context
      window.location.href = '/login';
      return;
    }

    if (action === 'read_menu') {
      speak("Navigation menu: Dashboard, Enrollment, Enrollees, Verification, Events, Settings, Voice Settings, API Keys, and User Management.");
      return;
    }

    if (action === 'enable_voice') {
      setIsEnabled(true);
      speak("Voice assistant enabled.");
      return;
    }

    if (action === 'disable_voice') {
      speak("Voice assistant disabled.");
      setIsEnabled(false);
      return;
    }

    // Handle voice shortcuts
    if (action === 'shortcut_enroll_person') {
      const name = params?.[0] || '';
      speak(`Opening enrollment for ${name}. Please fill in the details.`);
      navigate('/enrollment');
      // Store name in localStorage for enrollment page to pick up
      if (name) {
        localStorage.setItem('voiceEnrollName', name);
      }
      return;
    }

    if (action === 'shortcut_verify_now') {
      speak("Starting verification now.");
      navigate('/verification');
      // Trigger auto-start via localStorage flag
      localStorage.setItem('voiceAutoStartVerification', 'true');
      return;
    }

    if (action === 'shortcut_search') {
      const query = params?.[0] || '';
      speak(`Searching for ${query}.`);
      navigate('/enrollees');
      // Store search query for enrollees page
      if (query) {
        localStorage.setItem('voiceSearchQuery', query);
      }
      return;
    }

    if (action === 'shortcut_show_events') {
      const count = params?.[0] || '10';
      speak(`Showing last ${count} events.`);
      navigate('/events');
      return;
    }

    if (action === 'shortcut_enroll_start') {
      speak("Opening enrollment and starting camera.");
      navigate('/enrollment');
      localStorage.setItem('voiceAutoStartCamera', 'true');
      return;
    }

    if (action === 'shortcut_refresh_dashboard') {
      speak("Refreshing dashboard.");
      navigate('/');
      window.location.reload();
      return;
    }

    // Forward other commands to parent
    if (onCommand) {
      onCommand(action, params);
    }

    // Provide generic response
    const response = VoiceResponseGenerator.getResponse(action);
    speak(response);
  };

  const toggleListening = () => {
    if (!recognitionRef.current || !isEnabled) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      speak("Voice assistant paused.");
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      speak("Voice assistant activated. I'm listening.");
    }
  };

  const contextualCommands = getContextualCommands(location);

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      {/* Floating Voice Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
        {lastTranscript && (
          <Card className="max-w-xs animate-in slide-in-from-bottom-2">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Volume2 className="h-4 w-4 mt-0.5 text-blue-500" />
                <p className="text-sm">{lastTranscript}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowCommands(!showCommands)}
            className="h-12 w-12 rounded-full shadow-lg"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>

          <Button
            variant={isListening ? "default" : "outline"}
            size="icon"
            onClick={toggleListening}
            className={`h-14 w-14 rounded-full shadow-lg ${isListening ? 'animate-pulse bg-blue-500 hover:bg-blue-600' : ''}`}
          >
            {isListening ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Commands Panel */}
      {showCommands && (
        <div className="fixed bottom-24 right-6 z-50 w-96 animate-in slide-in-from-bottom-2">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">Voice Commands</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCommands(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Suggested for this page:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {contextualCommands.slice(0, 5).map((cmd, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {cmd.description}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Examples:
                  </p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• "Go to dashboard"</li>
                    <li>• "Start enrollment"</li>
                    <li>• "How many enrollees?"</li>
                    <li>• "Show recent events"</li>
                    <li>• "What's my role?"</li>
                    <li>• "Help"</li>
                  </ul>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    speak("Here are all available commands: " + getAvailableCommands().slice(0, 10).join(', '));
                  }}
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Read All Commands
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
