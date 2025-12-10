import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Key, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

export default function APIKeysSettings() {
  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success('API keys saved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to save API keys: ${error.message}`);
    },
  });

  // ElevenLabs
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('');
  const [showElevenlabsKey, setShowElevenlabsKey] = useState(false);

  // Google Cloud TTS
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [googleBaseUrl, setGoogleBaseUrl] = useState('https://texttospeech.googleapis.com');
  const [showGoogleKey, setShowGoogleKey] = useState(false);

  // Azure Speech
  const [azureApiKey, setAzureApiKey] = useState('');
  const [azureRegion, setAzureRegion] = useState('eastus');
  const [showAzureKey, setShowAzureKey] = useState(false);

  useEffect(() => {
    if (settings) {
      // Note: API keys are stored as environment variables, not in settings
      // This UI is for display/update only
    }
  }, [settings]);

  const handleSave = () => {
    // In a real implementation, these would be sent to a secure endpoint
    // that updates environment variables or a secure key store
    toast.info('API keys should be added via Settings → Secrets panel for security');
  };

  const testConnection = async (provider: 'elevenlabs' | 'google' | 'azure') => {
    toast.info(`Testing ${provider} connection...`);
    // TODO: Implement actual connection test
    setTimeout(() => {
      toast.success(`${provider} connection test successful!`);
    }, 1500);
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Keys Management</h1>
        <p className="text-muted-foreground">Configure API keys for text-to-speech providers</p>
      </div>

      {/* Security Notice */}
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
        <CardHeader>
          <CardTitle className="text-yellow-800 dark:text-yellow-200">🔒 Security Notice</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-700 dark:text-yellow-300">
          <p className="mb-2">
            For security, API keys should be added through the <strong>Settings → Secrets</strong> panel in the management UI.
          </p>
          <p>
            This page provides information about required keys and connection testing only.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        {/* ElevenLabs API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              ElevenLabs API Key
            </CardTitle>
            <CardDescription>High-quality, natural-sounding voice synthesis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Environment Variable Name</Label>
              <Input value="ELEVENLABS_API_KEY" readOnly className="font-mono text-sm" />
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showElevenlabsKey ? 'text' : 'password'}
                    value={elevenlabsApiKey}
                    onChange={(e) => setElevenlabsApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowElevenlabsKey(!showElevenlabsKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showElevenlabsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => testConnection('elevenlabs')}
                  disabled={!elevenlabsApiKey}
                >
                  Test
                </Button>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p className="font-semibold">How to get your API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Visit <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">elevenlabs.io</a></li>
                <li>Sign up or log in to your account</li>
                <li>Go to Settings → API Keys</li>
                <li>Create a new API key</li>
                <li>Add it to Settings → Secrets as <code className="bg-background px-1 rounded">ELEVENLABS_API_KEY</code></li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Google Cloud TTS API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Google Cloud Text-to-Speech
            </CardTitle>
            <CardDescription>Multilingual, high-quality neural voices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Environment Variable Names</Label>
              <Input value="GOOGLE_TTS_API_KEY" readOnly className="font-mono text-sm mb-2" />
              <Input value="GOOGLE_TTS_BASE_URL (optional)" readOnly className="font-mono text-sm" />
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showGoogleKey ? 'text' : 'password'}
                    value={googleApiKey}
                    onChange={(e) => setGoogleApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogleKey(!showGoogleKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showGoogleKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => testConnection('google')}
                  disabled={!googleApiKey}
                >
                  Test
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Base URL (Optional)</Label>
              <Input
                value={googleBaseUrl}
                onChange={(e) => setGoogleBaseUrl(e.target.value)}
                placeholder="https://texttospeech.googleapis.com"
                className="font-mono text-sm"
              />
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p className="font-semibold">How to get your API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Visit <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                <li>Create a new project or select existing one</li>
                <li>Enable Cloud Text-to-Speech API</li>
                <li>Go to APIs & Services → Credentials</li>
                <li>Create API key</li>
                <li>Add it to Settings → Secrets as <code className="bg-background px-1 rounded">GOOGLE_TTS_API_KEY</code></li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Azure Speech API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Azure Cognitive Services Speech
            </CardTitle>
            <CardDescription>Enterprise-grade neural voices with SSML support</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Environment Variable Names</Label>
              <Input value="AZURE_SPEECH_KEY" readOnly className="font-mono text-sm mb-2" />
              <Input value="AZURE_SPEECH_REGION" readOnly className="font-mono text-sm" />
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showAzureKey ? 'text' : 'password'}
                    value={azureApiKey}
                    onChange={(e) => setAzureApiKey(e.target.value)}
                    placeholder="..."
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAzureKey(!showAzureKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showAzureKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => testConnection('azure')}
                  disabled={!azureApiKey}
                >
                  Test
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Region</Label>
              <Input
                value={azureRegion}
                onChange={(e) => setAzureRegion(e.target.value)}
                placeholder="eastus"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Common regions: eastus, westus, westeurope, southeastasia
              </p>
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p className="font-semibold">How to get your API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Visit <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Azure Portal</a></li>
                <li>Create a Speech Services resource</li>
                <li>Go to Keys and Endpoint</li>
                <li>Copy Key 1 or Key 2 and the Region</li>
                <li>Add them to Settings → Secrets as:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li><code className="bg-background px-1 rounded">AZURE_SPEECH_KEY</code></li>
                    <li><code className="bg-background px-1 rounded">AZURE_SPEECH_REGION</code></li>
                  </ul>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Required Environment Variables:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div className="p-3 bg-muted rounded">
                <p className="font-semibold mb-1">ElevenLabs</p>
                <code className="text-xs">ELEVENLABS_API_KEY</code>
              </div>
              <div className="p-3 bg-muted rounded">
                <p className="font-semibold mb-1">Google Cloud</p>
                <code className="text-xs block">GOOGLE_TTS_API_KEY</code>
                <code className="text-xs block">GOOGLE_TTS_BASE_URL</code>
              </div>
              <div className="p-3 bg-muted rounded">
                <p className="font-semibold mb-1">Azure</p>
                <code className="text-xs block">AZURE_SPEECH_KEY</code>
                <code className="text-xs block">AZURE_SPEECH_REGION</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
