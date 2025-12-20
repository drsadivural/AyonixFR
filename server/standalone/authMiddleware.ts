import { TRPCError } from '@trpc/server';
import { verifyToken, extractTokenFromHeader } from './auth';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Standalone authentication middleware for tRPC
 * Replaces Manus OAuth authentication
 */
export async function standaloneAuthMiddleware(req: any) {
  const authHeader = req.headers?.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return { user: null };
  }

  try {
    // Verify JWT token
    const payload = verifyToken(token);

    // Fetch user from database
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database connection failed',
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not found',
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname || '',
        role: user.role as 'admin' | 'user',
        openId: user.openId || undefined,
      },
    };
  } catch (error) {
    // Token verification failed
    return { user: null };
  }
}
