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
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
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
        enrollmentMethod: z.enum(['camera', 'photo', 'mobile']),
      }))
      .mutation(async ({ input, ctx }) => {
        // Extract face embedding using Python service with MediaPipe
        let faceEmbedding: number[];
        try {
          faceEmbedding = await extractSingleFaceEmbedding(input.imageBase64);
        } catch (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Failed to detect face in image. Please ensure the image contains a clear, frontal face.',
          });
        }

        // Upload image to S3
        const base64Data = input.imageBase64.split(',')[1] || input.imageBase64;
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        const randomSuffix = Math.random().toString(36).substring(7);
        const imageKey = `enrollees/${ctx.user.id}-${Date.now()}-${randomSuffix}.jpg`;
        const { url: imageUrl } = await storagePut(imageKey, imageBuffer, 'image/jpeg');

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
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateEnrollee(id, updateData);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteEnrollee(input.id);
        return { success: true };
      }),
  }),

  // ============= VERIFICATION =============
  verification: router({
    verify: protectedProcedure
      .input(z.object({
        imageBase64: z.string(),
        cameraSource: z.string(),
        threshold: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // Extract face embeddings using Python service with MediaPipe
        let faceEmbeddings: number[][];
        try {
          faceEmbeddings = await extractMultipleFaceEmbeddings(input.imageBase64);
        } catch (error) {
          console.error('Face extraction error:', error);
          faceEmbeddings = [];
        }

        if (faceEmbeddings.length === 0) {
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

        // Get all enrolled faces
        const enrollees = await db.getAllEnrollees();
        const enrolledFaces = enrollees.map(e => ({
          id: e.id,
          embedding: typeof e.faceEmbedding === 'string' ? JSON.parse(e.faceEmbedding) : e.faceEmbedding,
          name: e.name,
          surname: e.surname,
        }));

        // Verify faces
        const result = verifyFaces(
          faceEmbeddings,
          enrolledFaces,
          input.threshold || 0.6
        );

        // Log verification events
        for (const match of result.matches) {
          await db.createRecognitionLog({
            enrolleeId: match.enrolleeId,
            matchConfidence: match.confidence,
            snapshotUrl: '',
            snapshotKey: '',
            matched: true,
            verifiedBy: 1, // System user
            cameraSource: input.cameraSource,
            detectedFaces: result.detectedFaces,
          });
          
          await db.createEvent({
            userId: 1, // System user
            eventType: 'match',
            title: `Match found: ${match.name} ${match.surname}`,
            description: `Confidence: ${match.confidence}%`,
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
    
    // Get 3D landmarks for visualization
    getLandmarks: protectedProcedure
      .input(z.object({
        imageBase64: z.string(),
      }))
      .query(async ({ input }) => {
        try {
          const landmarks = await get3DLandmarks(input.imageBase64);
          return { landmarks };
        } catch (error) {
          return { landmarks: [] };
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
});

export type AppRouter = typeof appRouter;
