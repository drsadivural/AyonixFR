import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, transcript: string) => void;
}

export default function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        
        // For now, use a placeholder transcript
        // In production, this would call a speech-to-text API
        const transcript = "Voice sample recorded successfully";
        onRecordingComplete(blob, transcript);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    onRecordingComplete(null as any, '');
    toast.success('Recording deleted');
  };

  return (
    <div className="flex items-center gap-2">
      {!audioBlob ? (
        <>
          {!isRecording ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startRecording}
              className="flex-1"
            >
              <Mic className="h-4 w-4 mr-2" />
              Record Voice Sample
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={stopRecording}
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Recording
            </Button>
          )}
        </>
      ) : (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={playRecording}
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            Play
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={deleteRecording}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
