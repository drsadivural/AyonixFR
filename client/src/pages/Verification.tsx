import { useState, useRef, useEffect, useCallback } from 'react';
import { FaceDetection } from '@mediapipe/face_detection';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Camera, CheckCircle2, XCircle, User, Calendar, MapPin, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { EmotionBadge } from '@/components/EmotionBadge';
import { VoiceIndicator } from '@/components/VoiceIndicator';
import { loadEmotionModels, detectEmotion, type EmotionResult } from '@/services/emotionDetection';
import type { VoiceCommand } from '@/services/voiceRecognition';

export default function Verification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [cameraSource, setCameraSource] = useState('webcam');
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [multiCameraMode, setMultiCameraMode] = useState(false);
  const [landmarks, setLandmarks] = useState<Array<{x: number, y: number, z: number}> | null>(null);
  const [voiceComments, setVoiceComments] = useState<Array<{ text: string; timestamp: Date; personName: string }>>([]);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionResult | null>(null);
  const [emotionDetectionActive, setEmotionDetectionActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const emotionIntervalRef = useRef<number | null>(null);
  const landmarkFetchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const faceDetectionRef = useRef<FaceDetection | null>(null);
  const mediaPipeCameraRef = useRef<MediaPipeCamera | null>(null);
  const detectedFaceBoundsRef = useRef<{xCenter: number, yCenter: number, width: number, height: number} | null>(null);
  const [landmarksImageData, setLandmarksImageData] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  const { data: settings } = trpc.settings.get.useQuery();

  // Load emotion detection models on mount
  useEffect(() => {
    loadEmotionModels().catch(err => {
      console.error('Failed to load emotion models:', err);
      toast.error('Emotion detection unavailable');
    });
  }, []);

  const verifyMutation = trpc.verification.verify.useMutation({
    onSuccess: (data) => {
      setMatchResults(data.matches);
      if (data.matches.length > 0) {
        const match = data.matches[0];
        toast.success(`Match found: ${match?.name} ${match?.surname}`);
        
        // Play voice comment if available
        if ((match as any).voiceComment) {
          // Add to chat history
          setVoiceComments(prev => [
            { text: (match as any).voiceComment, timestamp: new Date(), personName: `${match.name} ${match.surname}` },
            ...prev
          ]);
          
          // Play audio
          if ((match as any).audioUrl && audioRef.current) {
            // Use server-generated audio
            audioRef.current.src = (match as any).audioUrl;
            audioRef.current.play().catch(err => console.error('Audio playback failed:', err));
          } else if ((match as any).useBrowserTTS && 'speechSynthesis' in window) {
            // Fallback to browser TTS
            const utterance = new SpeechSynthesisUtterance((match as any).voiceComment);
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

  const getLandmarksMutation = trpc.verification.getLandmarks.useMutation();

  const fetchLandmarksFromVideo = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    console.log('[Verification] Fetching landmarks, video dimensions:', video.videoWidth, 'x', video.videoHeight);
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    // Capture current frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    try {
      // Fetch landmarks from backend using tRPC mutation
      const result = await getLandmarksMutation.mutateAsync({ imageBase64: imageData });
      
      console.log('[Verification] Landmark result:', result);
      
      if (result.landmarks && result.landmarks.length > 0) {
        // For verification, show landmarks from first detected face
        const firstFace = result.landmarks[0];
        console.log('[Verification] Setting', firstFace.landmarks.length, 'landmarks');
        setLandmarks(firstFace.landmarks);
        setConfidence(Math.round((firstFace.confidence || 0) * 100));
      } else {
        console.log('[Verification] No faces detected');
        setLandmarks(null);
        setConfidence(0);
      }
    } catch (error) {
      console.error('Failed to fetch landmarks:', error);
      setLandmarks(null);
      setConfidence(0);
    }
  };

  const startVerification = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: cameraSource && cameraSource !== 'default' ? {
          deviceId: { exact: cameraSource },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setMatchResults([]);
        
        // Wait for video to load metadata, then play
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              // Initialize MediaPipe Face Detection
              if (!faceDetectionRef.current) {
                faceDetectionRef.current = new FaceDetection({
                  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
                });
                faceDetectionRef.current.setOptions({
                  model: 'short',
                  minDetectionConfidence: 0.5
                });
                faceDetectionRef.current.onResults((results) => {
                  if (results.detections && results.detections.length > 0) {
                    const detection = results.detections[0];
                    const box = detection.boundingBox;
                    detectedFaceBoundsRef.current = {
                      xCenter: box.xCenter,
                      yCenter: box.yCenter,
                      width: box.width,
                      height: box.height
                    };
                  } else {
                    detectedFaceBoundsRef.current = null;
                  }
                });
              }
              
              // Start MediaPipe camera
              if (videoRef.current && faceDetectionRef.current) {
                mediaPipeCameraRef.current = new MediaPipeCamera(videoRef.current, {
                  onFrame: async () => {
                    if (videoRef.current && faceDetectionRef.current) {
                      await faceDetectionRef.current.send({ image: videoRef.current });
                    }
                  },
                  width: 1280,
                  height: 720
                });
                mediaPipeCameraRef.current.start();
              }
              
              // Start emotion detection
              setEmotionDetectionActive(true);
              startEmotionDetection();
              setIsVerifying(true);
              detectLandmarksLoop();
              
              // Start fetching landmarks every 100ms
              landmarkFetchIntervalRef.current = setInterval(() => {
                fetchLandmarksFromVideo();
              }, 100);
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

  const detectLandmarksLoop = useCallback(() => {
    if (!videoRef.current || !overlayCanvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = overlayCanvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(detectLandmarksLoop);
      return;
    }

    // Get display size and video size
    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Set canvas to match display size
    overlayCanvas.width = displayWidth;
    overlayCanvas.height = displayHeight;

    // Calculate letterbox offset for object-contain
    const videoAspect = videoWidth / videoHeight;
    const displayAspect = displayWidth / displayHeight;
    
    let scale, offsetX, offsetY;
    if (displayAspect > videoAspect) {
      // Letterbox on sides
      scale = displayHeight / videoHeight;
      offsetX = (displayWidth - videoWidth * scale) / 2;
      offsetY = 0;
    } else {
      // Letterbox on top/bottom
      scale = displayWidth / videoWidth;
      offsetX = 0;
      offsetY = (displayHeight - videoHeight * scale) / 2;
    }

    // Clear previous drawings
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw face rectangle from MediaPipe detection
    const faceBounds = detectedFaceBoundsRef.current;
    if (faceBounds) {
      // MediaPipe returns normalized coordinates (0-1)
      const x = faceBounds.xCenter * videoWidth;
      const y = faceBounds.yCenter * videoHeight;
      const w = faceBounds.width * videoWidth;
      const h = faceBounds.height * videoHeight;
      
      // Apply scale and offset
      const displayX = (x - w/2) * scale + offsetX;
      const displayY = (y - h/2) * scale + offsetY;
      const displayW = w * scale;
      const displayH = h * scale;
      
      // Draw bounding box
      ctx.strokeStyle = '#10b981'; // Green
      ctx.lineWidth = 3;
      ctx.strokeRect(displayX, displayY, displayW, displayH);
    }

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(detectLandmarksLoop);
  }, []);

  const startEmotionDetection = () => {
    if (emotionIntervalRef.current) {
      clearInterval(emotionIntervalRef.current);
    }
    
    emotionIntervalRef.current = window.setInterval(async () => {
      if (videoRef.current && emotionDetectionActive) {
        const emotion = await detectEmotion(videoRef.current);
        if (emotion) {
          setCurrentEmotion(emotion);
        }
      }
    }, 500); // Detect every 500ms
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
    if (landmarkFetchIntervalRef.current) {
      clearInterval(landmarkFetchIntervalRef.current);
      landmarkFetchIntervalRef.current = null;
    }
    setIsVerifying(false);
    setLandmarks(null);
    setLandmarksImageData(null);
    setEmotionDetectionActive(false);
    setCurrentEmotion(null);
    
    if (emotionIntervalRef.current) {
      clearInterval(emotionIntervalRef.current);
      emotionIntervalRef.current = null;
    }
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

  const handleVoiceCommand = (command: VoiceCommand, params?: string) => {
    switch (command) {
      case 'start_verification':
        if (!isVerifying) {
          startVerification();
          toast.success('Starting verification...');
        }
        break;
      case 'search_person':
        if (params) {
          toast.info(`Searching for: ${params}`);
          // TODO: Implement search functionality
        }
        break;
      default:
        break;
    }
  };

  // Enumerate camera devices on mount
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameraDevices(videoDevices);
        if (videoDevices.length > 0) {
          setCameraSource(videoDevices[0]!.deviceId);
        }
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      }
    };
    
    enumerateDevices();
  }, []);

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

      {/* Voice Command Indicator */}
      <VoiceIndicator onCommand={handleVoiceCommand} showHistory={false} />

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
                    {cameraDevices.length > 0 ? (
                      cameraDevices.map((device, index) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${index + 1}`}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="default">Default Camera</SelectItem>
                    )}
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
                className={`absolute top-0 left-0 pointer-events-none ${!isVerifying ? 'hidden' : ''}`}
                style={{ width: '100%', height: '100%' }}
              />
              
              {/* Confidence Indicator */}
              {isVerifying && landmarks && (
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg z-20">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-white/70">Detection</div>
                    <div className={`text-lg font-bold ${
                      confidence >= 0.7 ? 'text-green-400' :
                      confidence >= 0.5 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {Math.round(confidence * 100)}%
                    </div>
                  </div>
                  <div className="w-32 h-1.5 bg-white/20 rounded-full mt-1 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        confidence >= 0.7 ? 'bg-green-400' :
                        confidence >= 0.5 ? 'bg-yellow-400' :
                        'bg-red-400'
                      }`}
                      style={{ width: `${confidence * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Emotion Display */}
            {isVerifying && currentEmotion && (
              <div className="mb-4">
                <EmotionBadge emotion={currentEmotion} showDetails={false} />
              </div>
            )}

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
                    <CardContent className="space-y-4">
                      {/* Profile Photo */}
                      {match.photoUrl && (
                        <div className="flex justify-center">
                          <img 
                            src={match.photoUrl} 
                            alt={`${match.name} ${match.surname}`}
                            className="w-24 h-24 rounded-full object-cover border-4 border-green-500"
                          />
                        </div>
                      )}

                      {/* Personal Info */}
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-semibold text-lg">{match.name} {match.surname}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Enrollee ID</p>
                          <p className="font-mono text-sm">{match.enrolleeId}</p>
                        </div>
                        {match.email && (
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="text-sm">{match.email}</p>
                          </div>
                        )}
                      </div>

                      {/* Match Confidence */}
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Match Confidence</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-3">
                            <div 
                              className="bg-green-500 h-3 rounded-full transition-all"
                              style={{ width: `${match.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold">{match.confidence}%</span>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>Enrolled: {match.enrolledAt ? new Date(match.enrolledAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>Camera: {cameraSource}</span>
                        </div>
                      </div>

                      {/* Voice Sample Playback */}
                      {match.voiceSampleUrl && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground mb-2">Voice Sample</p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (playingVoiceId === match.enrolleeId) {
                                  // Stop playing
                                  if (voiceAudioRef.current) {
                                    voiceAudioRef.current.pause();
                                    voiceAudioRef.current.currentTime = 0;
                                  }
                                  setPlayingVoiceId(null);
                                } else {
                                  // Start playing
                                  if (voiceAudioRef.current) {
                                    voiceAudioRef.current.pause();
                                  }
                                  const audio = new Audio(match.voiceSampleUrl);
                                  audio.onended = () => setPlayingVoiceId(null);
                                  audio.onerror = () => {
                                    toast.error('Failed to play voice sample');
                                    setPlayingVoiceId(null);
                                  };
                                  audio.play();
                                  voiceAudioRef.current = audio;
                                  setPlayingVoiceId(match.enrolleeId);
                                }
                              }}
                              className="flex-1"
                            >
                              {playingVoiceId === match.enrolleeId ? (
                                <>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Stop Voice
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-4 w-4 mr-2" />
                                  Play Voice
                                </>
                              )}
                            </Button>
                            {match.voiceTranscript && (
                              <div className="flex-1 text-xs text-muted-foreground italic truncate">
                                "{match.voiceTranscript}"
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          View Profile
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          History
                        </Button>
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
