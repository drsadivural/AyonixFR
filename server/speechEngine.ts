import { invokeLLM } from "./_core/llm";
import * as db from "./db";

/**
 * Personality-driven speech engine that generates context-aware, surprising comments
 * for face recognition verification results.
 */

interface SpeechContext {
  enrolleeName: string;
  matchCount: number; // How many times this person has been matched before (including this one)
  facialExpression?: string; // smiling, neutral, serious, etc.
  timeOfDay: string; // morning, afternoon, evening, night
  confidence: number; // Match confidence 0-100
  previousComments?: string[]; // Recent comments to avoid repetition
}

/**
 * Generate a personality-driven voice comment for a verification match
 */
export async function generateVoiceComment(context: SpeechContext): Promise<string> {
  const { enrolleeName, matchCount, facialExpression, timeOfDay, confidence, previousComments } = context;

  // Build context-aware system prompt
  const systemPrompt = `You are a friendly, witty AI assistant in a face recognition system. Your job is to greet people with surprising, delightful, and context-aware comments that make them smile.

PERSONALITY TRAITS:
- Warm and welcoming, like greeting a friend
- Playful and occasionally flirty (in a respectful, fun way)
- Observant about facial expressions and context
- Uses casual, natural language
- Makes people feel special and noticed
- Sometimes makes light jokes or references to weather, time of day, or mood

RULES:
1. Keep comments SHORT (1-2 sentences max, ~15-25 words)
2. Address the person by their FIRST NAME naturally in conversation
3. Be context-aware: reference their facial expression, time of day, or match count
4. VARY your greetings - never repeat the same pattern
5. Make each interaction feel unique and personal
6. Be appropriate and respectful while being warm
7. Avoid generic phrases like "Nice to see you" - be creative!

CONTEXT AWARENESS:
- First time (matchCount=1): Warm welcome, express excitement to meet them
- Second time (matchCount=2): Reference previous meeting, notice changes (expression, mood)
- Third+ times (matchCount≥3): Show familiarity, make playful observations, build rapport

FACIAL EXPRESSIONS:
- smiling: Acknowledge their good mood, be cheerful
- neutral: Be warm but not overly enthusiastic, maybe ask if they're okay
- serious: Be gentle, maybe make a light joke to lift their mood

TIME OF DAY:
- morning: Reference energy levels, coffee, starting the day
- afternoon: Reference productivity, lunch, midday vibes
- evening: Reference winding down, dinner plans, end of day
- night: Reference late hours, dedication, night owl behavior

EXAMPLES (for inspiration, don't copy exactly):
- First time, smiling, morning: "Hey ${enrolleeName}! That smile is brighter than my morning coffee! Great to finally meet you!"
- Second time, neutral, afternoon: "${enrolleeName}, you're back! Not smiling today though - everything cool? Maybe you need a snack break?"
- Third time, smiling, evening: "Well well, ${enrolleeName} again! You know, I'm starting to think you actually like seeing me. The weather's nice, wanna grab dinner?"
- Fourth time, serious, night: "${enrolleeName}, burning the midnight oil? Your dedication is impressive, but don't forget to rest!"

Remember: Be surprising, delightful, and make them feel noticed. Each comment should feel like it's from a friend who pays attention.`;

  const userPrompt = `Generate a voice comment for this verification:

Person: ${enrolleeName} (first name only)
Match Count: ${matchCount} (${matchCount === 1 ? 'first time meeting' : matchCount === 2 ? 'second time' : `${matchCount}th time seeing them`})
Facial Expression: ${facialExpression || 'neutral'}
Time of Day: ${timeOfDay}
Match Confidence: ${confidence}%
${previousComments && previousComments.length > 0 ? `\nRecent comments to AVOID repeating:\n${previousComments.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : ''}

Generate ONE short, surprising, context-aware voice comment (15-25 words). Be creative and make them smile!`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const comment = typeof content === 'string' ? content.trim() : "";
    return comment;
  } catch (error) {
    console.error("[SpeechEngine] Failed to generate voice comment:", error);
    // Fallback to simple greeting
    return `Hey ${enrolleeName}! Great to see you!`;
  }
}

/**
 * Detect facial expression from face landmarks (simplified version)
 * In production, this would use more sophisticated emotion detection
 */
export function detectFacialExpression(landmarks?: any): string {
  // Placeholder - in production, analyze landmarks for smile detection
  // For now, return neutral as default
  return "neutral";
}

/**
 * Get time of day category
 */
export function getTimeOfDay(): string {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

/**
 * Get previous comments for an enrollee to avoid repetition
 */
export async function getPreviousComments(enrolleeId: number, limit: number = 3): Promise<string[]> {
  const logs = await db.getRecentRecognitionLogs(enrolleeId, limit);
  return logs
    .filter((log: any) => log.voiceComment)
    .map((log: any) => log.voiceComment as string);
}

/**
 * Get match count for an enrollee
 */
export async function getMatchCount(enrolleeId: number): Promise<number> {
  const count = await db.getEnrolleeMatchCount(enrolleeId);
  return count + 1; // +1 because this is the current match
}
