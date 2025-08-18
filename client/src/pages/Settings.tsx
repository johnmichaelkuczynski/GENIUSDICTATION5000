import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppContext } from "@/context/AppContext";
import { SpeechEngine, AIModel } from "@shared/schema";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { toast } = useToast();
  const { 
    selectedSpeechEngine, 
    setSelectedSpeechEngine,
    selectedAIModel,
    setSelectedAIModel,
    checkApiStatus,
    apisConnected,
    availableServices
  } = useAppContext();
  
  const [gladiaKey, setGladiaKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [deepgramKey, setDeepgramKey] = useState("");
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [perplexityKey, setPerplexityKey] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [continuousDictation, setContinuousDictation] = useState(true);
  const [shortcutKey, setShortcutKey] = useState("Alt+D");

  const handleSaveApiKeys = async () => {
    setIsSavingKeys(true);
    
    try {
      const response = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gladiaKey: gladiaKey || undefined,
          openaiKey: openaiKey || undefined,
          deepgramKey: deepgramKey || undefined,
          elevenLabsKey: elevenLabsKey || undefined,
          anthropicKey: anthropicKey || undefined,
          perplexityKey: perplexityKey || undefined,
          deepseekKey: deepseekKey || undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save API keys");
      }
      
      toast({
        title: "API Keys Saved",
        description: "Your API keys have been saved successfully.",
      });
      
      // Check API connection status
      await checkApiStatus();
      
      setGladiaKey("");
      setOpenaiKey("");
      setDeepgramKey("");
      setElevenLabsKey("");
      setAnthropicKey("");
      setPerplexityKey("");
      setDeepseekKey("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to save API keys",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    } finally {
      setIsSavingKeys(false);
    }
  };

  const handleSavePreferences = () => {
    toast({
      title: "Preferences Saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <div className="flex flex-col space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      
      <Tabs defaultValue="api-settings">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api-settings">API Settings</TabsTrigger>
          <TabsTrigger value="dictation-preferences">Dictation Preferences</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        
        {/* API Settings Tab */}
        <TabsContent value="api-settings">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure the APIs used for speech recognition and text transformation.
                Your keys are stored securely in Replit Secrets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Speech Recognition Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Speech Recognition</h3>
                <div className="grid gap-2">
                  <Label htmlFor="speech-engine">Primary Speech Engine</Label>
                  <Select
                    value={selectedSpeechEngine}
                    onValueChange={(value) => setSelectedSpeechEngine(value as SpeechEngine)}
                  >
                    <SelectTrigger id="speech-engine" className="w-full">
                      <SelectValue placeholder="Select speech engine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SpeechEngine.GLADIA}>{SpeechEngine.GLADIA} (Recommended)</SelectItem>
                      <SelectItem value={SpeechEngine.WHISPER}>{SpeechEngine.WHISPER}</SelectItem>
                      <SelectItem value={SpeechEngine.DEEPGRAM}>{SpeechEngine.DEEPGRAM}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred speech recognition engine. The system will fall back to alternatives if the primary engine fails.
                  </p>
                </div>
                
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="gladia-key">Gladia API Key</Label>
                    <Input
                      id="gladia-key"
                      type="password"
                      placeholder="Enter your Gladia API key"
                      value={gladiaKey}
                      onChange={(e) => setGladiaKey(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="openai-key">OpenAI API Key (for Whisper)</Label>
                    <Input
                      id="openai-key"
                      type="password"
                      placeholder="Enter your OpenAI API key"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="deepgram-key">Deepgram API Key</Label>
                    <Input
                      id="deepgram-key"
                      type="password"
                      placeholder="Enter your Deepgram API key"
                      value={deepgramKey}
                      onChange={(e) => setDeepgramKey(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Text-to-Speech Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Text-to-Speech</h3>
                <div className="grid gap-2">
                  <Label htmlFor="elevenlabs-key">ElevenLabs API Key</Label>
                  <Input
                    id="elevenlabs-key"
                    type="password"
                    placeholder="Enter your ElevenLabs API key"
                    value={elevenLabsKey}
                    onChange={(e) => setElevenLabsKey(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Required for text-to-speech narration of your processed text. Get an API key at <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-primary underline">elevenlabs.io</a>.
                  </p>
                </div>
              </div>
              
              {/* Text Transformation Selection */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Text Transformation</h3>
                <div className="grid gap-2">
                  <Label htmlFor="ai-model">AI Model</Label>
                  <Select
                    value={selectedAIModel}
                    onValueChange={(value) => setSelectedAIModel(value as AIModel)}
                  >
                    <SelectTrigger id="ai-model">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>DeepSeek Models</SelectLabel>
                        <SelectItem 
                          value={AIModel.DEEPSEEK} 
                          disabled={!apisConnected || !availableServices.deepseek}
                        >
                          {AIModel.DEEPSEEK} {!availableServices.deepseek && "(API Key Required)"}
                        </SelectItem>
                      </SelectGroup>
                      
                      <SelectGroup>
                        <SelectLabel>OpenAI Models</SelectLabel>
                        <SelectItem 
                          value={AIModel.GPT4O} 
                          disabled={!apisConnected || !availableServices.openai}
                        >
                          {AIModel.GPT4O} {!availableServices.openai && "(API Key Required)"}
                        </SelectItem>
                        <SelectItem 
                          value={AIModel.GPT4} 
                          disabled={!apisConnected || !availableServices.openai}
                        >
                          {AIModel.GPT4} {!availableServices.openai && "(API Key Required)"}
                        </SelectItem>
                        <SelectItem 
                          value={AIModel.GPT35} 
                          disabled={!apisConnected || !availableServices.openai}
                        >
                          {AIModel.GPT35} {!availableServices.openai && "(API Key Required)"}
                        </SelectItem>
                      </SelectGroup>
                      
                      <SelectGroup>
                        <SelectLabel>Anthropic Models</SelectLabel>
                        <SelectItem 
                          value={AIModel.CLAUDE_3_OPUS} 
                          disabled={!apisConnected || !availableServices.anthropic}
                        >
                          {AIModel.CLAUDE_3_OPUS} {!availableServices.anthropic && "(API Key Required)"}
                        </SelectItem>
                        <SelectItem 
                          value={AIModel.CLAUDE_3_SONNET} 
                          disabled={!apisConnected || !availableServices.anthropic}
                        >
                          {AIModel.CLAUDE_3_SONNET} {!availableServices.anthropic && "(API Key Required)"}
                        </SelectItem>
                        <SelectItem 
                          value={AIModel.CLAUDE_3_HAIKU} 
                          disabled={!apisConnected || !availableServices.anthropic}
                        >
                          {AIModel.CLAUDE_3_HAIKU} {!availableServices.anthropic && "(API Key Required)"}
                        </SelectItem>
                      </SelectGroup>
                      
                      <SelectGroup>
                        <SelectLabel>Perplexity Models</SelectLabel>
                        <SelectItem 
                          value={AIModel.PERPLEXITY_LLAMA_SONAR} 
                          disabled={!apisConnected || !availableServices.perplexity}
                        >
                          {AIModel.PERPLEXITY_LLAMA_SONAR} {!availableServices.perplexity && "(API Key Required)"}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Select the AI model used for text transformation. Multiple AI providers are available.
                  </p>
                </div>
                
                <div className="grid gap-4 mt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="deepseek-key">DeepSeek API Key (for DeepSeek models)</Label>
                    <Input
                      id="deepseek-key"
                      type="password"
                      placeholder="Enter your DeepSeek API key"
                      value={deepseekKey}
                      onChange={(e) => setDeepseekKey(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Required for using DeepSeek models. Get a key at <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">platform.deepseek.com</a>.
                    </p>
                  </div>
                
                  <div className="grid gap-2">
                    <Label htmlFor="anthropic-key">Anthropic API Key (for Claude models)</Label>
                    <Input
                      id="anthropic-key"
                      type="password"
                      placeholder="Enter your Anthropic API key"
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Required for using Claude models. Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">console.anthropic.com</a>.
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="perplexity-key">Perplexity API Key (for Llama models)</Label>
                    <Input
                      id="perplexity-key"
                      type="password"
                      placeholder="Enter your Perplexity API key"
                      value={perplexityKey}
                      onChange={(e) => setPerplexityKey(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Required for using Perplexity Llama models. Get a key at <a href="https://www.perplexity.ai" target="_blank" rel="noopener noreferrer" className="text-primary underline">perplexity.ai</a>.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleSaveApiKeys} 
                disabled={isSavingKeys}
                className="w-full"
              >
                {isSavingKeys ? (
                  <>
                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent rounded-full"></span>
                    Saving...
                  </>
                ) : (
                  "Save API Keys"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Dictation Preferences Tab */}
        <TabsContent value="dictation-preferences">
          <Card>
            <CardHeader>
              <CardTitle>Dictation Preferences</CardTitle>
              <CardDescription>
                Customize how dictation works in the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="continuous-dictation">Continuous Dictation</Label>
                  <p className="text-sm text-muted-foreground">
                    Keep dictation running until manually stopped
                  </p>
                </div>
                <Switch
                  id="continuous-dictation"
                  checked={continuousDictation}
                  onCheckedChange={setContinuousDictation}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-save">Auto-Save Dictations</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save dictation sessions
                  </p>
                </div>
                <Switch
                  id="auto-save"
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="shortcut-key">Dictation Shortcut</Label>
                <Input
                  id="shortcut-key"
                  value={shortcutKey}
                  onChange={(e) => setShortcutKey(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Keyboard shortcut to start/stop dictation
                </p>
              </div>
              
              <Button 
                onClick={handleSavePreferences}
                className="w-full"
              >
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Use the theme toggle in the upper right corner to switch between light and dark mode.
              </p>
              
              <div className="flex justify-center py-8">
                <div className="flex space-x-4">
                  <div className="w-40 h-60 rounded-md bg-white shadow-md border flex flex-col overflow-hidden">
                    <div className="h-10 bg-primary/10 border-b flex items-center justify-center text-sm font-medium">Light Mode</div>
                    <div className="flex-1 p-2">
                      <div className="w-full h-6 bg-primary/20 rounded mb-2"></div>
                      <div className="w-full h-20 bg-gray-100 rounded mb-2"></div>
                      <div className="w-full h-4 bg-gray-200 rounded mb-1"></div>
                      <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  
                  <div className="w-40 h-60 rounded-md bg-gray-900 shadow-md border border-gray-700 flex flex-col overflow-hidden">
                    <div className="h-10 bg-primary/20 border-b border-gray-700 flex items-center justify-center text-sm font-medium text-white">Dark Mode</div>
                    <div className="flex-1 p-2">
                      <div className="w-full h-6 bg-primary/30 rounded mb-2"></div>
                      <div className="w-full h-20 bg-gray-800 rounded mb-2"></div>
                      <div className="w-full h-4 bg-gray-700 rounded mb-1"></div>
                      <div className="w-3/4 h-4 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
