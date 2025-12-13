import { z } from 'zod';
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import * as db from "./db";
import { findBestMatch, verifyFaces, validateEmbedding } from './faceRecognition';
import { extractSingleFaceEmbedding, extractMultipleFaceEmbeddings, get3DLandmarks } from './pythonFaceService';
import { assessFaceQuality } from './faceQuality';
import { generateVoiceComment, getTimeOfDay, getPreviousComments, getMatchCount, detectFacialExpression } from './speechEngine';
import { textToSpeech, useBrowserTTS } from './textToSpeech';
import { TRPCError } from "@trpc/server";
import { hasPermission, requireAdmin, type UserRole } from './permissions';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './_core/env';

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    register: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        surname: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User with this email already exists',
          });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(input.password, 10);

        // Create user
        const userId = await db.createUser({
          name: `${input.name} ${input.surname}`,
          email: input.email,
          password: hashedPassword,
          loginMethod: 'email',
          role: 'user', // Default role, first user should be manually promoted to admin
        });

        // Generate JWT token
        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return { success: true, userId };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Find user by email
        const user = await db.getUserByEmail(input.email) as any;
        if (!user || !user.password) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(input.password, user.password);
        if (!isValidPassword) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          });
        }

        // Update last signed in
        await db.updateUserLastSignedIn(user.id);

        // Generate JWT token
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    
    completeProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, {
          name: input.name,
          email: input.email || null,
          profileCompleted: true,
        });
        return { success: true };
      }),

    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email);
        
        // Always return success to prevent email enumeration
        if (!user) {
          return { success: true, message: 'If an account exists with this email, a reset link will be sent.' };
        }

        // Generate reset token (random 32-byte hex string)
        const resetToken = require('crypto').randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Save token to database
        await db.updatePasswordResetToken(user.id, resetToken, resetTokenExpiry);

        // In a real app, send email here
        // For now, return the token (in production, this should be sent via email)
        return { 
          success: true, 
          message: 'If an account exists with this email, a reset link will be sent.',
          // TODO: Remove this in production - only for testing
          resetToken: resetToken,
          resetUrl: `/reset-password?token=${resetToken}`
        };
      }),

    verifyResetToken: publicProcedure
      .input(z.object({
        token: z.string(),
      }))
      .query(async ({ input }) => {
        const user = await db.getUserByResetToken(input.token) as any;
        
        if (!user || !user.resetTokenExpiry) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid or expired reset token',
          });
        }

        // Check if token is expired
        if (new Date() > new Date(user.resetTokenExpiry as any)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Reset token has expired',
          });
        }

        return { valid: true, email: user.email };
      }),

    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByResetToken(input.token) as any;
        
        if (!user || !user.resetToken || !user.resetTokenExpiry) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid or expired reset token',
          });
        }

        // Check if token is expired
        if (new Date() > new Date(user.resetTokenExpiry as any)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Reset token has expired',
          });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(input.newPassword, 10);

        // Update password and clear reset token
        await db.updatePassword(user.id, hashedPassword);
        await db.clearPasswordResetToken(user.id);

        return { success: true, message: 'Password has been reset successfully' };
      }),
  }),

  // ============= FACE QUALITY =============
  faceQuality: router({  
    assess: protectedProcedure
      .input(z.object({
        imageBase64: z.string(),
      }))
      .query(async ({ input }) => {
        try {
          const quality = await assessFaceQuality(input.imageBase64);
          return quality;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Quality assessment failed: ${error}`,
          });
        }
      }),
  }),

  // ============= ENROLLEE OPERATIONS =============
  enrollees: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllEnrollees();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getEnrolleeById(input.id);
      }),

    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await db.searchEnrollees(input.query);
      }),

    enroll: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        surname: z.string().min(1),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        instagram: z.string().optional(),
        imageBase64: z.string(),
        faceEmbedding: z.array(z.number()), // Face embedding from MediaPipe Face Mesh
        enrollmentMethod: z.enum(['camera', 'photo', 'mobile']),
        voiceBase64: z.string().optional(), // Base64-encoded audio file
      }))
      .mutation(async ({ input, ctx }) => {
        // Log enrollment data for debugging
        console.log('[Enrollment] Received enrollmentMethod:', input.enrollmentMethod, 'type:', typeof input.enrollmentMethod);
        console.log('[Enrollment] Full input:', JSON.stringify({ ...input, imageBase64: input.imageBase64.substring(0, 50) + '...', voiceBase64: input.voiceBase64?.substring(0, 50) + '...' }));
        
        // Check permission
        if (!hasPermission(ctx.user.role as UserRole, 'canEnroll')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to enroll faces',
          });
        }
        
        // Validate face embedding from frontend
        const faceEmbedding = input.faceEmbedding;
        if (!faceEmbedding || faceEmbedding.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No face embedding provided',
          });
        }
        console.log('[Enrollment] Received face embedding, length:', faceEmbedding.length);

        // Upload image to S3
        const base64Data = input.imageBase64.split(',')[1] || input.imageBase64;
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        const randomSuffix = Math.random().toString(36).substring(7);
        const imageKey = `enrollees/${ctx.user.id}-${Date.now()}-${randomSuffix}.jpg`;
        const { url: imageUrl } = await storagePut(imageKey, imageBuffer, 'image/jpeg');

        // Process voice sample if provided
        let voiceSampleUrl: string | null = null;
        let voiceSampleKey: string | null = null;
        let voiceTranscript: string | null = null;
        
        if (input.voiceBase64) {
          try {
            // Decode base64 audio
            const voiceBase64Data = input.voiceBase64.split(',')[1] || input.voiceBase64;
            const voiceBuffer = Buffer.from(voiceBase64Data, 'base64');
            
            // Upload to S3
            const voiceKey = `enrollees/voice/${ctx.user.id}-${Date.now()}-${randomSuffix}.webm`;
            const { url: voiceUrl } = await storagePut(voiceKey, voiceBuffer, 'audio/webm');
            
            voiceSampleUrl = voiceUrl;
            voiceSampleKey = voiceKey;
            
            // Transcribe audio using Whisper
            try {
              const transcription = await transcribeAudio({
                audioUrl: voiceUrl,
                language: 'en',
              });
              
              // Check if transcription was successful
              if ('error' in transcription) {
                console.error('Failed to transcribe audio:', transcription.error);
                // Continue without transcript - it's optional
              } else {
                voiceTranscript = transcription.text;
              }
            } catch (transcribeError) {
              console.error('Failed to transcribe audio:', transcribeError);
              // Continue without transcript - it's optional
            }
          } catch (voiceError) {
            console.error('Failed to process voice sample:', voiceError);
            // Continue without voice - it's optional
          }
        }

        // Create enrollee
        const enrollee = await db.createEnrollee({
          name: input.name,
          surname: input.surname,
          email: input.email || null,
          phone: input.phone || null,
          address: input.address || null,
          instagram: input.instagram || null,
          faceImageUrl: imageUrl,
          faceImageKey: imageKey,
          thumbnailUrl: imageUrl,
          faceEmbedding: JSON.stringify(faceEmbedding),
          enrollmentMethod: input.enrollmentMethod,
          enrolledBy: ctx.user.id,
          voiceSampleUrl,
          voiceSampleKey,
          voiceTranscript,
        });

        // Log event
        await db.createEvent({
          userId: ctx.user.id,
          eventType: 'enrollment',
          title: `New enrollment: ${input.name} ${input.surname}`,
          description: `Enrolled via ${input.enrollmentMethod}`,
          enrolleeId: enrollee.id,
          imageUrl,
          cameraSource: input.enrollmentMethod,
        });

        return enrollee;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        surname: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        instagram: z.string().optional(),
        faceImageUrl: z.string().optional(), // Base64 data URL for new photo
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission
        if (!hasPermission(ctx.user.role as UserRole, 'canEditEnrollee')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to edit enrollees',
          });
        }
        
        const { id, faceImageUrl, ...updateData } = input;
        
        // If photo is being updated, process it
        if (faceImageUrl && faceImageUrl.startsWith('data:image')) {
          try {
            // Get existing enrollee to delete old photo
            const enrollee = await db.getEnrolleeById(id);
            
            // Extract face embedding from new photo
            const base64Data = faceImageUrl.split(',')[1];
            const buffer = Buffer.from(base64Data!, 'base64');
            
            // Upload new photo to S3
            const fileKey = `enrollees/${id}-${Date.now()}.jpg`;
            const { url: newImageUrl } = await storagePut(fileKey, buffer, 'image/jpeg');
            
            // Update with new photo URL
            await db.updateEnrollee(id, {
              ...updateData,
              faceImageUrl: newImageUrl,
            });
            
            // TODO: Re-extract face embedding and update in database
            // This would require face recognition library on backend
            
            return { success: true, imageUrl: newImageUrl };
          } catch (error) {
            console.error('Failed to process photo update:', error);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to process photo update',
            });
          }
        } else {
          // No photo update, just update other fields
          await db.updateEnrollee(id, updateData);
          return { success: true };
        }
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Check permission
        if (!hasPermission(ctx.user.role as UserRole, 'canDeleteEnrollee')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete enrollees',
          });
        }
        
        await db.deleteEnrollee(input.id);
        return { success: true };
      }),

    deleteAll: protectedProcedure
      .mutation(async ({ ctx }) => {
        // Check permission - only admins can delete all
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only administrators can delete all enrollees',
          });
        }
        
        await db.deleteAllEnrollees();
        
        // Log event
        await db.createEvent({
          userId: ctx.user.id,
          eventType: 'system',
          title: 'All enrollees deleted',
          description: `Admin ${ctx.user.name} deleted all enrollees from the system`,
          cameraSource: 'system',
        });
        
        return { success: true };
      }),
  }),

  // ============= VERIFICATION =============
  verification: router({
    verify: protectedProcedure
      .input(z.object({
        imageBase64: z.string(),
        faceEmbedding: z.array(z.number()), // Face embedding from MediaPipe Face Mesh
        cameraSource: z.string(),
        threshold: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check permission
        if (!hasPermission(ctx.user.role as UserRole, 'canVerify')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to verify faces',
          });
        }
        
        // Validate face embedding from frontend
        if (!input.faceEmbedding || input.faceEmbedding.length === 0) {
          await db.createEvent({
            userId: 1, // System user
            eventType: 'no_match',
            title: 'No face detected',
            description: 'Verification attempted but no face was detected',
            cameraSource: input.cameraSource,
          });
          
          return {
            detectedFaces: 0,
            matches: [],
          };
        }
        
        const faceEmbeddings = [input.faceEmbedding]; // Single face for now

        // Get all enrolled faces
        const enrollees = await db.getAllEnrollees();
        const enrolledFaces = enrollees.map(e => ({
          id: e.id,
          embedding: typeof e.faceEmbedding === 'string' ? JSON.parse(e.faceEmbedding) : e.faceEmbedding,
          name: e.name,
          surname: e.surname,
          voiceSampleUrl: e.voiceSampleUrl,
          voiceTranscript: e.voiceTranscript,
          photoUrl: e.faceImageUrl,
          email: e.email,
        }));

        // Verify faces
        const result = verifyFaces(
          faceEmbeddings,
          enrolledFaces,
          input.threshold || 0.6
        );

        // Log verification events and generate voice comments
        for (const match of result.matches) {
          // Generate personality-driven voice comment
          const matchCount = await getMatchCount(match.enrolleeId);
          const previousComments = await getPreviousComments(match.enrolleeId, 3);
          const facialExpression = detectFacialExpression();
          const timeOfDay = getTimeOfDay();
          
          const voiceComment = await generateVoiceComment({
            enrolleeName: match.name.split(' ')[0], // Use first name only
            matchCount,
            facialExpression,
            timeOfDay,
            confidence: match.confidence,
            previousComments,
          });
          
          // Generate speech audio (if ElevenLabs is configured)
          let audioUrl: string | undefined;
          let audioKey: string | undefined;
          
          if (!useBrowserTTS()) {
            try {
              const tts = await textToSpeech({ text: voiceComment });
              audioUrl = tts.audioUrl;
              audioKey = tts.audioKey;
            } catch (error) {
              console.error('[Verification] TTS failed, will use browser TTS:', error);
            }
          }
          
        await db.createRecognitionLog({
            enrolleeId: match.enrolleeId,
            matchConfidence: match.confidence,
            snapshotUrl: '',
            snapshotKey: '',
            matched: true,
            voiceComment,
            facialExpression,
            matchCount,
            verifiedBy: 1, // System user
            cameraSource: input.cameraSource,
            detectedFaces: 1,
          } as any);
          
          // Add voice comment and audio URL to match result
          (match as any).voiceComment = voiceComment;
          (match as any).audioUrl = audioUrl;
          (match as any).useBrowserTTS = useBrowserTTS();
          
          await db.createEvent({
            userId: 1, // System user
            eventType: 'match',
            title: `Match found: ${match.name} ${match.surname}`,
            description: `Confidence: ${match.confidence}% | Comment: "${voiceComment}"`,
            cameraSource: input.cameraSource,
            enrolleeId: match.enrolleeId,
          });
        }

        if (result.matches.length === 0 && result.detectedFaces > 0) {
          await db.createEvent({
            userId: 1, // System user
            eventType: 'no_match',
            title: 'No match found',
            description: `${result.detectedFaces} face(s) detected but no match in database`,
            cameraSource: input.cameraSource,
          });
        }

        return result;
      }),
    
    // Get 3D landmarks for visualization (public for real-time camera feed)
    getLandmarks: publicProcedure
      .input(z.object({
        imageBase64: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          console.log('[getLandmarks] Received request, image size:', input.imageBase64.length);
          const landmarks = await get3DLandmarks(input.imageBase64);
          console.log('[getLandmarks] Got landmarks:', landmarks.length, 'faces');
          if (landmarks.length > 0) {
            console.log('[getLandmarks] First face has', landmarks[0].landmarks.length, 'landmarks');
          }
          return { landmarks };
        } catch (error: any) {
          console.error('[getLandmarks] Error:', error.message);
          return { landmarks: [], error: error.message };
        }
      }),
  }),

  // ============= RECOGNITION LOGS =============
  recognitionLogs: router({
    list: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        enrolleeId: z.number().optional(),
        matched: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getRecognitionLogs(input);
      }),

    byEnrollee: protectedProcedure
      .input(z.object({ enrolleeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRecognitionLogById(input.enrolleeId);
      }),
  }),

  // ============= ANALYTICS =============
  analytics: router({
    enrollmentStats: protectedProcedure.query(async () => {
      return await db.getEnrolleeStats();
    }),

    verificationStats: protectedProcedure.query(async () => {
      return await db.getVerificationStats();
    }),
  }),

  // ============= EVENTS =============
  events: router({
    list: protectedProcedure
      .input(z.object({
        eventType: z.enum(['enrollment', 'match', 'no_match', 'system']).optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getEvents({ eventType: input.eventType, limit: input.limit });
      }),
  }),

  // ============= SETTINGS =============
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserSettings(ctx.user.id);
    }),

    update: protectedProcedure
      .input(z.object({
        llmProvider: z.string().optional(),
        llmApiKey: z.string().optional(),
        llmModel: z.string().optional(),
        llmTemperature: z.number().optional(),
        llmMaxTokens: z.number().optional(),
        llmSystemPrompt: z.string().optional(),
        voiceLanguage: z.enum(['en', 'ja']).optional(),
        voiceEngine: z.string().optional(),
        voiceApiKey: z.string().optional(),
        voiceInputSensitivity: z.number().optional(),
        voiceOutputSpeed: z.number().optional(),
        voiceOutputStyle: z.string().optional(),
        matchThreshold: z.number().optional(),
        minFaceSize: z.number().optional(),
        faceTrackingSmoothing: z.number().optional(),
        multiFaceMatch: z.boolean().optional(),
        databaseStorageLocation: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check permission
        if (!hasPermission(ctx.user.role as UserRole, 'canEditSettings')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to edit settings',
          });
        }
        
        await db.upsertSettings(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ============= CHAT =============
  chat: router({
    message: protectedProcedure
      .input(z.object({
        message: z.string(),
        language: z.enum(['en', 'ja']).optional(),
        context: z.object({
          currentPage: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const settings = await db.getUserSettings(ctx.user.id);
        
        const systemPrompt = settings?.llmSystemPrompt || 
          (input.language === 'ja' 
            ? 'あなたはAyonix顔認識システムのAIアシスタントです。ユーザーの質問に親切に答え、システムの使い方を説明してください。'
            : 'You are an AI assistant for the Ayonix Face Recognition System. Help users with questions and explain how to use the system.');

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input.message },
          ],
        });

        return {
          response: response.choices[0]?.message?.content || 'Sorry, I could not generate a response.',
        };
      }),
  }),

  // ============= VOICE =============
  voice: router({
    uploadAudio: protectedProcedure
      .input(z.object({
        audioBase64: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const base64Data = input.audioBase64.split(',')[1] || input.audioBase64;
        const audioBuffer = Buffer.from(base64Data, 'base64');
        
        const randomSuffix = Math.random().toString(36).substring(7);
        const audioKey = `voice/${ctx.user.id}-${Date.now()}-${randomSuffix}.webm`;
        const { url: audioUrl } = await storagePut(audioKey, audioBuffer, 'audio/webm');
        
        return { url: audioUrl };
      }),
    
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string(),
        language: z.enum(['en', 'ja']).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language,
        });
        
        if ('error' in result) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: result.error,
          });
        }
        
        return result;
      }),
  }),

  // ============= SIMILARITY SEARCH =============
  similarity: router({
    findSimilar: protectedProcedure
      .input(z.object({
        enrolleeId: z.number(),
        threshold: z.number().min(0).max(1).default(0.85),
      }))
      .query(async ({ input }) => {
        const enrollee = await db.getEnrolleeById(input.enrolleeId);
        if (!enrollee || !enrollee.faceEmbedding) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Enrollee not found or no face embedding' });
        }
        
        const targetEmbedding = JSON.parse(enrollee.faceEmbedding as string);
        const similarFaces = await db.findSimilarFaces(targetEmbedding, input.threshold);
        
        // Exclude the target enrollee from results
        return similarFaces.filter((f: any) => f.id !== input.enrolleeId);
      }),
    
    checkDuplicates: protectedProcedure
      .input(z.object({
        faceEmbedding: z.array(z.number()),
        threshold: z.number().min(0).max(1).default(0.90),
      }))
      .query(async ({ input }) => {
        const similarFaces = await db.findSimilarFaces(input.faceEmbedding, input.threshold);
        return similarFaces;
      }),
  }),

  // ============= USER MANAGEMENT =============
  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Only admins can list users
      if (!hasPermission(ctx.user.role as UserRole, 'canViewUsers')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view users',
        });
      }
      return await db.getAllUsers();
    }),

    updateRole: protectedProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(['admin', 'user']),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only admins can change user roles
        if (!hasPermission(ctx.user.role as UserRole, 'canChangeUserRoles')) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to change user roles',
          });
        }
        
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
