import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';

interface QualityResult {
  overall_score: number;
  overall_quality: 'poor' | 'acceptable' | 'good';
  recommendation: string;
  sharpness: {
    score: number;
    quality: string;
  };
  lighting: {
    score: number;
    quality: string;
  };
  angle: {
    score: number;
    quality: string;
  };
}

interface Props {
  imageBase64: string | null;
  onQualityChange?: (quality: QualityResult | null) => void;
}

export default function FaceQualityIndicator({ imageBase64, onQualityChange }: Props) {
  const [quality, setQuality] = useState<QualityResult | null>(null);

  const { data, isLoading, error } = trpc.faceQuality.assess.useQuery(
    { imageBase64: imageBase64 || '' },
    { 
      enabled: !!imageBase64,
      refetchInterval: false,
    }
  );

  useEffect(() => {
    if (data) {
      setQuality(data as QualityResult);
      onQualityChange?.(data as QualityResult);
    } else {
      setQuality(null);
      onQualityChange?.(null);
    }
  }, [data, onQualityChange]);

  if (!imageBase64) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Analyzing image quality...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !quality) {
    return null;
  }

  const getQualityIcon = (qualityLevel: string) => {
    switch (qualityLevel) {
      case 'good':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'acceptable':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'poor':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getQualityColor = (qualityLevel: string) => {
    switch (qualityLevel) {
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'acceptable':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={`mt-4 border-2 ${getQualityColor(quality.overall_quality)}`}>
      <CardContent className="pt-6 space-y-4">
        {/* Overall Quality */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getQualityIcon(quality.overall_quality)}
            <div>
              <p className="font-semibold">Overall Quality</p>
              <p className="text-sm text-muted-foreground">{quality.recommendation}</p>
            </div>
          </div>
          <div className={`text-2xl font-bold ${getScoreColor(quality.overall_score)}`}>
            {quality.overall_score}%
          </div>
        </div>

        {/* Individual Metrics */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          {/* Sharpness */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              {getQualityIcon(quality.sharpness.quality)}
            </div>
            <p className="text-xs font-medium text-muted-foreground">Sharpness</p>
            <p className={`text-lg font-bold ${getScoreColor(quality.sharpness.score)}`}>
              {quality.sharpness.score}%
            </p>
          </div>

          {/* Lighting */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              {getQualityIcon(quality.lighting.quality)}
            </div>
            <p className="text-xs font-medium text-muted-foreground">Lighting</p>
            <p className={`text-lg font-bold ${getScoreColor(quality.lighting.score)}`}>
              {quality.lighting.score}%
            </p>
          </div>

          {/* Angle */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              {getQualityIcon(quality.angle.quality)}
            </div>
            <p className="text-xs font-medium text-muted-foreground">Face Angle</p>
            <p className={`text-lg font-bold ${getScoreColor(quality.angle.score)}`}>
              {quality.angle.score}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
