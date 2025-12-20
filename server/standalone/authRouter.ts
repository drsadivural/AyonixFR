import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { 
  hashPassword, 
  verifyPassword, 
  generateTokens, 
  verifyToken,
  validatePassword,
  validateEmail 
} from './auth';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export const standaloneAuthRouter = router({
  /**
   * Register a new user
   */
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(1),
      surname: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        });
      }

      // Validate email format
      if (!validateEmail(input.email)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid email format',
        });
      }

      // Validate password strength
      const passwordValidation = validatePassword(input.password);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: passwordValidation.message || 'Invalid password',
        });
      }

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      // Hash password
      const passwordHash = await hashPassword(input.password);

      // Create user
      const result = await db
        .insert(users)
        .values({
          email: input.email,
          password: passwordHash,
          name: input.name,
          surname: input.surname || '',
          role: 'user', // Default role
          loginMethod: 'email',
          profileCompleted: true,
          createdAt: new Date(),
        });

      // Get the inserted user
      const [newUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!newUser) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user',
        });
      }

      // Generate tokens
      const tokens = generateTokens({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role as 'admin' | 'user',
      });

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          surname: newUser.surname || '',
          role: newUser.role,
        },
        ...tokens,
      };
    }),

  /**
   * Login with email and password
   */
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        });
      }

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user || !user.password) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Verify password
      const isValidPassword = await verifyPassword(input.password, user.password);
      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // Generate tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role as 'admin' | 'user',
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          surname: user.surname || '',
          role: user.role,
        },
        ...tokens,
      };
    }),

  /**
   * Refresh access token
   */
  refresh: publicProcedure
    .input(z.object({
      refreshToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Verify refresh token
      const payload = verifyToken(input.refreshToken);

      // Generate new tokens
      const tokens = generateTokens(payload);

      return tokens;
    }),

  /**
   * Get current user
   */
  me: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        surname: ctx.user.surname || '',
        role: ctx.user.role,
      };
    }),

  /**
   * Logout (client-side token removal)
   */
  logout: protectedProcedure
    .mutation(async () => {
      // In a JWT-based system, logout is primarily client-side
      // (removing tokens from storage)
      // Optionally, implement token blacklisting here
      return { success: true };
    }),
});
