import { z } from "zod";
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
        enrollmentMethod: z.enum(['camera', 'upload', 'mobile']),
      }))
      .mutation(async ({ ctx, input }) => {
        // Extract face embedding using Python service with MediaPipe
        let faceEmbedding: number[];
        try {
          faceEmbedding = await extractSingleFaceEmbedding(input.imageBase64);
        } catch (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error instanceof Error ? error.message : 'Failed to extract face embedding',
          });
        }

        // Upload image to S3
        const imageBuffer = Buffer.from(
          input.imageBase64.split(',')[1] || input.imageBase64,
          'base64'
        );
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const imageKey = `faces/${ctx.user.id}/${uniqueId}.jpg`;
        
        const { url: imageUrl } = await storagePut(imageKey, imageBuffer, 'image/jpeg');

        // Create enrollee
        const enrollee = await db.createEnrollee({
          name: input.name,
          surname: input.surname,
          email: input.email,
          phone: input.phone,
          address: input.address,
          instagram: input.instagram,
          faceImageUrl: imageUrl,
          faceImageKey: imageKey,
          thumbnailUrl: imageUrl,
          faceEmbedding: faceEmbedding as any,
          enrollmentMethod: input.enrollmentMethod,
          enrolledBy: ctx.user.id,
        });

        // Log event
        await db.createEvent({
          userId: ctx.user.id,
          eventType: 'enrollment',
          title: `New enrollment: ${input.name} ${input.surname}`,
          description: `Enrolled via ${input.enrollmentMethod}`,
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
        return await db.updateEnrollee(input.id, input);
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
            cameraSource: input.cameraSource,
            detectedFaces: result.detectedFaces,
            verifiedBy: 1, // System user
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
          return landmarks;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to extract landmarks',
          });
        }
      }),
  }),

  // ============= ANALYTICS =============
  analytics: router({
    dashboard: protectedProcedure.query(async () => {
      const enrollees = await db.getAllEnrollees();
      const logs = await db.getRecognitionLogs();
      
      const now = new Date();
      const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const enrolleesThisWeek = enrollees.filter(e => new Date(e.createdAt) >= thisWeekStart).length;
      const enrolleesThisMonth = enrollees.filter(e => new Date(e.createdAt) >= thisMonthStart).length;

      const matches = logs.filter((l: any) => l.matched).length;
      const noMatches = logs.length - matches;
      const successRate = logs.length > 0 ? Math.round((matches / logs.length) * 100) : 0;

      return {
        enrollees: {
          total: enrollees.length,
          thisWeek: enrolleesThisWeek,
          thisMonth: enrolleesThisMonth,
        },
        verifications: {
          total: logs.length,
          matches,
          noMatches,
          successRate,
        },
      };
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
        llmModel: z.string().optional(),
        llmTemperature: z.number().optional(),
        llmMaxTokens: z.number().optional(),
        llmSystemPrompt: z.string().optional(),
        voiceLanguage: z.string().optional(),
        voiceEngine: z.string().optional(),
        voiceInputSensitivity: z.number().optional(),
        voiceOutputSpeed: z.number().optional(),
        voiceOutputStyle: z.string().optional(),
        matchThreshold: z.number().optional(),
        minFaceSize: z.number().optional(),
        faceTrackingSmoothing: z.number().optional(),
        multiFaceMatch: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.upsertSettings(ctx.user.id, input);
      }),
  }),

  // ============= CHAT =============
  chat: router({
    message: protectedProcedure
      .input(z.object({
        message: z.string(),
        language: z.enum(['en', 'ja']),
        context: z.object({
          currentPage: z.string().optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const settings = await db.getUserSettings(ctx.user.id);
        
        const systemPrompt = settings?.llmSystemPrompt || 
          (input.language === 'ja' 
            ? 'あなたはAyonix顔認識システムのAIアシスタントです。ユーザーの質問に親切に答え、システムの使い方を説明してください。'
            : 'You are an AI assistant for the Ayonix Face Recognition System. Help users with questions about enrollment, verification, and system usage in a friendly, conversational tone.');

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input.message },
          ],
        });

        const content = response.choices[0]?.message?.content || 'Sorry, I could not process your request.';
        
        return {
          response: typeof content === 'string' ? content : JSON.stringify(content),
        };
      }),
  }),

  // ============= VOICE =============
  voice: router({
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
        
        return {
          text: result.text,
          language: result.language,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
