/**
 * Face embedding utilities using MediaPipe Face Mesh landmarks
 */

/**
 * Extract face embedding from MediaPipe Face Mesh landmarks
 * Uses normalized landmark coordinates as a simple embedding vector
 * For production, consider using a dedicated face recognition model
 */
export function extractFaceEmbedding(landmarks: Array<{x: number, y: number, z: number}>): number[] {
  if (!landmarks || landmarks.length === 0) {
    throw new Error('No landmarks provided');
  }

  // Flatten the landmarks into a single vector
  // Each landmark has x, y, z coordinates (normalized 0-1)
  const embedding: number[] = [];
  
  for (const landmark of landmarks) {
    embedding.push(landmark.x, landmark.y, landmark.z);
  }
  
  return embedding;
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns a value between -1 and 1, where 1 means identical
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Normalize an embedding vector to unit length
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  
  if (norm === 0) {
    return embedding;
  }

  return embedding.map(val => val / norm);
}
