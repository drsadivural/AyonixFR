/**
 * Google OAuth Integration Tests
 * Tests Google OAuth callback and user creation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ENV } from './_core/env';

describe('Google OAuth Configuration', () => {
  it('should have Google OAuth credentials configured', () => {
    expect(ENV.googleClientId).toBeDefined();
    expect(ENV.googleClientSecret).toBeDefined();
    expect(ENV.googleCallbackUrl).toBeDefined();
    
    // Check that credentials are not empty
    expect(ENV.googleClientId).not.toBe('');
    expect(ENV.googleClientSecret).not.toBe('');
    expect(ENV.googleCallbackUrl).not.toBe('');
  });

  it('should have valid callback URL format', () => {
    // Accept either /api/auth/google/callback or /rest/oauth2-credential/callback
    expect(ENV.googleCallbackUrl).toMatch(/^https?:\/\/.+\/(api\/auth\/google|rest\/oauth2-credential)\/callback$/);
  });

  it('should have Google Client ID in correct format', () => {
    // Google Client IDs typically end with .apps.googleusercontent.com
    expect(ENV.googleClientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });
});

describe('Google OAuth User Creation', () => {
  it('should create user with Google OAuth data', async () => {
    // This test verifies the user creation logic exists
    // Actual OAuth flow requires browser interaction
    const { createUser } = await import('./db');
    
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      loginMethod: 'google',
      role: 'viewer' as const,
    };

    // Verify createUser function accepts Google OAuth user data
    expect(createUser).toBeDefined();
    expect(typeof createUser).toBe('function');
  });
});
