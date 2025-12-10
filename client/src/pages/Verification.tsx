import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Camera, Loader2, CheckCircle, XCircle } from "lucide-react";
import { generateMockEmbedding } from "@/lib/faceDetection";
import { toast } from "sonner";

export default function Verification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraSource, setCameraSource] = useState('webcam');
  const [lastResult, setLastResult] = useState<any>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: settings } = trpc.settings.get.useQuery();
  
  const verifyMutation = trpc.verification.verify.useMutation({
    onSuccess: (data) => {
      setLastResult(data);
      if (data.matches.length > 0) {
        toast.success(`Match found: ${data.matches[0]?.name} ${data.matches[0]?.surname}`);
      } else {
        toast.info('No match found in database');
      }
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
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
      setIsVerifying(true);
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
    setIsVerifying(false);
  };

  const captureAndVerify = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        
        // Generate face embedding (using mock for now, replace with actual face-api.js in production)
        const faceEmbeddings = [generateMockEmbedding()];
        
        verifyMutation.mutate({
          imageBase64: imageData,
          faceEmbeddings,
          cameraSource,
          threshold: settings?.matchThreshold ? settings.matchThreshold / 100 : 0.75,
        });
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Face Verification</h1>
        <p className="text-muted-foreground mt-2">
          Verify faces against enrolled database
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Camera Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Camera Feed</CardTitle>
                  <CardDescription>Real-time face detection and verification</CardDescription>
                </div>
                <Select value={cameraSource} onValueChange={setCameraSource}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webcam">Webcam</SelectItem>
                    <SelectItem value="external">External Camera</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="video-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg bg-black"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex gap-2">
                {!isVerifying ? (
                  <Button onClick={startCamera} className="flex-1">
                    <Camera className="mr-2 h-4 w-4" />
                    Start Camera
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={captureAndVerify}
                      disabled={verifyMutation.isPending}
                      className="flex-1"
                    >
                      {verifyMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Verify Face
                        </>
                      )}
                    </Button>
                    <Button onClick={stopCamera} variant="outline">
                      Stop
                    </Button>
                  </>
                )}
              </div>

              {lastResult && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {lastResult.matches.length > 0 ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-600">Match Found</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-600">No Match</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Detected {lastResult.detectedFaces} face(s)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Verification Results</CardTitle>
              <CardDescription>Match details and confidence</CardDescription>
            </CardHeader>
            <CardContent>
              {lastResult && lastResult.matches.length > 0 ? (
                <div className="space-y-4">
                  {lastResult.matches.map((match: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-2">
                        {match.name} {match.surname}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Confidence</span>
                          <Badge variant="default">{match.confidence}%</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Enrollee ID</span>
                          <span className="text-sm font-medium">{match.enrolleeId}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : lastResult && lastResult.detectedFaces > 0 ? (
                <div className="text-center py-8">
                  <XCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Face detected but no match found in database
                  </p>
                </div>
              ) : lastResult ? (
                <div className="text-center py-8">
                  <XCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No faces detected in the image
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Start camera and verify a face to see results
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings Info */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Current Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Match Threshold</span>
                <span className="font-medium">{settings?.matchThreshold || 75}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Min Face Size</span>
                <span className="font-medium">{settings?.minFaceSize || 80}px</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Multi-Face Match</span>
                <span className="font-medium">{settings?.multiFaceMatch ? 'Enabled' : 'Disabled'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
