/**
 * Voice Identification Service
 * Uses voice embeddings to identify speakers
 */

export interface VoiceProfile {
  userId: string;
  userName: string;
  voiceEmbedding: number[];
  createdAt: Date;
}

export interface VoiceIdentificationResult {
  userId: string | null;
  userName: string | null;
  confidence: number;
  isIdentified: boolean;
}

export class VoiceIdentificationService {
  private profiles: VoiceProfile[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Extract voice features from audio data
   * This is a simplified implementation - in production, use a proper voice embedding model
   */
  async extractVoiceFeatures(audioData: Float32Array): Promise<number[]> {
    // Simplified feature extraction using spectral analysis
    const features: number[] = [];
    
    // Extract basic acoustic features
    // 1. Mean frequency
    const mean = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
    features.push(mean);
    
    // 2. Standard deviation
    const variance = audioData.reduce((sum, val) => sum + Math.pow(Math.abs(val) - mean, 2), 0) / audioData.length;
    features.push(Math.sqrt(variance));
    
    // 3. Zero crossing rate
    let zeroCrossings = 0;
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0 && audioData[i - 1] < 0) || (audioData[i] < 0 && audioData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    features.push(zeroCrossings / audioData.length);
    
    // 4. Energy
    const energy = audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length;
    features.push(energy);
    
    // 5. Spectral centroid (simplified)
    const fftSize = 2048;
    const fft = this.simpleFft(audioData.slice(0, fftSize));
    const magnitudes = fft.map(c => Math.sqrt(c.real * c.real + c.imag * c.imag));
    const spectralCentroid = magnitudes.reduce((sum, mag, i) => sum + mag * i, 0) / magnitudes.reduce((sum, mag) => sum + mag, 0);
    features.push(spectralCentroid);
    
    // Normalize features to [0, 1] range
    return this.normalizeFeatures(features);
  }

  /**
   * Simplified FFT implementation
   */
  private simpleFft(signal: Float32Array): Array<{real: number, imag: number}> {
    const N = signal.length;
    const result: Array<{real: number, imag: number}> = [];
    
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += signal[n] * Math.cos(angle);
        imag += signal[n] * Math.sin(angle);
      }
      
      result.push({ real, imag });
    }
    
    return result;
  }

  /**
   * Normalize features to [0, 1] range
   */
  private normalizeFeatures(features: number[]): number[] {
    const min = Math.min(...features);
    const max = Math.max(...features);
    const range = max - min;
    
    if (range === 0) return features.map(() => 0.5);
    
    return features.map(f => (f - min) / range);
  }

  /**
   * Calculate cosine similarity between two feature vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (normA * normB);
  }

  /**
   * Add a voice profile for a user
   */
  addProfile(profile: VoiceProfile) {
    // Remove existing profile for this user
    this.profiles = this.profiles.filter(p => p.userId !== profile.userId);
    this.profiles.push(profile);
    
    // Store in localStorage
    this.saveProfiles();
    
    console.log('[VoiceID] Added profile for:', profile.userName);
  }

  /**
   * Identify speaker from voice features
   */
  identifySpeaker(voiceEmbedding: number[]): VoiceIdentificationResult {
    if (this.profiles.length === 0) {
      return {
        userId: null,
        userName: null,
        confidence: 0,
        isIdentified: false,
      };
    }

    let bestMatch: VoiceProfile | null = null;
    let bestSimilarity = 0;

    for (const profile of this.profiles) {
      const similarity = this.cosineSimilarity(voiceEmbedding, profile.voiceEmbedding);
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = profile;
      }
    }

    // Threshold for identification (adjust based on testing)
    const identificationThreshold = 0.7;

    if (bestMatch && bestSimilarity >= identificationThreshold) {
      console.log('[VoiceID] Identified:', bestMatch.userName, 'Confidence:', bestSimilarity);
      return {
        userId: bestMatch.userId,
        userName: bestMatch.userName,
        confidence: bestSimilarity,
        isIdentified: true,
      };
    }

    return {
      userId: null,
      userName: null,
      confidence: bestSimilarity,
      isIdentified: false,
    };
  }

  /**
   * Get all stored profiles
   */
  getProfiles(): VoiceProfile[] {
    return [...this.profiles];
  }

  /**
   * Remove a voice profile
   */
  removeProfile(userId: string) {
    this.profiles = this.profiles.filter(p => p.userId !== userId);
    this.saveProfiles();
  }

  /**
   * Save profiles to localStorage
   */
  private saveProfiles() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('voice_profiles', JSON.stringify(this.profiles));
    }
  }

  /**
   * Load profiles from localStorage
   */
  loadProfiles() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('voice_profiles');
      if (stored) {
        try {
          this.profiles = JSON.parse(stored);
          console.log('[VoiceID] Loaded', this.profiles.length, 'voice profiles');
        } catch (error) {
          console.error('[VoiceID] Failed to load profiles:', error);
          this.profiles = [];
        }
      }
    }
  }

  /**
   * Clear all profiles
   */
  clearProfiles() {
    this.profiles = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('voice_profiles');
    }
  }
}

// Singleton instance
let voiceIdService: VoiceIdentificationService | null = null;

export function getVoiceIdentificationService(): VoiceIdentificationService {
  if (!voiceIdService) {
    voiceIdService = new VoiceIdentificationService();
    voiceIdService.loadProfiles();
  }
  return voiceIdService;
}
