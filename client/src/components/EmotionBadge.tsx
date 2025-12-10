import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getEmotionEmoji, getEmotionColor } from '@/services/emotionDetection';
import type { EmotionResult } from '@/services/emotionDetection';

interface EmotionBadgeProps {
  emotion: EmotionResult | null;
  showDetails?: boolean;
}

export function EmotionBadge({ emotion, showDetails = false }: EmotionBadgeProps) {
  if (!emotion) {
    return (
      <Badge variant="outline" className="text-gray-500">
        <span className="mr-1">😐</span>
        No emotion detected
      </Badge>
    );
  }

  const emoji = getEmotionEmoji(emotion.emotion);
  const colorClass = getEmotionColor(emotion.emotion);
  const confidencePercent = Math.round(emotion.confidence * 100);

  if (!showDetails) {
    return (
      <Badge variant="outline" className={colorClass}>
        <span className="mr-1">{emoji}</span>
        {emotion.emotion.charAt(0).toUpperCase() + emotion.emotion.slice(1)} ({confidencePercent}%)
      </Badge>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{emoji}</span>
              <div>
                <p className={`font-semibold ${colorClass}`}>
                  {emotion.emotion.charAt(0).toUpperCase() + emotion.emotion.slice(1)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {confidencePercent}% confidence
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">All Emotions:</p>
            {Object.entries(emotion.allEmotions)
              .sort(([, a], [, b]) => b - a)
              .map(([emotionName, confidence]) => (
                <div key={emotionName} className="flex items-center gap-2">
                  <span className="text-sm w-20 capitalize">{emotionName}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getEmotionColor(emotionName).replace('text-', 'bg-')}`}
                      style={{ width: `${Math.round(confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {Math.round(confidence * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
