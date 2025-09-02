import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Zap, RotateCcw, MessageCircle, Download, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Constants for instruction presets
const INSTRUCTION_PRESETS = [
  { id: 'Mixed cadence + clause sprawl', name: 'Mixed cadence + clause sprawl', category: 'Advanced', description: 'Alternate short and long sentences; allow some long sentences to wander with extra clauses.' },
  { id: 'Asymmetric emphasis', name: 'Asymmetric emphasis', category: 'Advanced', description: 'Over-elaborate one point; compress or skate past another.' },
  { id: 'One aside', name: 'One aside', category: 'Advanced', description: 'Add a quick parenthetical or em-dash remark — factual, not jokey.' },
  { id: 'Hedge twice', name: 'Hedge twice', category: 'Advanced', description: 'Use two mild uncertainty markers ("probably," "seems," "roughly," "I think").' },
  { id: 'Local disfluency', name: 'Local disfluency', category: 'Advanced', description: 'Keep one redundant or slightly awkward phrase that still makes sense.' },
  { id: 'Analogy injection', name: 'Analogy injection', category: 'Advanced', description: 'Insert a short, concrete comparison to something unrelated but illustrative.' },
  { id: 'Topic snap', name: 'Topic snap', category: 'Advanced', description: 'Abruptly shift focus once, then return.' },
  { id: 'Friction detail', name: 'Friction detail', category: 'Advanced', description: 'Drop in a small, seemingly unnecessary but real-world-plausible detail.' },
  { id: 'Compression — light (−15%)', name: 'Compression — light (−15%)', category: 'Core', description: 'Cut filler; merge short clauses; keep meaning. Target ≈15% shorter.' },
  { id: 'Compression — medium (−30%)', name: 'Compression — medium (−30%)', category: 'Core', description: 'Trim hard; delete throat-clearing; tighten syntax. Target ≈30% shorter.' },
  { id: 'Compression — heavy (−45%)', name: 'Compression — heavy (−45%)', category: 'Core', description: 'Sever redundancies; collapse repeats; keep core claims. Target ≈45% shorter.' },
  { id: 'Mixed cadence', name: 'Mixed cadence', category: 'Core', description: 'Alternate short (5–12 words) and long (20–35 words) sentences; avoid uniform rhythm.' },
  { id: 'Clause surgery', name: 'Clause surgery', category: 'Core', description: 'Reorder main/subordinate clauses in ~30% of sentences without changing meaning.' },
  { id: 'Front-load claim', name: 'Front-load claim', category: 'Core', description: 'Put the main conclusion in sentence 1; evidence follows.' },
  { id: 'Back-load claim', name: 'Back-load claim', category: 'Core', description: 'Delay the main conclusion to the final 2–3 sentences.' },
  { id: 'Seam/pivot', name: 'Seam/pivot', category: 'Core', description: 'Drop smooth connectors once; allow one abrupt thematic pivot.' },
  { id: 'Imply one step', name: 'Imply one step', category: 'Core', description: 'Omit one obvious inferential step; keep it implicit (context makes it recoverable).' },
  { id: 'Conditional framing', name: 'Conditional framing', category: 'Core', description: 'Recast one key sentence as: If/Unless …, then …. Keep content identical.' },
  { id: 'Local contrast', name: 'Local contrast', category: 'Core', description: 'Use exactly one contrast marker (but/except/aside) to mark a boundary; add no new facts.' },
  { id: 'Scope check', name: 'Scope check', category: 'Core', description: 'Replace one absolute with a bounded form (e.g., "in cases like these").' },
  { id: 'Deflate jargon', name: 'Deflate jargon', category: 'Core', description: 'Swap nominalizations for plain verbs where safe (e.g., utilization→use).' },
  { id: 'Kill stock transitions', name: 'Kill stock transitions', category: 'Core', description: 'Delete "Moreover/Furthermore/In conclusion" everywhere.' },
  { id: 'Hedge once', name: 'Hedge once', category: 'Core', description: 'Use exactly one hedge: probably/roughly/more or less.' },
  { id: 'Drop intensifiers', name: 'Drop intensifiers', category: 'Core', description: 'Remove "very/clearly/obviously/significantly".' },
  { id: 'Low-heat voice', name: 'Low-heat voice', category: 'Core', description: 'Prefer plain verbs; avoid showy synonyms.' },
  { id: 'Concrete benchmark', name: 'Concrete benchmark', category: 'Core', description: 'Replace one vague scale with a testable one (e.g., "enough to X").' },
  { id: 'Swap generic example', name: 'Swap generic example', category: 'Core', description: 'If the source has an example, make it slightly more specific; else skip.' },
  { id: 'Metric nudge', name: 'Metric nudge', category: 'Core', description: 'Replace "more/better" with a minimal, source-safe comparator (e.g., "more than last case").' },
  { id: 'Cull repeats', name: 'Cull repeats', category: 'Core', description: 'Delete duplicated sentences/ideas; keep the strongest instance.' },
  { id: 'No lists', name: 'No lists', category: 'Core', description: 'Output as continuous prose; remove bullets/numbering.' },
  { id: 'No meta', name: 'No meta', category: 'Core', description: 'No prefaces/apologies/phrases like "as requested".' },
  { id: 'Exact nouns', name: 'Exact nouns', category: 'Core', description: 'Replace ambiguous pronouns with exact nouns.' },
  { id: 'Quote once', name: 'Quote once', category: 'Core', description: 'If the source has a strong phrase, quote it once; otherwise skip.' },
  { id: 'Claim lock', name: 'Claim lock', category: 'Core', description: 'Do not add examples, scenarios, or data not present in the source.' },
  { id: 'Entity lock', name: 'Entity lock', category: 'Core', description: 'Keep names, counts, and attributions exactly as given.' },
  { id: 'Lean & Sharp', name: 'Lean & Sharp', category: 'Combo', description: 'Compression — medium (−30%); Mixed cadence; Imply one step; Kill stock transitions' },
  { id: 'Analytic', name: 'Analytic', category: 'Combo', description: 'Clause surgery; Front-load claim; Scope check; Exact nouns; No lists' },
];

