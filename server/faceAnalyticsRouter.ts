/**
 * Face Analytics Router
 * Integrates with InsightFace analytics service for age, gender, expression, race detection
 */

import { router, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import axios from 'axios';

const FACE_ANALYTICS_SERVICE_URL = process.env.FACE_ANALYTICS_SERVICE_URL || 'http://localhost:5001';

export const faceAnalyticsRouter = router({
  /**
   * Analyze face with demographics (age, gender, expression, race)
   */
  analyzeFace: publicProcedure
    .input(z.object({
      imageBase64: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const response = await axios.post(`${FACE_ANALYTICS_SERVICE_URL}/analyze_face`, {
          image: input.imageBase64,
        }, {
          timeout: 30000, // 30 second timeout
        });

        if (!response.data.success) {
          throw new Error(response.data.error || 'Face analysis failed');
        }

        return {
          success: true,
          faces: response.data.faces,
        };
      } catch (error) {
        console.error('[FaceAnalytics] Analysis error:', error);
        
        // If service is not available, return graceful degradation
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          return {
            success: false,
            error: 'Face analytics service unavailable. Please ensure the Python service is running on port 5001.',
            faces: [],
          };
        }

        throw error;
      }
    }),

  /**
   * Count people in image using YOLO
   */
  countPeople: publicProcedure
    .input(z.object({
      imageBase64: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const response = await axios.post(`${FACE_ANALYTICS_SERVICE_URL}/count_people`, {
          image: input.imageBase64,
        }, {
          timeout: 30000,
        });

        if (!response.data.success) {
          throw new Error(response.data.error || 'People counting failed');
        }

        return {
          success: true,
          count: response.data.count,
          detections: response.data.detections,
        };
      } catch (error) {
        console.error('[FaceAnalytics] People counting error:', error);
        
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          return {
            success: false,
            error: 'Face analytics service unavailable',
            count: 0,
            detections: [],
          };
        }

        throw error;
      }
    }),

  /**
   * Extract ArcFace embedding (alternative to MediaPipe)
   */
  extractEmbedding: publicProcedure
    .input(z.object({
      imageBase64: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const response = await axios.post(`${FACE_ANALYTICS_SERVICE_URL}/extract_embedding`, {
          image: input.imageBase64,
        }, {
          timeout: 30000,
        });

        if (!response.data.success) {
          throw new Error(response.data.error || 'Embedding extraction failed');
        }

        return {
          success: true,
          embedding: response.data.embedding,
        };
      } catch (error) {
        console.error('[FaceAnalytics] Embedding extraction error:', error);
        
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
          return {
            success: false,
            error: 'Face analytics service unavailable',
            embedding: null,
          };
        }

        throw error;
      }
    }),

  /**
   * Health check for face analytics service
   */
  healthCheck: publicProcedure
    .query(async () => {
      try {
        const response = await axios.get(`${FACE_ANALYTICS_SERVICE_URL}/health`, {
          timeout: 5000,
        });

        return {
          available: true,
          status: response.data.status,
          service: response.data.service,
        };
      } catch (error) {
        return {
          available: false,
          error: 'Service not reachable',
        };
      }
    }),
});
