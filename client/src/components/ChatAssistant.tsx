import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { MessageCircle, Send, Mic, MicOff, Volume2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";


interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<'en' | 'ja'>('en');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const chatMutation = trpc.chat.message.useMutation({
    onSuccess: (data) => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: String(data.response),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Text-to-speech
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.lang = language === 'ja' ? 'ja-JP' : 'en-US';
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    },
    onError: (error) => {
      toast.error(`Chat error: ${error.message}`);
    },
  });

  const transcribeMutation = trpc.voice.transcribe.useMutation({
    onSuccess: (data) => {
      const transcribedText = data.text;
      setInput(transcribedText);
      
      // Automatically send the transcribed message
      const userMessage: Message = {
        role: 'user',
        content: transcribedText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      
      chatMutation.mutate({
        message: transcribedText,
        language,
      });
    },
    onError: (error) => {
      toast.error(`Transcription error: ${error.message}`);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Check file size (16MB limit)
        if (audioBlob.size > 16 * 1024 * 1024) {
          toast.error('Audio file too large (max 16MB)');
          return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          
          try {
            // Upload to S3 using tRPC
            const uploadResult = await trpc.voice.uploadAudio.mutate({
              audioBase64: base64Audio,
            });
            const audioUrl = uploadResult.url;
            
            // Transcribe
            transcribeMutation.mutate({
              audioUrl,
              language,
            });
          } catch (error) {
            toast.error('Failed to process audio');
          }
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Recording stopped, processing...');
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    chatMutation.mutate({
      message: input,
      language,
      context: {
        currentPage: window.location.pathname,
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">AI Assistant</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={(v: 'en' | 'ja') => setLanguage(v)}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">
                {language === 'ja'
                  ? 'こんにちは！何かお手伝いできることはありますか？'
                  : 'Hello! How can I help you today?'}
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <Streamdown>{msg.content}</Streamdown>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Button
            variant={isRecording ? 'destructive' : 'outline'}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={transcribeMutation.isPending}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          
          {isSpeaking && (
            <Button
              variant="outline"
              size="icon"
              onClick={stopSpeaking}
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          )}
          
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={language === 'ja' ? 'メッセージを入力...' : 'Type a message...'}
            disabled={chatMutation.isPending || isRecording}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending || isRecording}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
