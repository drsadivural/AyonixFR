import * as faceapi from 'face-api.js';
import { Canvas, Image, ImageData } from 'canvas';
import fetch from 'node-fetch';

// Polyfill for face-api.js
(global as any).fetch = fetch;
(faceapi.env as any).monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

/**
 * Load face-api.js models (only once)
 */
export async function loadFaceModels() {
  if (modelsLoaded) return;
  
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
  
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('[FaceRecognition] Models loaded successfully');
  } catch (error) {
    console.error('[FaceRecognition] Failed to load models:', error);
    throw new Error('Failed to load face recognition models');
  }
}

/**
 * Detect faces in an image and return face descriptors with landmarks
 */
export async function detectFaces(imageBuffer: Buffer): Promise<{
  detections: Array<{
    box: { x: number; y: number; width: number; height: number };
    landmarks: number[][];
    descriptor: number[];
  }>;
}> {
  await loadFaceModels();
  
  const img = await (faceapi as any).bufferToImage(imageBuffer);
  
  const detections = await faceapi
    .detectAllFaces(img)
    .withFaceLandmarks()
    .withFaceDescriptors();
  
  if (!detections || detections.length === 0) {
    return { detections: [] };
  }
  
  return {
    detections: detections.map((detection: any) => ({
      box: {
        x: detection.detection.box.x,
        y: detection.detection.box.y,
        width: detection.detection.box.width,
        height: detection.detection.box.height,
      },
      landmarks: detection.landmarks.positions.map((p: any) => [p.x, p.y]),
      descriptor: Array.from(detection.descriptor),
    })),
  };
}

/**
 * Extract single face embedding from image (for enrollment)
 */
export async function extractFaceEmbedding(imageBuffer: Buffer): Promise<{
  embedding: number[];
  box: { x: number; y: number; width: number; height: number };
  landmarks: number[][];
} | null> {
  const result = await detectFaces(imageBuffer);
  
  if (result.detections.length === 0) {
    return null;
  }
  
  if (result.detections.length > 1) {
    throw new Error('Multiple faces detected. Please ensure only one face is visible for enrollment.');
  }
  
  const detection = result.detections[0]!;
  
  return {
    embedding: detection.descriptor,
    box: detection.box,
    landmarks: detection.landmarks,
  };
}

/**
 * Compare face embedding with stored embeddings and find best match
 */
export function findBestMatch(
  queryEmbedding: number[],
  storedEmbeddings: Array<{ id: number; embedding: number[]; name: string; surname: string }>,
  threshold: number = 0.6
): {
  matched: boolean;
  enrolleeId?: number;
  confidence?: number;
  name?: string;
  surname?: string;
} {
  if (storedEmbeddings.length === 0) {
    return { matched: false };
  }
  
  const queryDescriptor = new Float32Array(queryEmbedding);
  
  let bestMatch: { id: number; distance: number; name: string; surname: string } | null = null;
  
  for (const stored of storedEmbeddings) {
    const storedDescriptor = new Float32Array(stored.embedding);
    const distance = faceapi.euclideanDistance(queryDescriptor, storedDescriptor);
    
    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = {
        id: stored.id,
        distance,
        name: stored.name,
        surname: stored.surname,
      };
    }
  }
  
  if (!bestMatch) {
    return { matched: false };
  }
  
  // Lower distance = better match. Typical threshold is 0.6
  const matched = bestMatch.distance < threshold;
  const confidence = Math.round((1 - bestMatch.distance) * 100);
  
  return {
    matched,
    enrolleeId: matched ? bestMatch.id : undefined,
    confidence: matched ? confidence : undefined,
    name: matched ? bestMatch.name : undefined,
    surname: matched ? bestMatch.surname : undefined,
  };
}

/**
 * Verify a face against all enrolled faces
 */
export async function verifyFace(
  imageBuffer: Buffer,
  enrolledFaces: Array<{ id: number; embedding: number[]; name: string; surname: string }>,
  threshold: number = 0.6
): Promise<{
  detectedFaces: number;
  matches: Array<{
    enrolleeId: number;
    confidence: number;
    name: string;
    surname: string;
    box: { x: number; y: number; width: number; height: number };
  }>;
}> {
  const result = await detectFaces(imageBuffer);
  
  if (result.detections.length === 0) {
    return { detectedFaces: 0, matches: [] };
  }
  
  const matches = [];
  
  for (const detection of result.detections) {
    const matchResult = findBestMatch(detection.descriptor, enrolledFaces, threshold);
    
    if (matchResult.matched && matchResult.enrolleeId) {
      matches.push({
        enrolleeId: matchResult.enrolleeId,
        confidence: matchResult.confidence!,
        name: matchResult.name!,
        surname: matchResult.surname!,
        box: detection.box,
      });
    }
  }
  
  return {
    detectedFaces: result.detections.length,
    matches,
  };
}
