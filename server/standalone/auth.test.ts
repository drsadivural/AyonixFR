import { describe, it, expect } from 'vitest';
import { 
  hashPassword, 
  verifyPassword, 
  generateTokens, 
  verifyToken,
  validatePassword,
  validateEmail 
} from './auth';

describe('Standalone Authentication', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Tokens', () => {
    it('should generate access and refresh tokens', () => {
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'user' as const,
      };
      
      const tokens = generateTokens(payload);
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.accessToken.length).toBeGreaterThan(0);
      expect(tokens.refreshToken.length).toBeGreaterThan(0);
    });

    it('should verify and decode valid token', () => {
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'user' as const,
      };
      
      const tokens = generateTokens(payload);
      const decoded = verifyToken(tokens.accessToken);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => verifyToken(invalidToken)).toThrow();
    });
  });

  describe('Password Validation', () => {
    it('should accept valid password', () => {
      const result = validatePassword('validPass123');
      expect(result.valid).toBe(true);
    });

    it('should reject too short password', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 6 characters');
    });
  });

  describe('Email Validation', () => {
    it('should accept valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('invalid@example')).toBe(false);
    });
  });
});