// Writing sample categories and data
const WRITING_SAMPLES = {
  academic: [
    { id: 'raven-paradox', name: 'The Raven Paradox', preview: 'Presumably, logically equivalent statements are confirmationally equivalent...', category: 'academic' },
    { id: 'hume-argument', name: 'Hume\'s Argument Analysis', preview: 'We haven\'t yet refuted Hume\'s argument; we\'ve only taken the first step...', category: 'academic' },
    { id: 'knowledge-awareness', name: 'Knowledge vs Awareness', preview: 'Knowledge is conceptually articulated awareness...', category: 'academic' },
  ],
  professional: [
    { id: 'business-report', name: 'Executive Summary', preview: 'The quarterly analysis reveals significant market trends...', category: 'professional' },
    { id: 'technical-memo', name: 'Technical Memorandum', preview: 'Following our evaluation of the proposed system...', category: 'professional' },
  ],
  creative: [
    { id: 'narrative-essay', name: 'Personal Narrative', preview: 'The morning light filtered through the venetian blinds...', category: 'creative' },
    { id: 'descriptive-piece', name: 'Descriptive Writing', preview: 'The marketplace buzzed with an energy that seemed almost electric...', category: 'creative' },
  ]
};

interface GPTBypassSectionProps {
  className?: string;
}

