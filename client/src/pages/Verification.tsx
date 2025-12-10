import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Camera, CheckCircle2, XCircle, User } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Verification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [cameraSource, setCameraSource] = useState('webcam');
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [landmarks, setLandmarks] = useState<Array<{x: number, y: number, z: number}> | null>(null);
  const [voiceComments, setVoiceComments] = useState<Array<{ text: string; timestamp: Date; personName: string }>>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [landmarksImageData, setLandmarksImageData] = useState<string | null>(null);

  const { data: settings } = trpc.settings.get.useQuery();

  const verifyMutation = trpc.verification.verify.useMutation({
    onSuccess: (data) => {
      setMatchResults(data.matches);
      if (data.matches.length > 0) {
        const match = data.matches[0];
        toast.success(`Match found: ${match?.name} ${match?.surname}`);
        
        // Play voice comment if available
        if (match.voiceComment) {
          // Add to chat history
          setVoiceComments(prev => [
            { text: match.voiceComment, timestamp: new Date(), personName: `${match.name} ${match.surname}` },
            ...prev
          ]);
          
          // Play audio
          if (match.audioUrl && audioRef.current) {
            // Use server-generated audio
            audioRef.current.src = match.audioUrl;
            audioRef.current.play().catch(err => console.error('Audio playback failed:', err));
          } else if (match.useBrowserTTS && 'speechSynthesis' in window) {
            // Fallback to browser TTS
            const utterance = new SpeechSynthesisUtterance(match.voiceComment);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
          }
        }
      } else if (data.detectedFaces > 0) {
        toast.error('No match found in database');
      } else {
        toast.error('No face detected');
      }
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    },
  });

  const { data: landmarksData } = trpc.verification.getLandmarks.useQuery(
    { imageBase64: landmarksImageData || '' },
    { enabled: !!landmarksImageData }
  );

  useEffect(() => {
    if (landmarksData && Array.isArray(landmarksData) && landmarksData.length > 0) {
      // Get landmarks for all detected faces
      const allLandmarks = landmarksData.flatMap((face: any) => face.landmarks);
      if (allLandmarks.length > 0) {
        setLandmarks(allLandmarks);
      }
    }
  }, [landmarksData]);

  const startVerification = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setMatchResults([]);
        
        // Wait for video to load metadata, then play
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setIsVerifying(true);
              detectLandmarksLoop();
            }).catch(err => {
              console.error('Error playing video:', err);
              toast.error('Failed to start video stream');
            });
          }
        };
      }
    } catch (error) {
      toast.error('Failed to access camera');
      console.error('Camera error:', error);
    }
  };

  const detectLandmarksLoop = () => {
    if (!videoRef.current || !overlayCanvasRef.current || !isVerifying) {
      return;
    }

    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = overlayCanvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(detectLandmarksLoop);
      return;
    }

    // Set overlay canvas size to match video
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Draw landmarks if available
    if (landmarks && landmarks.length > 0) {
      ctx.fillStyle = '#3b82f6';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;

      // Draw all landmark points
      landmarks.forEach((landmark) => {
        const x = landmark.x;
        const y = landmark.y;
        
        // Draw point
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw face mesh connections (simplified - key facial features)
      const drawConnection = (idx1: number, idx2: number) => {
        if (landmarks[idx1] && landmarks[idx2]) {
          ctx.beginPath();
          ctx.moveTo(landmarks[idx1].x, landmarks[idx1].y);
          ctx.lineTo(landmarks[idx2].x, landmarks[idx2].y);
          ctx.stroke();
        }
      };

      // Draw face oval
      const faceOval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
      for (let i = 0; i < faceOval.length - 1; i++) {
        drawConnection(faceOval[i]!, faceOval[i + 1]!);
      }

      // Draw left eye
      const leftEye = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
      for (let i = 0; i < leftEye.length - 1; i++) {
        drawConnection(leftEye[i]!, leftEye[i + 1]!);
      }

      // Draw right eye
      const rightEye = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
      for (let i = 0; i < rightEye.length - 1; i++) {
        drawConnection(rightEye[i]!, rightEye[i + 1]!);
      }

      // Draw lips
      const lips = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
      for (let i = 0; i < lips.length - 1; i++) {
        drawConnection(lips[i]!, lips[i + 1]!);
      }

      // Draw nose
      drawConnection(1, 2);
      drawConnection(2, 98);
      drawConnection(98, 327);
    }

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(detectLandmarksLoop);
  };

  const stopVerification = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsVerifying(false);
    setLandmarks(null);
    setLandmarksImageData(null);
  };

  const captureAndVerify = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        
        // Get landmarks for visualization
        setLandmarksImageData(imageData);
        
        // Face embeddings will be extracted by Python service on the backend
        verifyMutation.mutate({
          imageBase64: imageData,
          cameraSource,
          threshold: settings?.matchThreshold ? settings.matchThreshold / 100 : 0.75,
        });
      }
    }
  };

  useEffect(() => {
    return () => {
      stopVerification();
    };
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Face Verification</h1>
        <p className="text-muted-foreground">Real-time face matching against enrolled database</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Camera Feed</CardTitle>
            <CardDescription>
              <div className="flex items-center gap-4 mt-2">
                <span>Camera Source:</span>
                <Select value={cameraSource} onValueChange={setCameraSource}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webcam">Webcam</SelectItem>
                    <SelectItem value="external">External Camera</SelectItem>
                    <SelectItem value="mobile">Mobile Device</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {!isVerifying && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <Button onClick={startVerification} size="lg">
                    <Camera className="mr-2 h-5 w-5" />
                    Start Verification
                  </Button>
                </div>
              )}
              
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${!isVerifying ? 'hidden' : ''}`}
              />
              <canvas
                ref={overlayCanvasRef}
                className={`absolute top-0 left-0 w-full h-full pointer-events-none ${!isVerifying ? 'hidden' : ''}`}
                style={{ mixBlendMode: 'screen' }}
              />
              
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {isVerifying && (
              <div className="flex gap-2">
                <Button onClick={captureAndVerify} className="flex-1" disabled={verifyMutation.isPending}>
                  {verifyMutation.isPending ? 'Verifying...' : 'Capture & Verify'}
                </Button>
                <Button onClick={stopVerification} variant="outline">
                  Stop
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Match Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Match Results</CardTitle>
            <CardDescription>Detected faces and matches</CardDescription>
          </CardHeader>
          <CardContent>
            {matchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No matches yet</p>
                <p className="text-sm">Start verification to see results</p>
              </div>
            ) : (
              <div className="space-y-4">
                {matchResults.map((match, index) => (
                  <Card key={index} className="border-2 border-green-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <CardTitle className="text-lg">Match Found</CardTitle>
                        </div>
                        <Badge variant="default" className="bg-green-500">
                          {match.confidence}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{match.name} {match.surname}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Enrollee ID</p>
                        <p className="font-mono text-sm">{match.enrolleeId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${match.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{match.confidence}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Voice Comments Chat Panel */}
      {voiceComments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎙️ Voice Assistant Comments</CardTitle>
            <CardDescription>AI-generated personality-driven responses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {voiceComments.map((comment, index) => (
                <div key={index} className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                        {comment.personName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{comment.personName}</p>
                        <p className="text-xs text-muted-foreground">
                          {comment.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed italic">"{comment.text}"</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Info */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Match Threshold</p>
              <p className="text-2xl font-bold">{settings?.matchThreshold || 75}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Min Face Size</p>
              <p className="text-2xl font-bold">{settings?.minFaceSize || 80}px</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Multi-Face Match</p>
              <p className="text-2xl font-bold">{settings?.multiFaceMatch ? 'ON' : 'OFF'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Hidden audio element for voice playback */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
