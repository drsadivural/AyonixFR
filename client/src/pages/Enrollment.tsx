import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc";
import { Camera, Upload, Smartphone, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Enrollment() {
  const [, navigate] = useLocation();
  const [enrollmentMethod, setEnrollmentMethod] = useState<'camera' | 'photo' | 'mobile'>('camera');
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    address: '',
    instagram: '',
  });

  const enrollMutation = trpc.enrollees.enroll.useMutation({
    onSuccess: () => {
      toast.success('Enrollment successful!');
      stopCamera();
      setCapturedImage(null);
      setFormData({
        name: '',
        surname: '',
        email: '',
        phone: '',
        address: '',
        instagram: '',
      });
      navigate('/enrollees');
    },
    onError: (error) => {
      toast.error(`Enrollment failed: ${error.message}`);
    },
  });

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCapturing(true);
    } catch (error) {
      toast.error('Failed to access camera');
      console.error('Camera error:', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
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

    enrollMutation.mutate({
      ...formData,
      imageBase64: capturedImage,
      enrollmentMethod,
    });
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Face Enrollment</h1>
        <p className="text-muted-foreground mt-2">
          Register a new person in the system
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Camera/Image Section */}
        <Card>
          <CardHeader>
            <CardTitle>Capture Face</CardTitle>
            <CardDescription>Choose enrollment method and capture face image</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Enrollment Method</Label>
              <Select value={enrollmentMethod} onValueChange={(v: any) => setEnrollmentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="camera">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      <span>Camera</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="photo">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      <span>Upload Photo</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span>Mobile Phone</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Camera View */}
            {enrollmentMethod === 'camera' && (
              <div className="space-y-4">
                <div className="video-container">
                  {capturedImage ? (
                    <img src={capturedImage} alt="Captured" className="w-full rounded-lg" />
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg bg-black"
                    />
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="flex gap-2">
                  {!isCapturing && !capturedImage && (
                    <Button onClick={startCamera} className="flex-1">
                      <Camera className="mr-2 h-4 w-4" />
                      Start Camera
                    </Button>
                  )}
                  {isCapturing && (
                    <>
                      <Button onClick={captureImage} className="flex-1">
                        Capture
                      </Button>
                      <Button onClick={stopCamera} variant="outline">
                        Cancel
                      </Button>
                    </>
                  )}
                  {capturedImage && (
                    <Button onClick={() => setCapturedImage(null)} variant="outline" className="flex-1">
                      Retake
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Photo Upload */}
            {enrollmentMethod === 'photo' && (
              <div className="space-y-4">
                {capturedImage ? (
                  <>
                    <img src={capturedImage} alt="Uploaded" className="w-full rounded-lg" />
                    <Button onClick={() => setCapturedImage(null)} variant="outline" className="w-full">
                      Choose Different Photo
                    </Button>
                  </>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-primary font-medium">Click to upload</span>
                      <span className="text-muted-foreground"> or drag and drop</span>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Mobile Phone */}
            {enrollmentMethod === 'mobile' && (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Smartphone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Mobile phone integration coming soon
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal Information Form */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Enter details for the enrollee</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="First name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="surname">Surname *</Label>
              <Input
                id="surname"
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                placeholder="Last name"
              />
            </div>

            <Collapsible open={showMoreInfo} onOpenChange={setShowMoreInfo}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span>More Information (Optional)</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showMoreInfo ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Street address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram Account</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@username"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button
              onClick={handleEnroll}
              disabled={enrollMutation.isPending || !capturedImage}
              className="w-full"
            >
              {enrollMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Enrollment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
