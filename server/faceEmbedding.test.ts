import { describe, it, expect } from 'vitest';
import { extractFaceEmbedding, cosineSimilarity, normalizeEmbedding } from '../client/src/utils/faceEmbedding';

describe('Face Embedding Utilities', () => {
  describe('extractFaceEmbedding', () => {
    it('should extract embedding from landmarks', () => {
      const landmarks = [
        { x: 0.5, y: 0.5, z: 0.1 },
        { x: 0.6, y: 0.6, z: 0.2 },
        { x: 0.4, y: 0.4, z: 0.15 },
      ];
      
      const embedding = extractFaceEmbedding(landmarks);
      
      expect(embedding).toHaveLength(9); // 3 landmarks * 3 coordinates
      expect(embedding).toEqual([0.5, 0.5, 0.1, 0.6, 0.6, 0.2, 0.4, 0.4, 0.15]);
    });
    
    it('should throw error for empty landmarks', () => {
      expect(() => extractFaceEmbedding([])).toThrow('No landmarks provided');
    });
  });
  
  describe('cosineSimilarity', () => {
    it('should return 1 for identical embeddings', () => {
      const embedding1 = [1, 2, 3, 4, 5];
      const embedding2 = [1, 2, 3, 4, 5];
      
      const similarity = cosineSimilarity(embedding1, embedding2);
      
      expect(similarity).toBeCloseTo(1, 5);
    });
    
    it('should return 0 for orthogonal embeddings', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [0, 1, 0];
      
      const similarity = cosineSimilarity(embedding1, embedding2);
      
      expect(similarity).toBeCloseTo(0, 5);
    });
    
    it('should return -1 for opposite embeddings', () => {
      const embedding1 = [1, 2, 3];
      const embedding2 = [-1, -2, -3];
      
      const similarity = cosineSimilarity(embedding1, embedding2);
      
      expect(similarity).toBeCloseTo(-1, 5);
    });
    
    it('should return value between 0 and 1 for similar embeddings', () => {
      const embedding1 = [1, 2, 3, 4, 5];
      const embedding2 = [1.1, 2.1, 2.9, 4.1, 4.9];
      
      const similarity = cosineSimilarity(embedding1, embedding2);
      
      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThanOrEqual(1);
    });
    
    it('should throw error for different length embeddings', () => {
      const embedding1 = [1, 2, 3];
      const embedding2 = [1, 2];
      
      expect(() => cosineSimilarity(embedding1, embedding2)).toThrow('Embeddings must have the same length');
    });
  });
  
  describe('normalizeEmbedding', () => {
    it('should normalize embedding to unit length', () => {
      const embedding = [3, 4]; // Length = 5
      
      const normalized = normalizeEmbedding(embedding);
      
      expect(normalized).toHaveLength(2);
      expect(normalized[0]).toBeCloseTo(0.6, 5);
      expect(normalized[1]).toBeCloseTo(0.8, 5);
      
      // Check unit length
      const length = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2);
      expect(length).toBeCloseTo(1, 5);
    });
    
    it('should handle zero vector', () => {
      const embedding = [0, 0, 0];
      
      const normalized = normalizeEmbedding(embedding);
      
      expect(normalized).toEqual([0, 0, 0]);
    });
  });
});
