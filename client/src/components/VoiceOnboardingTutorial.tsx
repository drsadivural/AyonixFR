import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Mic, Volume2, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { speak } from '@/services/voiceAssistant';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  voiceText: string;
  exampleCommand: string;
  action?: () => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: 'Welcome to Voice Control',
    description: 'Control the entire Ayonix Face Recognition system with your voice. No hands needed!',
    voiceText: 'Welcome to Voice Control! You can control the entire Ayonix Face Recognition system with your voice. No hands needed!',
    exampleCommand: 'Say "Help" to see all commands',
  },
  {
    id: 2,
    title: 'Navigation Commands',
    description: 'Navigate anywhere in the app by saying where you want to go.',
    voiceText: 'You can navigate anywhere in the app by saying where you want to go.',
    exampleCommand: 'Try saying: "Go to dashboard"',
  },
  {
    id: 3,
    title: 'Action Commands',
    description: 'Start enrollment, verification, or any action with simple voice commands.',
    voiceText: 'Start enrollment, verification, or any action with simple voice commands.',
    exampleCommand: 'Try saying: "Start enrollment"',
  },
  {
    id: 4,
    title: 'Query Commands',
    description: 'Ask questions about the system, enrollees, or your account.',
    voiceText: 'Ask questions about the system, enrollees, or your account.',
    exampleCommand: 'Try saying: "How many enrollees?"',
  },
  {
    id: 5,
    title: 'Voice Shortcuts',
    description: 'Use shortcuts to combine multiple actions in one command.',
    voiceText: 'Use shortcuts to combine multiple actions in one command.',
    exampleCommand: 'Try saying: "Enroll John Smith"',
  },
  {
    id: 6,
    title: 'Getting Help',
    description: 'Say "Help" anytime to see available commands, or click the help icon.',
    voiceText: 'Say Help anytime to see available commands, or click the help icon.',
    exampleCommand: 'Try saying: "Help"',
  },
  {
    id: 7,
    title: 'You\'re Ready!',
    description: 'Click the microphone button in the bottom-right corner to start using voice control.',
    voiceText: 'You are ready! Click the microphone button in the bottom-right corner to start using voice control.',
    exampleCommand: 'Start talking to your system!',
  },
];

interface VoiceOnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function VoiceOnboardingTutorial({ onComplete, onSkip }: VoiceOnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  useEffect(() => {
    // Auto-play voice for each step
    if (step) {
      setIsPlaying(true);
      speak(step.voiceText);
      setTimeout(() => setIsPlaying(false), 3000);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    speak('Tutorial complete! You can now use voice control. Have fun!');
    localStorage.setItem('voiceTutorialCompleted', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('voiceTutorialCompleted', 'true');
    onSkip();
  };

  const handleReplay = () => {
    speak(step.voiceText);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>Voice Control Tutorial</CardTitle>
                <CardDescription>
                  Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="mt-4" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step Content */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-400 font-bold">{step.id}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>

            {/* Example Command */}
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Example Command
                  </p>
                </div>
                <p className="text-lg font-medium text-blue-700 dark:text-blue-300">
                  "{step.exampleCommand}"
                </p>
              </CardContent>
            </Card>

            {/* Voice Playback */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReplay}
                disabled={isPlaying}
              >
                <Volume2 className="h-4 w-4 mr-2" />
                {isPlaying ? 'Playing...' : 'Replay Voice'}
              </Button>
              {isPlaying && (
                <Badge variant="outline" className="animate-pulse">
                  <Volume2 className="h-3 w-3 mr-1" />
                  Speaking...
                </Badge>
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tutorial
              </Button>
              <Button onClick={handleNext}>
                {currentStep === TUTORIAL_STEPS.length - 1 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2">
            {TUTORIAL_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-blue-500'
                    : index < currentStep
                    ? 'w-2 bg-blue-300'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Hook to check if tutorial should be shown
 */
export function useVoiceTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('voiceTutorialCompleted');
    if (!completed) {
      // Show tutorial after a short delay
      setTimeout(() => setShowTutorial(true), 1000);
    }
  }, []);

  const handleComplete = () => {
    setShowTutorial(false);
  };

  const handleSkip = () => {
    setShowTutorial(false);
  };

  const replayTutorial = () => {
    localStorage.removeItem('voiceTutorialCompleted');
    setShowTutorial(true);
  };

  return {
    showTutorial,
    handleComplete,
    handleSkip,
    replayTutorial,
  };
}
