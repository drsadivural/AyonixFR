/**
 * Face Detection Utility
 * 
 * Uses face-api.js loaded from CDN to perform client-side face detection
 * and embedding extraction without requiring native dependencies.
 */

declare const faceapi: any;

let modelsLoaded = false;

/**
 * Load face-api.js models from CDN
 */
export async function loadFaceDetectionModels(): Promise<void> {
  if (modelsLoaded) return;

  // Load face-api.js from CDN if not already loaded
  if (typeof faceapi === 'undefined') {
    await loadScript('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js');
  }

  // Load models from CDN
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
  
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
}

/**
 * Load a script dynamically
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Detect faces in an image and extract embeddings
 */
export async function detectFacesWithEmbeddings(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<Array<{
  detection: any;
  landmarks: any;
  descriptor: number[];
}>> {
  await loadFaceDetectionModels();

  const detections = await faceapi
    .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((d: any) => ({
    detection: d.detection,
    landmarks: d.landmarks,
    descriptor: Array.from(d.descriptor),
  }));
}

/**
 * Detect a single face and extract embedding (for enrollment)
 */
export async function detectSingleFace(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<{
  detection: any;
  landmarks: any;
  descriptor: number[];
} | null> {
  const faces = await detectFacesWithEmbeddings(imageElement);
  
  if (faces.length === 0) {
    return null;
  }

  if (faces.length > 1) {
    throw new Error('Multiple faces detected. Please ensure only one face is visible.');
  }

  return faces[0] || null;
}

/**
 * Draw face detection box and landmarks on canvas
 */
export function drawFaceDetection(
  canvas: HTMLCanvasElement,
  detection: any,
  landmarks?: any
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Draw bounding box
  const box = detection.box;
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  // Draw landmarks if provided
  if (landmarks) {
    ctx.fillStyle = '#ff0000';
    const points = landmarks.positions;
    points.forEach((point: any) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
}

/**
 * Generate a mock face embedding (128-dimensional vector)
 * TODO: Replace with actual face-api.js extraction in production
 */
export function generateMockEmbedding(): number[] {
  return Array.from({ length: 128 }, () => Math.random() * 2 - 1);
}

/**
 * Create an image element from base64 data
 */
export function createImageFromBase64(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  });
}

/**
 * Check if face-api.js is available
 */
export function isFaceApiAvailable(): boolean {
  return typeof faceapi !== 'undefined';
}
