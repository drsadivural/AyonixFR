/**
 * Google OAuth Authentication
 */
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as db from './db';
import { ENV } from './_core/env';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';

// Initialize Google OAuth strategy
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract user info from Google profile
          const email = profile.emails?.[0]?.value || '';
          const fullName = profile.displayName || profile.name?.givenName || '';
          const googleId = profile.id;

          // Check if user exists by email
          let user = await db.getUserByEmail(email);

          if (!user) {
            // Create new user
            const newUser = await db.createUser({
              name: fullName,
              email,
              password: '', // No password for OAuth users
              role: 'user', // Default role
              loginMethod: 'google',
            });
            user = newUser as any;
          } else {
            // Update last signed in
            await db.updateUserLastSignedIn(user.id);
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
} else {
  console.warn('[Google OAuth] Client ID or Secret not configured. Google login will not be available.');
}

// Serialize/deserialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await db.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export { passport };
