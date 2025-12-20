/**
 * Face Analytics Display Component
 * Shows age, gender, expression, race for detected faces
 */

import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { User, Smile, Calendar, Globe } from 'lucide-react';

interface FaceAnalytics {
  bbox: [number, number, number, number];
  age: number | null;
  gender: 'male' | 'female' | null;
  expression: string;
  race: string | null;
  det_score: number;
}

interface FaceAnalyticsDisplayProps {
  faces: FaceAnalytics[];
  peopleCount?: number;
  showPeopleCount?: boolean;
}

export function FaceAnalyticsDisplay({ faces, peopleCount, showPeopleCount = false }: FaceAnalyticsDisplayProps) {
  if (faces.length === 0 && !showPeopleCount) {
    return null;
  }

  const getExpressionEmoji = (expression: string) => {
    const emojiMap: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      surprise: '😲',
      fear: '😨',
      disgust: '🤢',
      neutral: '😐',
    };
    return emojiMap[expression.toLowerCase()] || '😐';
  };

  const getGenderIcon = (gender: string | null) => {
    if (gender === 'male') return '♂️';
    if (gender === 'female') return '♀️';
    return '⚧';
  };

  return (
    <div className="space-y-3">
      {/* People count */}
      {showPeopleCount && peopleCount !== undefined && (
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">
              {peopleCount} {peopleCount === 1 ? 'Person' : 'People'} Detected
            </span>
          </div>
        </Card>
      )}

      {/* Face analytics */}
      {faces.map((face, index) => (
        <Card key={index} className="p-4 bg-white shadow-sm">
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Face {index + 1}</h4>
              <Badge variant="outline" className="text-xs">
                {(face.det_score * 100).toFixed(0)}% confidence
              </Badge>
            </div>

            {/* Analytics grid */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {/* Age */}
              {face.age !== null && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="text-xs text-gray-500">Age</div>
                    <div className="font-semibold">{face.age} years</div>
                  </div>
                </div>
              )}

              {/* Gender */}
              {face.gender && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getGenderIcon(face.gender)}</span>
                  <div>
                    <div className="text-xs text-gray-500">Gender</div>
                    <div className="font-semibold capitalize">{face.gender}</div>
                  </div>
                </div>
              )}

              {/* Expression */}
              <div className="flex items-center gap-2">
                <span className="text-lg">{getExpressionEmoji(face.expression)}</span>
                <div>
                  <div className="text-xs text-gray-500">Expression</div>
                  <div className="font-semibold capitalize">{face.expression}</div>
                </div>
              </div>

              {/* Race */}
              {face.race && face.race !== 'unknown' && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="text-xs text-gray-500">Ethnicity</div>
                    <div className="font-semibold capitalize">{face.race}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
