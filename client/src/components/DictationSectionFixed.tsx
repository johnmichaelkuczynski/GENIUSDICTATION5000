import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SpeechEngine, AIModel } from "@shared/schema";
import { useAppContext } from "@/context/AppContext";
import { useTransformation } from "@/hooks/useTransformation";
import { useDictation } from "@/hooks/useDictation";
import { useTTS } from "@/hooks/useTTS";

const DictationSection = () => {
  const {
    originalText,
    setOriginalText,
    processedText,
    customInstructions,
    setCustomInstructions,
    useStyleReference,
    setUseStyleReference,
    selectedSpeechEngine,
    setSelectedSpeechEngine,
    selectedAIModel,
    setSelectedAIModel,
    dictationActive,
    isProcessing,
    selectedPreset,
    setSelectedPreset
  } = useAppContext();

  const { transformText } = useTransformation();
  const { dictationStatus } = useDictation();
  const { 
    isLoading: isTtsLoading, 
    isPlaying, 
    availableVoices, 
    selectedVoiceId, 
    setSelectedVoiceId, 
    fetchVoices, 
    generateSpeech, 
    playAudio, 
    pauseAudio, 
    resetAudio, 
    downloadAudio 
  } = useTTS();

  const [currentTab, setCurrentTab] = useState("direct-dictation");
  const [showVoiceSelect, setShowVoiceSelect] = useState(false);

  // Handlers
  const handleTransformText = async () => {
    await transformText();
  };

  const handleClearOriginal = () => {
    setOriginalText("");
  };

  const handleCopyOriginal = () => {
    navigator.clipboard.writeText(originalText);
  };

  const handleCopyProcessed = () => {
    navigator.clipboard.writeText(processedText);
  };

  const handleDownloadProcessed = () => {
    const blob = new Blob([processedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "processed-text.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle voice selection
  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    setShowVoiceSelect(false);
  };

  // Handle play/pause narration
  const handlePlayNarration = async () => {
    if (!processedText) return;
    
    if (isPlaying) {
      pauseAudio();
    } else {
      if (!selectedVoiceId && availableVoices.length > 0) {
        setSelectedVoiceId(availableVoices[0].voice_id);
      }
      
      await generateSpeech(processedText, selectedVoiceId || undefined);
      playAudio();
    }
  };

  // Fetch available voices when processed text is available
  useEffect(() => {
    if (processedText) {
      fetchVoices();
    }
  }, [fetchVoices, processedText]);

  const presets = ["Academic", "Professional", "Creative", "Concise", "Elaborate"];

  return (
    <section className="mb-8">
      <Card>
        {/* Tab Navigation */}
        <Tabs defaultValue="direct-dictation" className="w-full" onValueChange={setCurrentTab} value={currentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="direct-dictation">Direct Dictation</TabsTrigger>
            <TabsTrigger value="document-processing">Document Processing</TabsTrigger>
            <TabsTrigger value="style-emulation">Style Emulation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="direct-dictation" className="p-6">
            {/* Split Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Text Panel */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Original Dictation</h3>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs flex items-center" 
                      onClick={handleClearOriginal}
                    >
                      <i className="ri-delete-bin-line mr-1"></i> Clear
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs flex items-center"
                      onClick={handleCopyOriginal}
                    >
                      <i className="ri-file-copy-line mr-1"></i> Copy
                    </Button>
                  </div>
                </div>
                <div className="flex-1 relative">
                  <Textarea
                    value={originalText}
                    onChange={(e) => setOriginalText(e.target.value)}
                    placeholder="Start dictating or type here..."
                    className="min-h-[256px] resize-none"
                  />
                  {/* Dictation Status Indicator */}
                  {dictationActive && (
                    <div className="absolute bottom-3 right-3 flex items-center text-xs text-muted-foreground">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-1 animate-pulse"></div>
                      {dictationStatus}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Processed Text Panel */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Processed Output</h3>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs flex items-center"
                      onClick={handleCopyProcessed}
                    >
                      <i className="ri-file-copy-line mr-1"></i> Copy
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs flex items-center"
                      onClick={handleDownloadProcessed}
                    >
                      <i className="ri-download-line mr-1"></i> Download
                    </Button>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-full min-h-[256px] p-3 border rounded-md bg-accent/5 text-foreground overflow-auto whitespace-pre-wrap">
                    {processedText}
                  </div>
                </div>

                {/* TTS Controls - Only show when there's processed text */}
                {processedText && (
                  <div className="flex items-center justify-between flex-wrap">
                    <div className="flex items-center space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center"
                              onClick={handlePlayNarration}
                              disabled={isTtsLoading}
                            >
                              {isTtsLoading ? (
                                <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent rounded-full"></span>
                              ) : isPlaying ? (
                                <i className="ri-pause-fill mr-1.5"></i>
                              ) : (
                                <i className="ri-play-fill mr-1.5"></i>
                              )}
                              {isTtsLoading 
                                ? "Generating..." 
                                : isPlaying 
                                  ? "Pause AI Narration" 
                                  : "Play AI Narration"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p className="text-xs">Generate natural speech narration with ElevenLabs API</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center"
                        onClick={() => setShowVoiceSelect(!showVoiceSelect)}
                        disabled={isTtsLoading || availableVoices.length === 0}
                      >
                        <i className="ri-user-voice-line mr-1.5"></i>
                        Voice
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center"
                        onClick={() => downloadAudio("processed-narration")}
                        disabled={isTtsLoading}
                      >
                        <i className="ri-download-line mr-1.5"></i>
                        Download Audio
                      </Button>
                    </div>
                  </div>
                )}

                {/* Voice Selection Dropdown */}
                {showVoiceSelect && availableVoices.length > 0 && (
                  <div className="mt-2 p-3 border rounded-md bg-accent/5">
                    <h4 className="text-sm font-medium mb-2">Select Voice</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {availableVoices.map((voice) => (
                        <Button
                          key={voice.voice_id}
                          variant={selectedVoiceId === voice.voice_id ? "secondary" : "ghost"}
                          size="sm"
                          className="justify-start text-xs"
                          onClick={() => handleVoiceSelect(voice.voice_id)}
                        >
                          <i className="ri-user-voice-line mr-1.5"></i>
                          {voice.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Transformation Controls */}
            <div className="mt-6 bg-accent/5 p-4 rounded-md border">
              <div className="flex flex-col space-y-4">
                <h3 className="text-sm font-medium">Text Transformation</h3>
                
                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset}
                      variant={selectedPreset === preset ? "default" : "outline"}
                      size="sm"
                      className="rounded-full px-3 py-1 text-xs"
                      onClick={() => setSelectedPreset(preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full px-3 py-1 text-xs flex items-center"
                    onClick={() => setSelectedPreset("Custom")}
                  >
                    <i className="ri-add-line mr-1"></i> Custom
                  </Button>
                </div>
                
                {/* Custom Instructions */}
                <div>
                  <Label htmlFor="custom-instructions" className="text-xs font-medium mb-1">Custom Instructions</Label>
                  <Textarea
                    id="custom-instructions"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="E.g., Rewrite in academic style, focusing on epistemology concepts. Include examples of foundationalism and coherentism."
                    className="text-sm resize-none"
                    rows={2}
                  />
                </div>
                
                {/* Style Reference Toggle */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="use-style-reference" 
                      checked={useStyleReference}
                      onCheckedChange={setUseStyleReference}
                    />
                    <Label htmlFor="use-style-reference" className="text-xs font-medium">
                      Use Personal Style References
                    </Label>
                  </div>
                  <Button variant="link" size="sm" className="text-xs px-0 h-auto">
                    <i className="ri-settings-line mr-1"></i> Configure
                  </Button>
                </div>
                
                {/* API Selection */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center space-x-4 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="speech-engine" className="text-xs font-medium">Speech Engine:</Label>
                      <Select
                        value={selectedSpeechEngine}
                        onValueChange={(value) => setSelectedSpeechEngine(value as SpeechEngine)}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs">
                          <SelectValue placeholder="Select speech engine" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SpeechEngine.GLADIA}>{SpeechEngine.GLADIA} (Primary)</SelectItem>
                          <SelectItem value={SpeechEngine.WHISPER}>{SpeechEngine.WHISPER}</SelectItem>
                          <SelectItem value={SpeechEngine.DEEPGRAM}>{SpeechEngine.DEEPGRAM}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="ai-model" className="text-xs font-medium">AI Model:</Label>
                      <Select
                        value={selectedAIModel}
                        onValueChange={(value) => setSelectedAIModel(value as AIModel)}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue placeholder="Select AI model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={AIModel.GPT4O}>{AIModel.GPT4O}</SelectItem>
                          <SelectItem value={AIModel.GPT4}>{AIModel.GPT4}</SelectItem>
                          <SelectItem value={AIModel.GPT35}>{AIModel.GPT35}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Process Button */}
                  <Button 
                    className="flex items-center" 
                    onClick={handleTransformText}
                    disabled={isProcessing || !originalText}
                  >
                    {isProcessing ? (
                      <>
                        <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent rounded-full"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="ri-magic-line mr-2"></i>
                        Transform Text
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="document-processing">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                Document processing will be available in this tab.
                Switch to the "Documents" page for full document handling functionality.
              </p>
            </CardContent>
          </TabsContent>
          
          <TabsContent value="style-emulation">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                Style emulation will be available in this tab.
                Switch to the "Style Library" page to manage your personal style references.
              </p>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </section>
  );
};

export default DictationSection;