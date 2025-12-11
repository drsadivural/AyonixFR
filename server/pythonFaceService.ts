/**
 * Node.js wrapper for Python face recognition service
 * Provides high-accuracy face detection with MediaPipe and image preprocessing
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface FaceDetectionResult {
  faces: Array<{
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence: number;
  }>;
  count: number;
  error?: string;
}

interface FaceExtractionResult {
  faces: Array<{
    landmarks: Array<{
      x: number;
      y: number;
      z: number;
    }>;
    embedding: number[];
    landmark_count: number;
    confidence?: number;
  }>;
  count: number;
  error?: string;
}

/**
 * Call Python face service
 */
function callPythonService(command: string, imageBase64: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.resolve(process.cwd(), 'python_service/face_service.py');
    
    const python = spawn('python3.11', [pythonScript, command, imageBase64]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python service exited with code ${code}: ${stderr}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Python service output: ${stdout}`));
      }
    });
    
    python.on('error', (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`));
    });
  });
}

/**
 * Detect faces in an image with bounding boxes
 */
export async function detectFaces(imageBase64: string): Promise<FaceDetectionResult> {
  try {
    const result = await callPythonService('detect', imageBase64);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Face detection error:', error);
    throw error;
  }
}

/**
 * Extract 3D facial landmarks and face embedding
 */
export async function extractFaceLandmarksAndEmbedding(
  imageBase64: string
): Promise<FaceExtractionResult> {
  try {
    const result = await callPythonService('extract', imageBase64);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Face extraction error:', error);
    throw error;
  }
}

/**
 * Extract single face embedding (for enrollment)
 */
export async function extractSingleFaceEmbedding(imageBase64: string): Promise<number[]> {
  const result = await extractFaceLandmarksAndEmbedding(imageBase64);
  
  if (result.count === 0) {
    throw new Error('No face detected in image');
  }
  
  if (result.count > 1) {
    throw new Error('Multiple faces detected. Please ensure only one face is visible.');
  }
  
  return result.faces[0]!.embedding;
}

/**
 * Extract multiple face embeddings (for verification)
 */
export async function extractMultipleFaceEmbeddings(imageBase64: string): Promise<number[][]> {
  const result = await extractFaceLandmarksAndEmbedding(imageBase64);
  
  return result.faces.map(face => face.embedding);
}

/**
 * Get 3D landmarks for visualization with confidence scores
 */
export async function get3DLandmarks(imageBase64: string): Promise<Array<{
  landmarks: Array<{ x: number; y: number; z: number }>;
  confidence: number;
}>> {
  const result = await extractFaceLandmarksAndEmbedding(imageBase64);
  
  return result.faces.map(face => ({
    landmarks: face.landmarks,
    confidence: face.confidence || 0.95, // Default high confidence if not provided
  }));
}
