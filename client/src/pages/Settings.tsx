import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { data: settings, isLoading, refetch } = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success('Settings saved successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const [formData, setFormData] = useState<{
    llmProvider: string;
    llmApiKey: string;
    llmModel: string;
    llmTemperature: number;
    llmMaxTokens: number;
    llmSystemPrompt: string;
    voiceLanguage: 'en' | 'ja';
    voiceEngine: string;
    voiceApiKey: string;
    voiceInputSensitivity: number;
    voiceOutputSpeed: number;
    voiceOutputStyle: string;
    matchThreshold: number;
    minFaceSize: number;
    faceTrackingSmoothing: number;
    multiFaceMatch: boolean;
    databaseStorageLocation: string;
    analyticsEnabled: boolean;
    ageDetectionEnabled: boolean;
    genderDetectionEnabled: boolean;
    expressionDetectionEnabled: boolean;
    raceDetectionEnabled: boolean;
    peopleCountingEnabled: boolean;
  }>({
    // LLM Settings
    llmProvider: 'openai',
    llmApiKey: '',
    llmModel: '',
    llmTemperature: 70,
    llmMaxTokens: 2000,
    llmSystemPrompt: '',
    
    // Voice Settings
    voiceLanguage: 'en',
    voiceEngine: 'whisper',
    voiceApiKey: '',
    voiceInputSensitivity: 50,
    voiceOutputSpeed: 100,
    voiceOutputStyle: 'conversational',
    
    // Face Recognition Settings
    matchThreshold: 75,
    minFaceSize: 80,
    faceTrackingSmoothing: 50,
    multiFaceMatch: true,
    databaseStorageLocation: '/var/lib/ayonix/faces',
    analyticsEnabled: true,
    ageDetectionEnabled: true,
    genderDetectionEnabled: true,
    expressionDetectionEnabled: true,
    raceDetectionEnabled: false,
    peopleCountingEnabled: true,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        llmProvider: settings.llmProvider || 'openai',
        llmApiKey: (settings as any).llmApiKey || '',
        llmModel: settings.llmModel || '',
        llmTemperature: settings.llmTemperature || 70,
        llmMaxTokens: settings.llmMaxTokens || 2000,
        llmSystemPrompt: settings.llmSystemPrompt || '',
        voiceLanguage: (settings.voiceLanguage as 'en' | 'ja') || 'en',
        voiceEngine: settings.voiceEngine || 'whisper',
        voiceApiKey: (settings as any).voiceApiKey || '',
        voiceInputSensitivity: settings.voiceInputSensitivity || 50,
        voiceOutputSpeed: settings.voiceOutputSpeed || 100,
        voiceOutputStyle: settings.voiceOutputStyle || 'conversational',
        matchThreshold: settings.matchThreshold || 75,
        minFaceSize: settings.minFaceSize || 80,
        faceTrackingSmoothing: settings.faceTrackingSmoothing || 50,
        multiFaceMatch: settings.multiFaceMatch ?? true,
        databaseStorageLocation: (settings as any).databaseStorageLocation || '/var/lib/ayonix/faces',
        analyticsEnabled: (settings as any).analyticsEnabled ?? true,
        ageDetectionEnabled: (settings as any).ageDetectionEnabled ?? true,
        genderDetectionEnabled: (settings as any).genderDetectionEnabled ?? true,
        expressionDetectionEnabled: (settings as any).expressionDetectionEnabled ?? true,
        raceDetectionEnabled: (settings as any).raceDetectionEnabled ?? false,
        peopleCountingEnabled: (settings as any).peopleCountingEnabled ?? true,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure LLM, voice, and face recognition parameters
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>

      <Tabs defaultValue="llm" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="llm">LLM Settings</TabsTrigger>
          <TabsTrigger value="voice">Voice Settings</TabsTrigger>
          <TabsTrigger value="face">Face Recognition</TabsTrigger>
        </TabsList>

        {/* LLM Settings Tab */}
        <TabsContent value="llm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LLM Provider Configuration</CardTitle>
              <CardDescription>Configure AI language model for chat and voice commands</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="llm-provider">Provider</Label>
                <Select value={formData.llmProvider} onValueChange={(v) => setFormData({ ...formData, llmProvider: v })}>
                  <SelectTrigger id="llm-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="google">Google Gemini</SelectItem>
                    <SelectItem value="azure">Azure OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                    <SelectItem value="xai">xAI Grok</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="custom">Custom API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="llm-api-key">API Key</Label>
                <Input
                  id="llm-api-key"
                  type="password"
                  value={formData.llmApiKey}
                  onChange={(e) => setFormData({ ...formData, llmApiKey: e.target.value })}
                  placeholder="Enter API key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="llm-model">Model</Label>
                <Input
                  id="llm-model"
                  value={formData.llmModel}
                  onChange={(e) => setFormData({ ...formData, llmModel: e.target.value })}
                  placeholder="e.g., gpt-4, gemini-pro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="llm-temperature">Temperature: {formData.llmTemperature / 100}</Label>
                <Slider
                  id="llm-temperature"
                  value={[formData.llmTemperature]}
                  onValueChange={(v) => setFormData({ ...formData, llmTemperature: v[0] || 70 })}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="llm-max-tokens">Max Tokens</Label>
                <Input
                  id="llm-max-tokens"
                  type="number"
                  value={formData.llmMaxTokens}
                  onChange={(e) => setFormData({ ...formData, llmMaxTokens: parseInt(e.target.value) || 2000 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="llm-system-prompt">System Prompt</Label>
                <Textarea
                  id="llm-system-prompt"
                  value={formData.llmSystemPrompt}
                  onChange={(e) => setFormData({ ...formData, llmSystemPrompt: e.target.value })}
                  placeholder="Enter custom system prompt for the AI assistant..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Define how the AI assistant should behave and respond to users
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice Settings Tab */}
        <TabsContent value="voice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voice Assistant Configuration</CardTitle>
              <CardDescription>Configure speech recognition and synthesis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="voice-language">Language</Label>
                <Select value={formData.voiceLanguage} onValueChange={(v) => setFormData({ ...formData, voiceLanguage: v as 'en' | 'ja' })}>
                  <SelectTrigger id="voice-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ja">Japanese (日本語)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-engine">Voice Engine</Label>
                <Select value={formData.voiceEngine} onValueChange={(v) => setFormData({ ...formData, voiceEngine: v })}>
                  <SelectTrigger id="voice-engine">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whisper">Whisper API</SelectItem>
                    <SelectItem value="google">Google Speech</SelectItem>
                    <SelectItem value="azure">Azure Speech</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-api-key">Voice API Key</Label>
                <Input
                  id="voice-api-key"
                  type="password"
                  value={formData.voiceApiKey}
                  onChange={(e) => setFormData({ ...formData, voiceApiKey: e.target.value })}
                  placeholder="Enter voice API key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-input-sensitivity">Input Sensitivity: {formData.voiceInputSensitivity}%</Label>
                <Slider
                  id="voice-input-sensitivity"
                  value={[formData.voiceInputSensitivity]}
                  onValueChange={(v) => setFormData({ ...formData, voiceInputSensitivity: v[0] || 50 })}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-output-speed">Output Speed: {formData.voiceOutputSpeed}%</Label>
                <Slider
                  id="voice-output-speed"
                  value={[formData.voiceOutputSpeed]}
                  onValueChange={(v) => setFormData({ ...formData, voiceOutputSpeed: v[0] || 100 })}
                  min={50}
                  max={200}
                  step={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-output-style">Output Style</Label>
                <Select value={formData.voiceOutputStyle} onValueChange={(v) => setFormData({ ...formData, voiceOutputStyle: v })}>
                  <SelectTrigger id="voice-output-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conversational">Conversational</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Face Recognition Settings Tab */}
        <TabsContent value="face" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Face Recognition Parameters</CardTitle>
              <CardDescription>Configure detection and matching thresholds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="match-threshold">Match Threshold: {formData.matchThreshold}%</Label>
                <Slider
                  id="match-threshold"
                  value={[formData.matchThreshold]}
                  onValueChange={(v) => setFormData({ ...formData, matchThreshold: v[0] || 75 })}
                  min={0}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Higher values require closer matches (more strict)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-face-size">Minimum Face Size: {formData.minFaceSize}px</Label>
                <Slider
                  id="min-face-size"
                  value={[formData.minFaceSize]}
                  onValueChange={(v) => setFormData({ ...formData, minFaceSize: v[0] || 80 })}
                  min={40}
                  max={200}
                  step={10}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum face size in pixels for detection
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="face-tracking-smoothing">Face Tracking Smoothing: {formData.faceTrackingSmoothing}%</Label>
                <Slider
                  id="face-tracking-smoothing"
                  value={[formData.faceTrackingSmoothing]}
                  onValueChange={(v) => setFormData({ ...formData, faceTrackingSmoothing: v[0] || 50 })}
                  min={0}
                  max={100}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Higher values provide smoother tracking but slower response
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="multi-face-match">Multi-Face Matching</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable matching multiple faces in a single frame
                  </p>
                </div>
                <Switch
                  id="multi-face-match"
                  checked={formData.multiFaceMatch}
                  onCheckedChange={(checked) => setFormData({ ...formData, multiFaceMatch: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Face Analytics Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Face Analytics</CardTitle>
              <CardDescription>Configure demographic and expression detection features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics-enabled">Enable Face Analytics</Label>
                  <p className="text-xs text-muted-foreground">
                    Master toggle for all analytics features
                  </p>
                </div>
                <Switch
                  id="analytics-enabled"
                  checked={formData.analyticsEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, analyticsEnabled: checked })}
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="age-detection">Age Detection</Label>
                    <p className="text-xs text-muted-foreground">
                      Estimate age from facial features
                    </p>
                  </div>
                  <Switch
                    id="age-detection"
                    checked={formData.ageDetectionEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, ageDetectionEnabled: checked })}
                    disabled={!formData.analyticsEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="gender-detection">Gender Detection</Label>
                    <p className="text-xs text-muted-foreground">
                      Identify gender from facial features
                    </p>
                  </div>
                  <Switch
                    id="gender-detection"
                    checked={formData.genderDetectionEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, genderDetectionEnabled: checked })}
                    disabled={!formData.analyticsEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="expression-detection">Expression Detection</Label>
                    <p className="text-xs text-muted-foreground">
                      Detect facial expressions and emotions
                    </p>
                  </div>
                  <Switch
                    id="expression-detection"
                    checked={formData.expressionDetectionEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, expressionDetectionEnabled: checked })}
                    disabled={!formData.analyticsEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="race-detection">Race/Ethnicity Detection</Label>
                    <p className="text-xs text-muted-foreground">
                      Estimate ethnicity (disabled by default for privacy)
                    </p>
                  </div>
                  <Switch
                    id="race-detection"
                    checked={formData.raceDetectionEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, raceDetectionEnabled: checked })}
                    disabled={!formData.analyticsEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="people-counting">People Counting</Label>
                    <p className="text-xs text-muted-foreground">
                      Count total people in frame using YOLO
                    </p>
                  </div>
                  <Switch
                    id="people-counting"
                    checked={formData.peopleCountingEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, peopleCountingEnabled: checked })}
                    disabled={!formData.analyticsEnabled}
                  />
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-800">
                <strong>Privacy Note:</strong> Analytics data is processed locally and not stored permanently. 
                Race/ethnicity detection is disabled by default due to ethical considerations.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
