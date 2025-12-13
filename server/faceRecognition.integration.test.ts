import { describe, it, expect, beforeAll, vi } from 'vitest';

// Increase timeout for integration tests
vi.setConfig({ testTimeout: 15000 });
import { appRouter } from './routers';
import type { Context } from './_core/context';
import * as db from './db';

describe('Face Recognition Integration', () => {
  let testUser: any;
  let testContext: Context;
  
  beforeAll(async () => {
    // Create test user
    const userId = await db.createUser({
      name: 'Test Admin',
      email: `test-${Date.now()}@example.com`,
      password: 'hashedpassword',
      loginMethod: 'email',
      role: 'admin',
    });
    
    testUser = await db.getUserById(userId);
    
    testContext = {
      user: testUser,
      req: {} as any,
      res: {} as any,
    };
  });
  
  it('should enroll a person with face embedding', async () => {
    const caller = appRouter.createCaller(testContext);
    
    // Create a mock face embedding (468 landmarks * 3 coordinates = 1404 values)
    const mockLandmarks = Array(468).fill(null).map((_, i) => ({
      x: 0.5 + (i % 10) * 0.01,
      y: 0.5 + (i % 10) * 0.01,
      z: 0.1 + (i % 10) * 0.01,
    }));
    
    const faceEmbedding = mockLandmarks.flatMap(l => [l.x, l.y, l.z]);
    
    // Create a simple base64 image (1x1 red pixel)
    const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    
    const result = await caller.enrollees.enroll({
      name: 'John',
      surname: 'Doe',
      email: 'john.doe@example.com',
      imageBase64,
      faceEmbedding,
      enrollmentMethod: 'camera',
    });
    
    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.name).toBe('John');
    expect(result.surname).toBe('Doe');
    expect(result.faceEmbedding).toBeDefined();
    
    // Verify embedding was stored correctly
    const storedEmbedding = typeof result.faceEmbedding === 'string' 
      ? JSON.parse(result.faceEmbedding) 
      : result.faceEmbedding;
    expect(storedEmbedding).toHaveLength(1404);
  });
  
  it('should verify a face and find match', async () => {
    const caller = appRouter.createCaller(testContext);
    
    // First enroll a person
    const mockLandmarks = Array(468).fill(null).map((_, i) => ({
      x: 0.5 + (i % 10) * 0.01,
      y: 0.5 + (i % 10) * 0.01,
      z: 0.1 + (i % 10) * 0.01,
    }));
    
    const enrollmentEmbedding = mockLandmarks.flatMap(l => [l.x, l.y, l.z]);
    const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    
    const enrollee = await caller.enrollees.enroll({
      name: 'Jane',
      surname: 'Smith',
      imageBase64,
      faceEmbedding: enrollmentEmbedding,
      enrollmentMethod: 'camera',
    });
    
    // Now verify with the same embedding (should match)
    const verificationResult = await caller.verification.verify({
      imageBase64,
      faceEmbedding: enrollmentEmbedding,
      cameraSource: 'webcam',
      threshold: 0.75,
    });
    
    expect(verificationResult).toBeDefined();
    expect(verificationResult.detectedFaces).toBeGreaterThan(0);
    expect(verificationResult.matches).toHaveLength(1);
    expect(verificationResult.matches[0].enrolleeId).toBe(enrollee.id);
    expect(verificationResult.matches[0].confidence).toBeGreaterThan(95); // Should be very high for identical embedding
  });
  
  it('should not match with different embedding', async () => {
    const caller = appRouter.createCaller(testContext);
    
    // Create two different embeddings
    const mockLandmarks1 = Array(468).fill(null).map((_, i) => ({
      x: 0.5 + (i % 10) * 0.01,
      y: 0.5 + (i % 10) * 0.01,
      z: 0.1 + (i % 10) * 0.01,
    }));
    
    const mockLandmarks2 = Array(468).fill(null).map((_, i) => ({
      x: 0.3 + (i % 10) * 0.02, // Different values
      y: 0.7 + (i % 10) * 0.02,
      z: 0.2 + (i % 10) * 0.02,
    }));
    
    const embedding1 = mockLandmarks1.flatMap(l => [l.x, l.y, l.z]);
    const embedding2 = mockLandmarks2.flatMap(l => [l.x, l.y, l.z]);
    const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    
    // Enroll with first embedding
    await caller.enrollees.enroll({
      name: 'Person',
      surname: 'One',
      imageBase64,
      faceEmbedding: embedding1,
      enrollmentMethod: 'camera',
    });
    
    // Verify with second embedding (should not match)
    const verificationResult = await caller.verification.verify({
      imageBase64,
      faceEmbedding: embedding2,
      cameraSource: 'webcam',
      threshold: 0.75,
    });
    
    expect(verificationResult).toBeDefined();
    expect(verificationResult.detectedFaces).toBeGreaterThan(0);
    // Should have no matches or low confidence matches
    const highConfidenceMatches = verificationResult.matches.filter(m => m.confidence > 75);
    expect(highConfidenceMatches).toHaveLength(0);
  });
  
  it('should reject enrollment without face embedding', async () => {
    const caller = appRouter.createCaller(testContext);
    
    const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    
    await expect(
      caller.enrollees.enroll({
        name: 'No',
        surname: 'Embedding',
        imageBase64,
        faceEmbedding: [],
        enrollmentMethod: 'camera',
      })
    ).rejects.toThrow('No face embedding provided');
  });
});
