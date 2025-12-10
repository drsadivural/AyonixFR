/**
 * Face Recognition Service
 * 
 * This service handles face embedding comparison and matching.
 * Face detection and embedding extraction are performed on the client-side
 * using face-api.js loaded from CDN to avoid native dependencies.
 */

/**
 * Calculate Euclidean distance between two face embeddings
 */
function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i]! - b[i]!;
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

/**
 * Find best match for a face embedding against stored embeddings
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
  
  let bestMatch: { id: number; distance: number; name: string; surname: string } | null = null;
  
  for (const stored of storedEmbeddings) {
    const distance = euclideanDistance(queryEmbedding, stored.embedding);
    
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
    confidence: matched ? Math.max(0, Math.min(100, confidence)) : undefined,
    name: matched ? bestMatch.name : undefined,
    surname: matched ? bestMatch.surname : undefined,
  };
}

/**
 * Verify multiple face embeddings against enrolled faces
 */
export function verifyFaces(
  faceEmbeddings: number[][],
  enrolledFaces: Array<{ id: number; embedding: number[]; name: string; surname: string }>,
  threshold: number = 0.6
): {
  detectedFaces: number;
  matches: Array<{
    enrolleeId: number;
    confidence: number;
    name: string;
    surname: string;
  }>;
} {
  if (faceEmbeddings.length === 0) {
    return { detectedFaces: 0, matches: [] };
  }
  
  const matches = [];
  
  for (const embedding of faceEmbeddings) {
    const matchResult = findBestMatch(embedding, enrolledFaces, threshold);
    
    if (matchResult.matched && matchResult.enrolleeId) {
      matches.push({
        enrolleeId: matchResult.enrolleeId,
        confidence: matchResult.confidence!,
        name: matchResult.name!,
        surname: matchResult.surname!,
      });
    }
  }
  
  return {
    detectedFaces: faceEmbeddings.length,
    matches,
  };
}

/**
 * Validate face embedding format
 */
export function validateEmbedding(embedding: any): embedding is number[] {
  if (!Array.isArray(embedding)) {
    return false;
  }
  
  if (embedding.length !== 128) {
    return false;
  }
  
  return embedding.every(val => typeof val === 'number' && !isNaN(val));
}
