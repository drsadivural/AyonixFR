import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import * as db from "./db";
import { extractFaceEmbedding, verifyFace } from "./faceRecognition";

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
        enrollmentMethod: z.enum(['camera', 'photo', 'mobile']),
      }))
      .mutation(async ({ input, ctx }) => {
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(input.imageBase64.split(',')[1] || input.imageBase64, 'base64');
        
        // Extract face embedding
        const faceData = await extractFaceEmbedding(imageBuffer);
        if (!faceData) {
          throw new Error('No face detected in the image');
        }
        
        // Upload image to S3
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const imageKey = `enrollees/${ctx.user.id}-${timestamp}-${randomSuffix}.jpg`;
        const thumbnailKey = `enrollees/thumb-${ctx.user.id}-${timestamp}-${randomSuffix}.jpg`;
        
        const { url: imageUrl } = await storagePut(imageKey, imageBuffer, 'image/jpeg');
        const { url: thumbnailUrl } = await storagePut(thumbnailKey, imageBuffer, 'image/jpeg');
        
        // Create enrollee record
        const enrollee = await db.createEnrollee({
          name: input.name,
          surname: input.surname,
          email: input.email || null,
          phone: input.phone || null,
          address: input.address || null,
          instagram: input.instagram || null,
          faceImageUrl: imageUrl,
          faceImageKey: imageKey,
          thumbnailUrl,
          faceEmbedding: faceData.embedding,
          enrollmentMethod: input.enrollmentMethod,
          enrolledBy: ctx.user.id,
        });
        
        // Create event
        await db.createEvent({
          eventType: 'enrollment',
          title: `New enrollment: ${input.name} ${input.surname}`,
          description: `Enrolled via ${input.enrollmentMethod}`,
          enrolleeId: enrollee.id,
          recognitionLogId: null,
          imageUrl: thumbnailUrl,
          cameraSource: input.enrollmentMethod,
          userId: ctx.user.id,
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
        const { id, ...data } = input;
        await db.updateEnrollee(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteEnrollee(input.id);
        return { success: true };
      }),
  }),

  // ============= VERIFICATION OPERATIONS =============
  verification: router({
    verify: protectedProcedure
      .input(z.object({
        imageBase64: z.string(),
        cameraSource: z.string(),
        threshold: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(input.imageBase64.split(',')[1] || input.imageBase64, 'base64');
        
        // Get all enrolled faces
        const enrollees = await db.getAllEnrollees();
        const enrolledFaces = enrollees.map(e => ({
          id: e.id,
          embedding: e.faceEmbedding as number[],
          name: e.name,
          surname: e.surname,
        }));
        
        // Get user settings for threshold
        const settings = await db.getUserSettings(ctx.user.id);
        const threshold = input.threshold || (settings?.matchThreshold || 75) / 100;
        
        // Verify face
        const result = await verifyFace(imageBuffer, enrolledFaces, threshold);
        
        // Upload snapshot to S3
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const snapshotKey = `verifications/${ctx.user.id}-${timestamp}-${randomSuffix}.jpg`;
        const { url: snapshotUrl } = await storagePut(snapshotKey, imageBuffer, 'image/jpeg');
        
        // Create recognition logs for each match (or one for no match)
        const logs = [];
        
        if (result.matches.length > 0) {
          for (const match of result.matches) {
            const log = await db.createRecognitionLog({
              enrolleeId: match.enrolleeId,
              matchConfidence: match.confidence,
              snapshotUrl,
              snapshotKey,
              cameraSource: input.cameraSource,
              detectedFaces: result.detectedFaces,
              matched: true,
              verifiedBy: ctx.user.id,
            });
            
            // Create match event
            await db.createEvent({
              eventType: 'match',
              title: `Match found: ${match.name} ${match.surname}`,
              description: `Confidence: ${match.confidence}%`,
              enrolleeId: match.enrolleeId,
              recognitionLogId: log.id,
              imageUrl: snapshotUrl,
              cameraSource: input.cameraSource,
              userId: ctx.user.id,
            });
            
            logs.push(log);
          }
        } else {
          const log = await db.createRecognitionLog({
            enrolleeId: null,
            matchConfidence: null,
            snapshotUrl,
            snapshotKey,
            cameraSource: input.cameraSource,
            detectedFaces: result.detectedFaces,
            matched: false,
            verifiedBy: ctx.user.id,
          });
          
          // Create no match event
          await db.createEvent({
            eventType: 'no_match',
            title: 'No match found',
            description: `Detected ${result.detectedFaces} face(s), but no match in database`,
            enrolleeId: null,
            recognitionLogId: log.id,
            imageUrl: snapshotUrl,
            cameraSource: input.cameraSource,
            userId: ctx.user.id,
          });
          
          logs.push(log);
        }
        
        return {
          detectedFaces: result.detectedFaces,
          matches: result.matches,
          snapshotUrl,
          logs,
        };
      }),

    logs: protectedProcedure
      .input(z.object({
        enrolleeId: z.number().optional(),
        matched: z.boolean().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getRecognitionLogs(input);
      }),
  }),

  // ============= EVENTS =============
  events: router({
    list: protectedProcedure
      .input(z.object({
        eventType: z.enum(['enrollment', 'match', 'no_match', 'system']).optional(),
        enrolleeId: z.number().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        return await db.getEvents({
          ...input,
          userId: ctx.user.id,
        });
      }),
  }),

  // ============= SETTINGS =============
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const settings = await db.getUserSettings(ctx.user.id);
      if (!settings) {
        // Return default settings
        return {
          userId: ctx.user.id,
          llmProvider: 'openai',
          llmModel: null,
          llmTemperature: 70,
          llmMaxTokens: 2000,
          llmSystemPrompt: null,
          voiceLanguage: 'en',
          voiceEngine: 'whisper',
          voiceInputSensitivity: 50,
          voiceOutputSpeed: 100,
          voiceOutputStyle: 'conversational',
          matchThreshold: 75,
          minFaceSize: 80,
          faceTrackingSmoothing: 50,
          multiFaceMatch: true,
        };
      }
      return settings;
    }),

    update: protectedProcedure
      .input(z.object({
        llmProvider: z.string().optional(),
        llmApiKey: z.string().optional(),
        llmModel: z.string().optional(),
        llmTemperature: z.number().optional(),
        llmMaxTokens: z.number().optional(),
        llmSystemPrompt: z.string().optional(),
        voiceLanguage: z.string().optional(),
        voiceEngine: z.string().optional(),
        voiceApiKey: z.string().optional(),
        voiceInputSensitivity: z.number().optional(),
        voiceOutputSpeed: z.number().optional(),
        voiceOutputStyle: z.string().optional(),
        matchThreshold: z.number().optional(),
        minFaceSize: z.number().optional(),
        faceTrackingSmoothing: z.number().optional(),
        multiFaceMatch: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.upsertSettings(ctx.user.id, input);
      }),
  }),

  // ============= ANALYTICS =============
  analytics: router({
    dashboard: protectedProcedure.query(async () => {
      const [enrolleeStats, verificationStats] = await Promise.all([
        db.getEnrolleeStats(),
        db.getVerificationStats(),
      ]);
      
      return {
        enrollees: enrolleeStats,
        verifications: verificationStats,
      };
    }),
  }),

  // ============= LLM CHAT =============
  chat: router({
    message: protectedProcedure
      .input(z.object({
        message: z.string(),
        language: z.enum(['en', 'ja']),
        context: z.object({
          currentPage: z.string().optional(),
          recentMatches: z.array(z.any()).optional(),
        }).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const settings = await db.getUserSettings(ctx.user.id);
        
        const systemPrompt = settings?.llmSystemPrompt || 
          (input.language === 'ja' 
            ? `あなたはAyonix顔認識システムのAIアシスタントです。ユーザーの質問に答え、システムの使用をサポートします。フレンドリーで会話的なトーンで応答してください。`
            : `You are an AI assistant for the Ayonix Face Recognition System. Help users with questions and system usage in a friendly, conversational tone.`);
        
        const response = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input.message },
          ],
          max_tokens: settings?.llmMaxTokens || 2000,
        });
        
        return {
          response: response.choices[0]?.message?.content || 'No response',
        };
      }),
  }),

  // ============= VOICE TRANSCRIPTION =============
  voice: router({
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string(),
        language: z.enum(['en', 'ja']),
      }))
      .mutation(async ({ input }) => {
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language,
        });
        
        if ('error' in result) {
          throw new Error(result.error);
        }
        
        return {
          text: result.text,
          language: result.language,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
