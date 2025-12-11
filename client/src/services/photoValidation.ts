import * as faceapi from 'face-api.js';

export interface PhotoValidationResult {
  isValid: boolean;
  error?: string;
  faceCount?: number;
  quality?: {
    lighting: 'good' | 'poor';
    angle: 'frontal' | 'side';
    clarity: 'sharp' | 'blurry';
  };
}

let modelsLoaded = false;

export async function loadFaceDetectionModels(): Promise<void> {
  if (modelsLoaded) return;
  
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    ]);
    modelsLoaded = true;
  } catch (error) {
    console.error('Failed to load face detection models:', error);
    throw new Error('Face detection models not available');
  }
}

export async function validatePhoto(imageDataUrl: string): Promise<PhotoValidationResult> {
  try {
    // Load models if not already loaded
    await loadFaceDetectionModels();
    
    // Create image element from data URL
    const img = await loadImage(imageDataUrl);
    
    // Detect faces with landmarks and expressions
    const detections = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();
    
    // Check face count
    if (detections.length === 0) {
      return {
        isValid: false,
        error: 'No face detected in the photo. Please ensure your face is clearly visible.',
        faceCount: 0,
      };
    }
    
    if (detections.length > 1) {
      return {
        isValid: false,
        error: 'Multiple faces detected. Please ensure only one person is in the photo.',
        faceCount: detections.length,
      };
    }
    
    // Analyze photo quality
    const detection = detections[0];
    const quality = analyzePhotoQuality(detection, img);
    
    return {
      isValid: true,
      faceCount: 1,
      quality,
    };
  } catch (error) {
    console.error('Photo validation error:', error);
    return {
      isValid: false,
      error: 'Failed to validate photo. Please try again.',
    };
  }
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function analyzePhotoQuality(
  detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68> & faceapi.WithFaceExpressions<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>>,
  img: HTMLImageElement
): { lighting: 'good' | 'poor'; angle: 'frontal' | 'side'; clarity: 'sharp' | 'blurry' } {
  // Simple quality heuristics
  const score = detection.detection.score;
  const box = detection.detection.box;
  
  // Lighting: based on detection confidence
  const lighting = score > 0.8 ? 'good' : 'poor';
  
  // Angle: based on face box aspect ratio
  const aspectRatio = box.width / box.height;
  const angle = aspectRatio > 0.7 && aspectRatio < 1.3 ? 'frontal' : 'side';
  
  // Clarity: based on face size relative to image
  const faceArea = box.width * box.height;
  const imageArea = img.width * img.height;
  const faceRatio = faceArea / imageArea;
  const clarity = faceRatio > 0.05 ? 'sharp' : 'blurry';
  
  return { lighting, angle, clarity };
}
