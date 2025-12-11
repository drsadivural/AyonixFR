import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { 
  createVoiceRecognition, 
  getSentimentColor, 
  getSentimentEmoji,
  isVoiceRecognitionSupported,
  type VoiceRecognitionResult,
  type VoiceCommand 
} from '@/services/voiceRecognition';

interface VoiceIndicatorProps {
  onCommand?: (command: VoiceCommand, params?: string) => void;
  showHistory?: boolean;
}

export function VoiceIndicator({ onCommand, showHistory = false }: VoiceIndicatorProps) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [lastResult, setLastResult] = useState<VoiceRecognitionResult | null>(null);
  const [history, setHistory] = useState<VoiceRecognitionResult[]>([]);
  const [isSupported] = useState(isVoiceRecognitionSupported());

  useEffect(() => {
    if (!isSupported) return;

    const rec = createVoiceRecognition(
      (result) => {
        setLastResult(result);
        setHistory(prev => [result, ...prev].slice(0, 10)); // Keep last 10
      },
      onCommand
    );

    if (rec) {
      setRecognition(rec);
    }

    return () => {
      if (rec) {
        try {
          rec.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [isSupported, onCommand]);

  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
        <CardContent className="pt-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Voice recognition is not supported in this browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant={isListening ? "default" : "outline"}
                size="icon"
                onClick={toggleListening}
                className={isListening ? "animate-pulse" : ""}
              >
                {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              
              <div>
                <p className="font-semibold">
                  {isListening ? "Listening..." : "Voice Commands"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isListening ? "Say a command" : "Click to start listening"}
                </p>
              </div>
            </div>

            {lastResult && (
              <Badge 
                variant="outline" 
                className={lastResult.sentiment ? getSentimentColor(lastResult.sentiment.label) : ""}
              >
                {lastResult.sentiment && getSentimentEmoji(lastResult.sentiment.label)}
                {lastResult.sentiment?.label || "neutral"}
              </Badge>
            )}
          </div>

          {lastResult && (
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <Volume2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{lastResult.transcript}</p>
                  {lastResult.sentiment && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Sentiment: {lastResult.sentiment.label} ({Math.round(lastResult.sentiment.confidence * 100)}%)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showHistory && history.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-semibold mb-3">Voice History</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {history.map((result, index) => (
                <div key={index} className="p-2 bg-muted rounded text-sm">
                  <p className="font-medium">{result.transcript}</p>
                  {result.sentiment && (
                    <p className="text-xs text-muted-foreground">
                      {getSentimentEmoji(result.sentiment.label)} {result.sentiment.label}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
