import { useState, useRef, useEffect } from 'react';
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

type EnrollmentMethod = 'camera' | 'photo' | 'mobile';

export default function Enrollment() {
  const [enrollmentMethod, setEnrollmentMethod] = useState<EnrollmentMethod>('camera');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [landmarks, setLandmarks] = useState<Array<{x: number, y: number, z: number}> | null>(null);
  const [faceQuality, setFaceQuality] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    address: '',
    instagram: '',
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [duplicateWarning, setDuplicateWarning] = useState<any[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  
  // Duplicate check will be done after enrollment for now
  
  const enrollMutation = trpc.enrollees.enroll.useMutation({
    onSuccess: () => {
      toast.success('Enrollment successful!');
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
      });
      setCapturedImage(null);
      setLandmarks(null);
    },
    onError: (error) => {
      toast.error(`Enrollment failed: ${error.message}`);
    },
  });

  const [landmarksImageData, setLandmarksImageData] = useState<string | null>(null);
  
  const { data: landmarksData } = trpc.verification.getLandmarks.useQuery(
    { imageBase64: landmarksImageData || '' },
    { enabled: !!landmarksImageData }
  );
  
  useEffect(() => {
    if (landmarksData && Array.isArray(landmarksData) && landmarksData.length > 0 && landmarksData[0]) {
      setLandmarks((landmarksData as any)[0].landmarks);
    }
  }, [landmarksData]);

  const startCamera = async () => {
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
        
        // Wait for video to load metadata, then play
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setIsCapturing(true);
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
    if (!videoRef.current || !overlayCanvasRef.current || !isCapturing) {
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
      landmarks.forEach((landmark, index) => {
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

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
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
        
        // Get landmarks for the captured image
        setLandmarksImageData(imageData);
        
        stopCamera();
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        // Get landmarks for the uploaded image
        setLandmarksImageData(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnroll = () => {
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

    // First check for duplicates by extracting embedding
    // For now, we'll skip duplicate check and proceed directly
    // In production, you would extract embedding first, check duplicates, then enroll
    
    enrollMutation.mutate({
      ...formData,
      imageBase64: capturedImage,
      enrollmentMethod,
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
                    className={`absolute top-0 left-0 w-full h-full pointer-events-none ${!isCapturing || capturedImage ? 'hidden' : ''}`}
                    style={{ mixBlendMode: 'screen' }}
                  />
                  
                  {capturedImage && (
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
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
                    <img src={capturedImage} alt="Uploaded" className="w-full h-full object-cover" />
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
