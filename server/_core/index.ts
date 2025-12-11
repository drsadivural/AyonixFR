import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { passport } from "../googleAuth";
import jwt from 'jsonwebtoken';
import { ENV } from './env';
import * as db from '../db';
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Initialize Passport
  app.use(passport.initialize());
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Google OAuth routes
  app.get('/api/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  }));
  
  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!user) {
          return res.redirect('/login?error=auth_failed');
        }
        
        // Create JWT token
        const token = jwt.sign({ userId: user.id }, ENV.cookieSecret, { expiresIn: '7d' });
        
        // Set cookie
        res.cookie('session', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        
        // Redirect to dashboard
        res.redirect('/');
      } catch (error) {
        console.error('[Google OAuth] Callback error:', error);
        res.redirect('/login?error=server_error');
      }
    }
  );
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
