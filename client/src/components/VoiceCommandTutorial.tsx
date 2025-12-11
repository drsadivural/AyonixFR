import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Navigation, UserPlus, ScanFace, Settings, HelpCircle, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VoiceCommandTutorialProps {
  open: boolean;
  onClose: () => void;
}

type CommandCategory = {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  commands: {
    phrase: string;
    description: string;
    example: string;
  }[];
};

const commandCategories: CommandCategory[] = [
  {
    id: 'navigation',
    title: 'Navigation',
    icon: <Navigation className="h-5 w-5" />,
    description: 'Navigate between different pages and sections',
    commands: [
      {
        phrase: 'Go to dashboard',
        description: 'Navigate to the main dashboard',
        example: 'Say: "Go to dashboard" or "Show dashboard"'
      },
      {
        phrase: 'Show enrollees',
        description: 'View all enrolled people',
        example: 'Say: "Show enrollees" or "List enrollees"'
      },
      {
        phrase: 'Open settings',
        description: 'Access application settings',
        example: 'Say: "Open settings" or "Show settings"'
      },
      {
        phrase: 'Show events',
        description: 'View system event logs',
        example: 'Say: "Show events" or "View events"'
      },
    ]
  },
  {
    id: 'enrollment',
    title: 'Enrollment',
    icon: <UserPlus className="h-5 w-5" />,
    description: 'Control the enrollment process hands-free',
    commands: [
      {
        phrase: 'Start enrollment',
        description: 'Begin enrolling a new person',
        example: 'Say: "Start enrollment" or "Enroll new person"'
      },
      {
        phrase: 'Capture',
        description: 'Take a photo during enrollment',
        example: 'Say: "Capture" or "Take photo"'
      },
      {
        phrase: 'Save enrollment',
        description: 'Complete and save the enrollment',
        example: 'Say: "Save enrollment" or "Complete enrollment"'
      },
    ]
  },
  {
    id: 'verification',
    title: 'Verification',
    icon: <ScanFace className="h-5 w-5" />,
    description: 'Control face verification hands-free',
    commands: [
      {
        phrase: 'Start verification',
        description: 'Begin face verification mode',
        example: 'Say: "Start verification" or "Begin verification"'
      },
      {
        phrase: 'Stop verification',
        description: 'Stop the verification process',
        example: 'Say: "Stop verification" or "End verification"'
      },
      {
        phrase: 'Search [name]',
        description: 'Search for a specific person',
        example: 'Say: "Search John" or "Find Alice"'
      },
    ]
  },
  {
    id: 'general',
    title: 'General',
    icon: <HelpCircle className="h-5 w-5" />,
    description: 'General voice commands and help',
    commands: [
      {
        phrase: 'Help',
        description: 'Show this tutorial again',
        example: 'Say: "Help" or "Show commands"'
      },
      {
        phrase: 'What can I say?',
        description: 'List available voice commands',
        example: 'Say: "What can I say?" or "Voice commands"'
      },
    ]
  },
];

export default function VoiceCommandTutorial({ open, onClose }: VoiceCommandTutorialProps) {
  const [practiceMode, setPracticeMode] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Mic className="h-6 w-6 text-primary" />
            Voice Command Tutorial
          </DialogTitle>
          <DialogDescription>
            Learn how to control the application hands-free using voice commands
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Tips */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">1</Badge>
                <p>Speak clearly and at a normal pace</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <p>You can use variations of commands (e.g., "Go to dashboard" or "Show dashboard")</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">3</Badge>
                <p>The microphone icon shows when voice recognition is active</p>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">4</Badge>
                <p>Voice commands work from any page in the application</p>
              </div>
            </CardContent>
          </Card>

          {/* Command Categories */}
          <Tabs defaultValue="navigation" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {commandCategories.map((category) => (
                <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
                  {category.icon}
                  <span className="hidden sm:inline">{category.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {commandCategories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {category.icon}
                      {category.title}
                    </CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {category.commands.map((command, index) => (
                      <div key={index} className="border-l-2 border-primary/30 pl-4 py-2">
                        <div className="font-semibold text-primary mb-1">
                          "{command.phrase}"
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {command.description}
                        </div>
                        <div className="text-xs bg-muted px-3 py-1.5 rounded inline-block">
                          💡 {command.example}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* Practice Mode */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Practice Mode
              </CardTitle>
              <CardDescription>
                Try saying commands out loud to practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!practiceMode ? (
                <Button onClick={() => setPracticeMode(true)} className="w-full">
                  <Mic className="h-4 w-4 mr-2" />
                  Start Practice Mode
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-6 text-center">
                    <Mic className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
                    <p className="text-lg font-semibold mb-2">Listening for commands...</p>
                    <p className="text-sm text-muted-foreground">
                      Try saying any command from the categories above
                    </p>
                  </div>
                  <Button 
                    onClick={() => setPracticeMode(false)} 
                    variant="outline" 
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Stop Practice
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close Tutorial
            </Button>
            <Button onClick={onClose}>
              Start Using Voice Commands
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