export function GPTBypassSection({ className }: GPTBypassSectionProps) {
  const { toast } = useToast();
  
  // State management
  const [inputText, setInputText] = useState('');
  const [styleText, setStyleText] = useState('');
  const [contentMixText, setContentMixText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [provider, setProvider] = useState('anthropic');
  const [isLoading, setIsLoading] = useState(false);
  const [inputAiScore, setInputAiScore] = useState<number | null>(null);
  const [outputAiScore, setOutputAiScore] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/gpt-bypass/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const data = await response.json();
      setInputText(data.document.content);
      setInputAiScore(data.aiScore);
      
      toast({
        title: "File uploaded successfully",
        description: `Detected AI score: ${data.aiScore}%`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Please try again with a different file.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle text analysis
  const analyzeText = async (text: string) => {
    if (!text.trim()) return;

    try {
      const response = await fetch('/api/gpt-bypass/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      setInputAiScore(data.aiScore);
    } catch (error) {
      console.error('Analysis error:', error);
    }
  };

  // Handle rewrite
  const handleRewrite = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Input required",
        description: "Please enter text to rewrite.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setOutputText('');
    setOutputAiScore(null);

    try {
      const response = await fetch('/api/gpt-bypass/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText,
          styleText: styleText.trim() || undefined,
          contentMixText: contentMixText.trim() || undefined,
          customInstructions: customInstructions.trim() || undefined,
          selectedPresets,
          provider,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Rewrite failed');
      }

      const data = await response.json();
      setOutputText(data.rewrittenText);
      setOutputAiScore(data.outputAiScore);
      setJobId(data.jobId);

      toast({
        title: "Rewrite completed",
        description: `AI score reduced from ${data.inputAiScore}% to ${data.outputAiScore}%`,
      });
    } catch (error) {
      toast({
        title: "Rewrite failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle re-rewrite
  const handleReRewrite = async () => {
    if (!jobId || !outputText.trim()) {
      toast({
        title: "No previous output",
        description: "Please complete a rewrite first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/gpt-bypass/re-rewrite/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customInstructions: customInstructions.trim() || undefined,
          selectedPresets,
          provider,
          styleText: styleText.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'RE-HUMANIZE failed');
      }

      const data = await response.json();
      setOutputText(data.rewrittenText);
      setOutputAiScore(data.outputAiScore);
      setJobId(data.jobId);

      toast({
        title: "RE-HUMANIZE completed",
        description: `AI score: ${data.outputAiScore}%`,
      });
    } catch (error) {
      toast({
        title: "RE-HUMANIZE failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle chat
  const handleChat = async () => {
    if (!chatMessage.trim()) return;

    setIsChatLoading(true);
    setChatResponse('');

    try {
      const response = await fetch('/api/gpt-bypass/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatMessage,
          provider,
          context: {
            inputText,
            styleText,
            contentMixText,
            outputText,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chat failed');
      }

      const data = await response.json();
      setChatResponse(data.response);
    } catch (error) {
      toast({
        title: "Chat failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  // Toggle preset selection
  const togglePreset = (presetId: string) => {
    setSelectedPresets(prev =>
      prev.includes(presetId)
        ? prev.filter(id => id !== presetId)
        : [...prev, presetId]
    );
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Text has been copied successfully.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the text manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn("w-full max-w-7xl mx-auto p-6 space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">GPT Bypass</h2>
        <p className="text-muted-foreground">Advanced AI text rewriting to bypass detection systems</p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Box A - Input Text */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Box A - Input Text
                {inputAiScore !== null && (
                  <Badge variant={inputAiScore > 50 ? "destructive" : "secondary"}>
                    AI Score: {inputAiScore}%
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analyzeText(inputText)}
                  disabled={!inputText.trim() || isLoading}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Textarea
                placeholder="Enter or paste your text here, or upload a document..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[200px] resize-y"
              />
            </CardContent>
          </Card>

          {/* Box B - Style Sample */}
          <Card>
            <CardHeader>
              <CardTitle>Box B - Writing Style Sample (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Manual Input</TabsTrigger>
                  <TabsTrigger value="samples">Sample Library</TabsTrigger>
                </TabsList>
                <TabsContent value="manual" className="space-y-4">
                  <Textarea
                    placeholder="Paste a writing sample that demonstrates the style you want to mimic..."
                    value={styleText}
                    onChange={(e) => setStyleText(e.target.value)}
                    className="min-h-[150px] resize-y"
                  />
                </TabsContent>
                <TabsContent value="samples" className="space-y-4">
                  <div className="space-y-4">
                    {Object.entries(WRITING_SAMPLES).map(([category, samples]) => (
                      <div key={category}>
                        <Label className="text-sm font-medium capitalize">{category} Samples</Label>
                        <div className="grid gap-2 mt-2">
                          {samples.map((sample) => (
                            <Button
                              key={sample.id}
                              variant="outline"
                              size="sm"
                              className="justify-start h-auto p-3"
                              onClick={() => setStyleText(sample.preview + "...")}
                            >
                              <div className="text-left">
                                <div className="font-medium">{sample.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {sample.preview}
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Box C - Content Mix (Optional) */}
          <Card>
            <CardHeader>
              <CardTitle>Box C - Content Reference (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add content to blend or reference in the rewrite..."
                value={contentMixText}
                onChange={(e) => setContentMixText(e.target.value)}
                className="min-h-[150px] resize-y"
              />
            </CardContent>
          </Card>

          {/* Instructions & Presets */}
          <Card>
            <CardHeader>
              <CardTitle>Rewrite Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>AI Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">ZHI 1</SelectItem>
                    <SelectItem value="openai">ZHI 2</SelectItem>
                    <SelectItem value="perplexity">ZHI 4</SelectItem>
                    <SelectItem value="deepseek">ZHI 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Custom Instructions</Label>
                <Textarea
                  placeholder="Add specific rewriting instructions..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="min-h-[80px] resize-y"
                />
              </div>

              <div className="space-y-2">
                <Label>Instruction Presets</Label>
                <div className="max-h-[200px] overflow-y-auto border rounded-md p-3 space-y-2">
                  {['Core', 'Advanced', 'Combo'].map((category) => (
                    <div key={category} className="space-y-2">
                      <Label className="text-sm font-medium">{category}</Label>
                      <div className="grid gap-2">
                        {INSTRUCTION_PRESETS
                          .filter(preset => preset.category === category)
                          .map((preset) => (
                            <div key={preset.id} className="flex items-start space-x-2">
                              <Checkbox
                                id={preset.id}
                                checked={selectedPresets.includes(preset.id)}
                                onCheckedChange={() => togglePreset(preset.id)}
                              />
                              <div className="grid gap-1.5 leading-none">
                                <Label
                                  htmlFor={preset.id}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {preset.name}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {preset.description}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleRewrite}
                  disabled={!inputText.trim() || isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Processing...' : 'Rewrite Text'}
                  <Zap className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReRewrite}
                  disabled={!outputText.trim() || isLoading}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  RE-HUMANIZE
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Output Section */}
      {outputText && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                Box D - Rewritten Output
                {outputAiScore !== null && (
                  <Badge variant={outputAiScore > 50 ? "destructive" : "secondary"}>
                    AI Score: {outputAiScore}%
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(outputText)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={outputText}
              readOnly
              className="min-h-[200px] resize-y bg-muted/50"
            />
          </CardContent>
        </Card>
      )}

      {/* Chat Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            AI Assistant Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask questions about your text, get writing advice, or request analysis..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-1 min-h-[60px] resize-y"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChat();
                }
              }}
            />
            <Button
              onClick={handleChat}
              disabled={!chatMessage.trim() || isChatLoading}
              className="self-end"
            >
              {isChatLoading ? 'Thinking...' : 'Send'}
            </Button>
          </div>
          
          {chatResponse && (
            <div className="bg-muted/50 rounded-md p-4">
              <Label className="text-sm font-medium">AI Response:</Label>
              <div className="mt-2 text-sm whitespace-pre-wrap">{chatResponse}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}