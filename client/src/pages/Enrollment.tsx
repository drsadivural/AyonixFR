import { useState, useRef, useEffect, useCallback } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Upload, Smartphone, User, Mail, Phone, MapPin, Instagram as InstagramIcon } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import FaceQualityIndicator from '@/components/FaceQualityIndicator';
import { speak } from '@/services/voiceAssistant';
import { validatePhoto } from '@/services/photoValidation';
import VoiceRecorder from '@/components/VoiceRecorder';
import { extractFaceEmbedding } from '@/utils/faceEmbedding';

type EnrollmentMethod = 'camera' | 'photo' | 'mobile';

export default function Enrollment() {
  const [enrollmentMethod, setEnrollmentMethod] = useState<EnrollmentMethod>('camera');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [landmarks, setLandmarks] = useState<Array<{x: number, y: number, z: number}> | null>(null);
  const [faceQuality, setFaceQuality] = useState<any>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    address: '',
    instagram: '',
    voiceBlob: null as Blob | null,
    voiceTranscript: '',
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const mediaPipeCameraRef = useRef<MediaPipeCamera | null>(null);
  const detectedFaceBoundsRef = useRef<{xCenter: number, yCenter: number, width: number, height: number} | null>(null);
  const landmarkFetchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentLandmarksRef = useRef<Array<{x: number, y: number, z: number}> | null>(null);

  const [duplicateWarning, setDuplicateWarning] = useState<any[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  
  // Duplicate check will be done after enrollment for now
  
  const enrollMutation = trpc.enrollees.enroll.useMutation({
    onSuccess: () => {
      toast.success('Enrollment successful!');
      speak('Person registered successfully! Welcome aboard!');
      setDuplicateWarning([]);
      setShowDuplicateDialog(false);
      // Reset form
      setFormData({
        name: '',
        surname: '',
        email: '',
        phone: '',
        address: '',
        instagram: '',
        voiceBlob: null,
        voiceTranscript: '',
      });
      setCapturedImage(null);
      setLandmarks(null);
    },
    onError: (error) => {
      toast.error(`Enrollment failed: ${error.message}`);
    },
  });

  const getLandmarksMutation = trpc.verification.getLandmarks.useMutation();

  // Enumerate camera devices on component mount
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameraDevices(videoDevices);
        if (videoDevices.length > 0 && !selectedCameraId) {
          setSelectedCameraId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Error enumerating devices:', error);
      }
    };
    enumerateDevices();
  }, []);

  const startCamera = async (deviceId?: string) => {
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to load metadata, then play
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setIsCapturing(true);
              
              // Initialize MediaPipe Face Mesh for accurate face bounds
              if (!faceMeshRef.current) {
                faceMeshRef.current = new FaceMesh({
                  locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
                });
                faceMeshRef.current.setOptions({
                  maxNumFaces: 1,
                  refineLandmarks: true,
                  minDetectionConfidence: 0.5,
                  minTrackingConfidence: 0.5
                });
                faceMeshRef.current.onResults((results: any) => {
                  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                    const landmarks = results.multiFaceLandmarks[0];
                    
                    // Calculate bounding box from landmarks (min/max x/y)
                    let minX = 1, minY = 1, maxX = 0, maxY = 0;
                    landmarks.forEach((landmark: any) => {
                      minX = Math.min(minX, landmark.x);
                      minY = Math.min(minY, landmark.y);
                      maxX = Math.max(maxX, landmark.x);
                      maxY = Math.max(maxY, landmark.y);
                    });
                    
                    const width = maxX - minX;
                    const height = maxY - minY;
                    const xCenter = minX + width / 2;
                    const yCenter = minY + height / 2;
                    
                    // Add 10% padding for better visual fit
                    const padding = 1.1;
                    
                    detectedFaceBoundsRef.current = {
                      xCenter,
                      yCenter,
                      width: width * padding,
                      height: height * padding
                    };
                    
                    console.log('[MediaPipe] Face mesh bounds:', detectedFaceBoundsRef.current);
                    
                    // Store landmarks for enrollment
                    currentLandmarksRef.current = landmarks;
                  } else {
                    detectedFaceBoundsRef.current = null;
                    currentLandmarksRef.current = null;
                  }
                });
              }
              
              // Start MediaPipe camera
              if (videoRef.current && faceMeshRef.current) {
                mediaPipeCameraRef.current = new MediaPipeCamera(videoRef.current, {
                  onFrame: async () => {
                    if (videoRef.current && faceMeshRef.current) {
                      await faceMeshRef.current.send({ image: videoRef.current });
                    }
                  },
                  width: 1280,
                  height: 720
                });
                mediaPipeCameraRef.current.start();
              }
              
              detectLandmarksLoop();
              
              // MediaPipe Face Mesh provides landmarks directly in onResults
              // No need for separate backend calls
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

  const lastLandmarkFetchRef = useRef<number>(0);

  const fetchLandmarksFromVideo = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    
    // Capture current frame at reduced resolution to avoid E2BIG error
    // Backend can't handle full HD images - resize to max 640px width
    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.7);
    
    console.log('[Enrollment] Video dimensions:', video.videoWidth, 'x', video.videoHeight);
    
    try {
      // Fetch landmarks from backend using tRPC mutation
      const result = await getLandmarksMutation.mutateAsync({ imageBase64: imageData });
      
      console.log('[Enrollment] Landmark result:', result);
      
      if (result.landmarks && result.landmarks.length > 0) {
        const firstFace = result.landmarks[0];
        console.log('[Enrollment] Setting', firstFace.landmarks.length, 'landmarks, first:', firstFace.landmarks[0]);
        setLandmarks(firstFace.landmarks);
        setConfidence(Math.round((firstFace.confidence || 0) * 100));
      } else {
        console.log('[Enrollment] No faces detected');
        setLandmarks(null);
        setConfidence(0);
      }
    } catch (error) {
      console.error('Failed to fetch landmarks:', error);
      setLandmarks(null);
      setConfidence(0);
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

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Set canvas to match video resolution (not display size)
    overlayCanvas.width = videoWidth;
    overlayCanvas.height = videoHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, videoWidth, videoHeight);

    // Draw face rectangle from MediaPipe detection
    const faceBounds = detectedFaceBoundsRef.current;
    if (faceBounds) {
      // MediaPipe returns normalized coordinates (0-1)
      // Convert to video pixel coordinates
      const x = faceBounds.xCenter * videoWidth;
      const y = faceBounds.yCenter * videoHeight;
      const w = faceBounds.width * videoWidth;
      const h = faceBounds.height * videoHeight;
      
      console.log('[Canvas] Drawing rect at:', { x: x - w/2, y: y - h/2, w, h, videoWidth, videoHeight });
      
      // Draw bounding box (no scaling needed - canvas matches video resolution)
      ctx.strokeStyle = '#10b981'; // Green
      ctx.lineWidth = 5; // Thicker line for visibility
      ctx.strokeRect(x - w/2, y - h/2, w, h);
    }

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(detectLandmarksLoop);
  }, []);

  const stopCamera = () => {
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
    setIsCapturing(false);
    setLandmarks(null);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        
        stopCamera();
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        
        // Validate photo quality
        toast.info('Validating photo...');
        const validation = await validatePhoto(imageData);
        
        if (!validation.isValid) {
          toast.error(validation.error || 'Invalid photo');
          return;
        }
        
        if (validation.quality) {
          const { lighting, angle, clarity } = validation.quality;
          if (lighting === 'poor' || angle === 'side' || clarity === 'blurry') {
            toast.warning(
              `Photo quality: ${lighting} lighting, ${angle} angle, ${clarity} clarity. ` +
              'Consider retaking for better results.'
            );
          } else {
            toast.success('Photo validated successfully!');
          }
        }
        
        setCapturedImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnroll = async () => {
    if (!capturedImage) {
      toast.error('Please capture or upload an image first');
      return;
    }

    if (!formData.name || !formData.surname) {
      toast.error('Name and surname are required');
      return;
    }

    // Check face quality
    if (faceQuality && faceQuality.overall_score < 50) {
      toast.error('Image quality is too low. Please capture a better image.');
      return;
    }

    // Convert voice blob to base64 if present
    let voiceBase64: string | undefined;
    if (formData.voiceBlob) {
      try {
        voiceBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(formData.voiceBlob!);
        });
      } catch (error) {
        console.error('Failed to convert voice blob:', error);
        toast.error('Failed to process voice sample');
        return;
      }
    }

    // Extract face embedding from current landmarks
    if (!currentLandmarksRef.current) {
      toast.error('No face detected. Please ensure your face is visible in the camera.');
      return;
    }
    
    const faceEmbedding = extractFaceEmbedding(currentLandmarksRef.current);
    console.log('[Enrollment] Extracted face embedding, length:', faceEmbedding.length);
    
    enrollMutation.mutate({
      name: formData.name,
      surname: formData.surname,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      instagram: formData.instagram,
      imageBase64: capturedImage,
      faceEmbedding,
      enrollmentMethod,
      voiceBase64,
    });
  };

  useEffect(() => {
    // Auto-start camera when component mounts
    if (enrollmentMethod === 'camera') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentMethod]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Face Enrollment</h1>
        <p className="text-muted-foreground">Register a new person in the system</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera/Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Capture Face</CardTitle>
            <CardDescription>Choose enrollment method</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={enrollmentMethod} onValueChange={(v) => setEnrollmentMethod(v as EnrollmentMethod)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="camera" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Camera
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="mobile" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </TabsTrigger>
              </TabsList>

              <TabsContent value="camera" className="space-y-4">
                {/* Camera Selector */}
                {cameraDevices.length > 1 && (
                  <div className="space-y-2">
                    <Label>Select Camera</Label>
                    <Select 
                      value={selectedCameraId} 
                      onValueChange={(value) => {
                        setSelectedCameraId(value);
                        if (isCapturing) {
                          stopCamera();
                          setTimeout(() => startCamera(value), 100);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cameraDevices.map((device) => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${cameraDevices.indexOf(device) + 1}`}
                            {device.label.toLowerCase().includes('iphone') && ' 📱'}
                            {device.label.toLowerCase().includes('continuity') && ' 📱'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {cameraDevices.some(d => d.label.toLowerCase().includes('iphone') || d.label.toLowerCase().includes('continuity')) && (
                      <p className="text-sm text-muted-foreground">
                        📱 iPhone camera detected via Continuity Camera
                      </p>
                    )}
                  </div>
                )}
                
                <div className="relative w-full h-[600px] bg-muted rounded-lg overflow-hidden">
                  {!isCapturing && !capturedImage && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="text-center">
                        <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Starting camera...</p>
                      </div>
                    </div>
                  )}
                  
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${!isCapturing || capturedImage ? 'hidden' : ''}`}
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    className={`absolute top-0 left-0 pointer-events-none ${!isCapturing || capturedImage ? 'hidden' : ''}`}
                    style={{ width: '100%', height: '100%' }}
                  />
                  
                  {/* Confidence Indicator */}
                  {isCapturing && !capturedImage && landmarks && (
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
                  
                  {capturedImage && (
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                  )}
                  
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {isCapturing && (
                  <div className="flex gap-2">
                    <Button onClick={captureImage} className="flex-1">
                      Capture
                    </Button>
                    <Button onClick={stopCamera} variant="outline">
                      Cancel
                    </Button>
                  </div>
                )}

                {capturedImage && (
                  <Button onClick={() => { setCapturedImage(null); setLandmarks(null); startCamera(); }} variant="outline" className="w-full">
                    Retake
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  {!capturedImage ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8" />
                          <span>Click to upload image</span>
                        </div>
                        <Input
                          id="file-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </Label>
                    </div>
                  ) : (
                    <img src={capturedImage} alt="Uploaded" className="w-full h-full object-contain" />
                  )}
                </div>

                {capturedImage && (
                  <Button onClick={() => { setCapturedImage(null); setLandmarks(null); }} variant="outline" className="w-full">
                    Choose Different Image
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="mobile" className="space-y-4">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Smartphone className="h-12 w-12 mx-auto" />
                    <p className="text-sm text-muted-foreground">Mobile capture coming soon</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            {/* Face Quality Indicator */}
            {capturedImage && (
              <FaceQualityIndicator 
                imageBase64={capturedImage} 
                onQualityChange={setFaceQuality}
              />
            )}
          </CardContent>
        </Card>

        {/* Personal Information Form */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Enter enrollee details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="First name"
                    className="pl-10"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="surname">Surname *</Label>
                <Input
                  id="surname"
                  placeholder="Last name"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                />
              </div>
            </div>

            <Collapsible open={showMoreInfo} onOpenChange={setShowMoreInfo}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  More Information (Optional)
                  <ChevronDown className={`h-4 w-4 transition-transform ${showMoreInfo ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="+1 (555) 000-0000"
                      className="pl-10"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      placeholder="Street address"
                      className="pl-10"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <div className="relative">
                    <InstagramIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="instagram"
                      placeholder="@username"
                      className="pl-10"
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Voice Sample Recording */}
            <div className="space-y-2 pt-4 border-t">
              <Label>Voice Sample (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Record a short voice sample to personalize voice responses during verification
              </p>
              <VoiceRecorder 
                onRecordingComplete={(audioBlob: Blob, transcript: string) => {
                  setFormData({ ...formData, voiceBlob: audioBlob, voiceTranscript: transcript });
                }}
              />
              {formData.voiceTranscript && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  <strong>Transcript:</strong> {formData.voiceTranscript}
                </div>
              )}
            </div>

            <Button 
              onClick={handleEnroll} 
              className="w-full" 
              disabled={!capturedImage || enrollMutation.isPending}
            >
              {enrollMutation.isPending ? 'Enrolling...' : 'Complete Enrollment'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
