/**
 * Face Recognition Service
 * 
 * This service handles face embedding comparison and matching.
 * Face detection and embedding extraction are performed on the client-side
 * using face-api.js loaded from CDN to avoid native dependencies.
 */

/**
 * Calculate cosine similarity between two face embeddings
 * Returns a value between -1 and 1, where 1 means identical
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

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
  
  let bestMatch: { id: number; similarity: number; name: string; surname: string } | null = null;
  
  for (const stored of storedEmbeddings) {
    // Skip if embedding lengths don't match (different face detection methods)
    if (stored.embedding.length !== queryEmbedding.length) {
      console.warn(`[FaceRecognition] Skipping enrollee ${stored.id}: embedding length mismatch (${stored.embedding.length} vs ${queryEmbedding.length})`);
      continue;
    }
    
    // Use cosine similarity (higher is better)
    const similarity = cosineSimilarity(queryEmbedding, stored.embedding);
    
    if (!bestMatch || similarity > bestMatch.similarity) {
      bestMatch = {
        id: stored.id,
        similarity,
        name: stored.name,
        surname: stored.surname,
      };
    }
  }
  
  if (!bestMatch) {
    return { matched: false };
  }
  
  // Higher similarity = better match. Typical threshold is 0.6 (60% similarity)
  // Convert threshold to similarity scale (0.6 threshold = 0.6 similarity)
  const matched = bestMatch.similarity >= threshold;
  const confidence = Math.round(bestMatch.similarity * 100);
  
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
  enrolledFaces: Array<{ id: number; embedding: number[]; name: string; surname: string; voiceSampleUrl?: string | null; voiceTranscript?: string | null; photoUrl?: string; email?: string | null }>,
  threshold: number = 0.6
): {
  detectedFaces: number;
  matches: Array<{
    enrolleeId: number;
    confidence: number;
    name: string;
    surname: string;
    voiceSampleUrl?: string | null;
    voiceTranscript?: string | null;
    photoUrl?: string;
    email?: string | null;
  }>;
} {
  if (faceEmbeddings.length === 0) {
    return { detectedFaces: 0, matches: [] };
  }
  
  const matches = [];
  
  for (const embedding of faceEmbeddings) {
    const matchResult = findBestMatch(embedding, enrolledFaces, threshold);
    
    if (matchResult.matched && matchResult.enrolleeId) {
      const enrollee = enrolledFaces.find(e => e.id === matchResult.enrolleeId);
      matches.push({
        enrolleeId: matchResult.enrolleeId,
        confidence: matchResult.confidence!,
        name: matchResult.name!,
        surname: matchResult.surname!,
        voiceSampleUrl: enrollee?.voiceSampleUrl,
        voiceTranscript: enrollee?.voiceTranscript,
        photoUrl: enrollee?.photoUrl,
        email: enrollee?.email,
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
