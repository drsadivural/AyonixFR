import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Volume2, Mic, Settings2, Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, getUserLanguage, setUserLanguage, type SupportedLanguage } from '@/services/multiLanguageVoice';

export default function VoiceSettings() {
  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const [language, setLanguage] = useState<SupportedLanguage>(getUserLanguage());
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success('Voice settings saved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const [ttsProvider, setTtsProvider] = useState<string>((settings as any)?.ttsProvider || 'browser');
  const [ttsVoiceName, setTtsVoiceName] = useState<string>((settings as any)?.ttsVoiceName || '');
  const [ttsSpeakingRate, setTtsSpeakingRate] = useState<number>((settings as any)?.ttsSpeakingRate || 100);
  const [ttsPitch, setTtsPitch] = useState<number>((settings as any)?.ttsPitch || 0);

  const handleSave = () => {
    updateMutation.mutate({
      ttsProvider,
      ttsVoiceName,
      ttsSpeakingRate,
      ttsPitch,
    } as any);
  };

  const getVoiceOptions = () => {
    switch (ttsProvider) {
      case 'elevenlabs':
        return [
          { value: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel - Warm Female' },
          { value: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella - Expressive Female' },
          { value: 'ErXwobaYiN019PkySvjV', label: 'Antoni - Well-rounded Male' },
          { value: 'VR6AewLTigWG4xSOukaG', label: 'Arnold - Crisp Male' },
        ];
      case 'google':
        return [
          { value: 'en-US-Neural2-F', label: 'Female - Warm' },
          { value: 'en-US-Neural2-C', label: 'Female - Neutral' },
          { value: 'en-US-Neural2-G', label: 'Female - Expressive' },
          { value: 'en-US-Neural2-D', label: 'Male - Warm' },
          { value: 'en-US-Neural2-A', label: 'Male - Neutral' },
        ];
      case 'azure':
        return [
          { value: 'en-US-JennyNeural', label: 'Jenny - Warm Female' },
          { value: 'en-US-AriaNeural', label: 'Aria - Neutral Female' },
          { value: 'en-US-AmberNeural', label: 'Amber - Expressive Female' },
          { value: 'en-US-GuyNeural', label: 'Guy - Neutral Male' },
          { value: 'en-US-DavisNeural', label: 'Davis - Warm Male' },
        ];
      default:
        return [];
    }
  };

  const getApiKeyInfo = () => {
    switch (ttsProvider) {
      case 'elevenlabs':
        return {
          name: 'ELEVENLABS_API_KEY',
          url: 'https://elevenlabs.io/app/settings/api-keys',
          description: 'Get your API key from ElevenLabs Settings',
        };
      case 'google':
        return {
          name: 'GOOGLE_TTS_API_KEY',
          url: 'https://console.cloud.google.com/apis/credentials',
          description: 'Create an API key in Google Cloud Console',
        };
      case 'azure':
        return {
          name: 'AZURE_SPEECH_KEY & AZURE_SPEECH_REGION',
          url: 'https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices',
          description: 'Get your key and region from Azure Portal',
        };
      default:
        return null;
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  const apiKeyInfo = getApiKeyInfo();
  const voiceOptions = getVoiceOptions();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Voice Settings</h1>
        <p className="text-muted-foreground">Configure text-to-speech providers and voice options</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Voice Language
            </CardTitle>
            <CardDescription>Select language for voice recognition and responses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={language}
                onValueChange={(value: SupportedLanguage) => {
                  setLanguage(value);
                  setUserLanguage(value);
                  toast.success(`Language changed to ${SUPPORTED_LANGUAGES[value].nativeName}`);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUPPORTED_LANGUAGES).map(([code, config]) => (
                    <SelectItem key={code} value={code}>
                      {config.nativeName} ({config.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Voice commands and responses will use the selected language
              </p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-semibold mb-2">Supported Languages</p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• English (en-US) - Full support</li>
                <li>• Japanese (ja-JP) - Full support</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* TTS Provider Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Text-to-Speech Provider
            </CardTitle>
            <CardDescription>Choose your preferred voice synthesis engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>TTS Provider</Label>
              <Select value={ttsProvider} onValueChange={setTtsProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">Browser TTS (Free, No Setup)</SelectItem>
                  <SelectItem value="elevenlabs">ElevenLabs (High Quality)</SelectItem>
                  <SelectItem value="google">Google Cloud TTS</SelectItem>
                  <SelectItem value="azure">Azure Cognitive Services</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {apiKeyInfo && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-semibold mb-1">API Key Required</p>
                <p className="text-xs text-muted-foreground mb-2">{apiKeyInfo.description}</p>
                <p className="text-xs font-mono bg-background px-2 py-1 rounded mb-2">{apiKeyInfo.name}</p>
                <a 
                  href={apiKeyInfo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Get API Key →
                </a>
                <p className="text-xs text-muted-foreground mt-2">
                  Add your API key in Settings → Secrets panel
                </p>
              </div>
            )}

            {ttsProvider === 'browser' && (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-semibold mb-1">✓ No Setup Required</p>
                <p className="text-xs text-muted-foreground">
                  Browser TTS uses your device's built-in speech synthesis. Free and works immediately, but voice quality may vary by browser and OS.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voice Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Voice Configuration
            </CardTitle>
            <CardDescription>Customize voice characteristics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {voiceOptions.length > 0 && (
              <div className="space-y-2">
                <Label>Voice Selection</Label>
                <Select value={ttsVoiceName} onValueChange={setTtsVoiceName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        {voice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Speaking Rate: {(ttsSpeakingRate / 100).toFixed(2)}x</Label>
              <Slider
                value={[ttsSpeakingRate]}
                onValueChange={([value]) => setTtsSpeakingRate(value)}
                min={50}
                max={200}
                step={10}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Adjust how fast the voice speaks (0.5x - 2.0x)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Pitch: {ttsPitch > 0 ? '+' : ''}{ttsPitch}Hz</Label>
              <Slider
                value={[ttsPitch]}
                onValueChange={([value]) => setTtsPitch(value)}
                min={-20}
                max={20}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Adjust voice pitch (-20Hz to +20Hz)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending}
          size="lg"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Voice Settings'}
        </Button>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>About Voice Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <h3 className="font-semibold mb-1">Browser TTS</h3>
              <p className="text-sm text-muted-foreground">Free, instant setup, quality varies by device</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">ElevenLabs</h3>
              <p className="text-sm text-muted-foreground">Premium quality, natural voices, emotional range</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Google Cloud</h3>
              <p className="text-sm text-muted-foreground">High quality, multilingual, reliable</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Azure</h3>
              <p className="text-sm text-muted-foreground">Enterprise-grade, neural voices, SSML support</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
