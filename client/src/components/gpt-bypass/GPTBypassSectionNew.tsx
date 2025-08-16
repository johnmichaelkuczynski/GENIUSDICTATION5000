import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Zap, RotateCcw, MessageCircle, Download, Copy, Send, ArrowUp, ArrowDown } from 'lucide-react';
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

// Complete writing sample library
const WRITING_SAMPLES = {
  academic: [
    {
      id: 'formal-functional',
      name: 'Formal & Functional Relationships',
      preview: 'There are two broad types of relationships: formal and functional...',
      content: `There are two broad types of relationships: formal and functional. Formal relationships hold between descriptions. A description is any statement that can be true or false. Example of a formal relationship: The description that a shape is a square cannot be true unless the description that it has four equal sides is true. Therefore, a shape's being a square depends on its having four equal sides. Functional relationships hold between events or conditions. (An event is anything that happens at a specific time; a condition is anything that can change over time.) Example of a functional relationship: A switch's being in the on position causes the light bulb connected to it to be lit. Therefore, the light bulb's being lit depends on the switch's being in the on position.`,
      category: 'academic'
    },
    {
      id: 'hume-argument',
      name: 'Hume\'s Argument Analysis',
      preview: 'We haven\'t yet refuted Hume\'s argument; we\'ve only taken the first step...',
      content: `We haven't yet refuted Hume's argument; we've only taken the first step towards doing so. Hume could still respond by saying that even if we accept that there are necessary connections in nature, we still can't know what they are just by examining individual instances. The problem is that when we observe correlations between events, we can't tell which correlations reflect genuine causal connections and which are merely accidental. This is a deeper problem than the one we've been addressing.`,
      category: 'academic'
    },
    {
      id: 'knowledge-awareness',
      name: 'Knowledge vs Awareness',
      preview: 'Knowledge is conceptually articulated awareness...',
      content: `Knowledge is conceptually articulated awareness. In order for me to know that there is a book on the table, I must be aware that there is a book on the table, and I must be able to articulate this awareness conceptually (i.e., I must possess the concepts book, table, spatial relation, etc.). But knowledge requires more than just conceptually articulated awareness. It also requires that my conceptually articulated awareness be accurate or true.`,
      category: 'academic'
    },
    {
      id: 'raven-paradox',
      name: 'The Raven Paradox',
      preview: 'Presumably, logically equivalent statements are confirmationally equivalent...',
      content: `Presumably, logically equivalent statements are confirmationally equivalent. In other words, if two statements entail each other, then anything that one confirms the one statement to a given degree also confirms the other statement to that degree. But this actually seems false when consider statement-pairs such as: (i) All ravens are black, and (ii) All non-black things are non-ravens, which, though logically equivalent, seem to confirmationally equivalent, in that a non-black non-raven confirms (ii) to a high degree but confirms (i) to no degree or at most to a low degree.`,
      category: 'academic'
    }
  ],
  professional: [
    {
      id: 'business-report',
      name: 'Executive Summary',
      preview: 'The quarterly analysis reveals significant market trends...',
      content: `The quarterly analysis reveals significant market trends that warrant immediate strategic consideration. Our primary metrics indicate a 23% increase in customer acquisition costs while retention rates have improved by 8% over the previous quarter. This divergence suggests that while we're attracting higher-quality customers, our acquisition channels may require optimization. The competitive landscape has shifted notably with three new entrants targeting our core demographic, necessitating a reassessment of our value proposition and pricing strategy.`,
      category: 'professional'
    },
    {
      id: 'technical-memo',
      name: 'Technical Memorandum',
      preview: 'Following our evaluation of the proposed system...',
      content: `Following our evaluation of the proposed system architecture, we recommend proceeding with the microservices approach for the following reasons: scalability requirements exceed current monolithic capacity, team structure aligns with service boundaries, and deployment flexibility will reduce risk during updates. However, we must address service discovery complexity and implement robust monitoring before migration. The estimated timeline is 6 months with current resources.`,
      category: 'professional'
    }
  ],
  creative: [
    {
      id: 'narrative-essay',
      name: 'Personal Narrative',
      preview: 'The morning light filtered through the venetian blinds...',
      content: `The morning light filtered through the venetian blinds, casting parallel shadows across the hardwood floor. I had been awake for hours, listening to the city wake up outside my window. First the delivery trucks, then the early commuters, and finally the steady hum of rush hour that would continue until evening. There was something oddly comforting about this routine, this predictable symphony of urban life that had become the soundtrack to my daily existence.`,
      category: 'creative'
    },
    {
      id: 'descriptive-piece',
      name: 'Descriptive Writing',
      preview: 'The marketplace buzzed with an energy that seemed almost electric...',
      content: `The marketplace buzzed with an energy that seemed almost electric. Vendors called out their wares in melodious Arabic, their voices weaving together into a tapestry of commerce and community. The air was thick with the scent of cardamom and cinnamon, turmeric and fresh bread. Colorful fabrics hung from every stall, creating a canopy of silk and cotton that filtered the harsh desert sun into something warm and welcoming.`,
      category: 'creative'
    }
  ]
};

interface GPTBypassSectionNewProps {
  className?: string;
  onSendToMain?: (text: string) => void;
  receivedText?: string;
}

export function GPTBypassSectionNew({ className, onSendToMain, receivedText }: GPTBypassSectionNewProps) {
  const { toast } = useToast();
  
  // State management
  const [inputText, setInputText] = useState('');
  const [styleText, setStyleText] = useState('');
  const [contentMixText, setContentMixText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [selectedWritingSample, setSelectedWritingSample] = useState<string>('formal-functional');
  const [provider, setProvider] = useState('anthropic');
  const [isLoading, setIsLoading] = useState(false);
  const [inputAiScore, setInputAiScore] = useState<number | null>(null);
  const [outputAiScore, setOutputAiScore] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isAnalyzingInput, setIsAnalyzingInput] = useState(false);
  const [isAnalyzingOutput, setIsAnalyzingOutput] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleFileInputRef = useRef<HTMLInputElement>(null);

  // Set default style sample on mount
  useEffect(() => {
    if (!styleText) {
      const defaultSample = WRITING_SAMPLES.academic.find(s => s.id === 'formal-functional');
      if (defaultSample) {
        setStyleText(defaultSample.content);
      }
    }
  }, [styleText]);

  // Handle writing sample selection
  const handleWritingSampleSelect = (sampleId: string) => {
    setSelectedWritingSample(sampleId);
    // Find the sample across all categories
    const allSamples = [...WRITING_SAMPLES.academic, ...WRITING_SAMPLES.professional, ...WRITING_SAMPLES.creative];
    const sample = allSamples.find(s => s.id === sampleId);
    if (sample) {
      setStyleText(sample.content);
      toast({
        title: "Writing sample selected",
        description: `Applied "${sample.name}" as your writing style reference.`,
      });
    }
  };

  // Handle received text from main app
  useEffect(() => {
    if (receivedText) {
      setInputText(receivedText);
      analyzeText(receivedText);
    }
  }, [receivedText]);

  // Auto-analyze input text changes with debouncing
  useEffect(() => {
    if (inputText.trim().length > 100) {
      const timer = setTimeout(() => {
        analyzeText(inputText);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [inputText]);

  // Auto-analyze output text changes with debouncing
  useEffect(() => {
    if (outputText.trim().length > 100) {
      const timer = setTimeout(() => {
        analyzeOutputText(outputText);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [outputText]);

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

  // Handle text analysis for input
  const analyzeText = async (text: string) => {
    if (!text.trim() || text.trim().length < 50) return;

    setIsAnalyzingInput(true);
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
      console.error('Input analysis error:', error);
    } finally {
      setIsAnalyzingInput(false);
    }
  };

  // Handle text analysis for output
  const analyzeOutputText = async (text: string) => {
    if (!text.trim() || text.trim().length < 50) return;

    setIsAnalyzingOutput(true);
    try {
      const response = await fetch('/api/gpt-bypass/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      setOutputAiScore(data.aiScore);
    } catch (error) {
      console.error('Output analysis error:', error);
    } finally {
      setIsAnalyzingOutput(false);
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Re-rewrite failed');
      }

      const data = await response.json();
      setOutputText(data.rewrittenText);
      setOutputAiScore(data.outputAiScore);
      setJobId(data.jobId);

      toast({
        title: "Re-rewrite completed",
        description: `AI score: ${data.outputAiScore}%`,
      });
    } catch (error) {
      toast({
        title: "Re-rewrite failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  // Send to main app
  const sendToMainApp = (text: string) => {
    if (onSendToMain) {
      onSendToMain(text);
      toast({
        title: "Text sent to Genius Dictation",
        description: "Text has been transferred to the main app.",
      });
    }
  };

  return (
    <div className={cn("w-full max-w-7xl mx-auto p-6 space-y-8", className)}>
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-bold tracking-tight">GPT Bypass</h2>
        <p className="text-lg text-muted-foreground">Advanced AI text humanization to bypass detection systems</p>
      </div>

      {/* Instructions & Presets - TOP SECTION */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-xl">Rewrite Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">AI Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                    <SelectItem value="openai">OpenAI GPT-4o</SelectItem>
                    <SelectItem value="perplexity">Perplexity</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Custom Instructions</Label>
                <Textarea
                  placeholder="Add specific rewriting instructions..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="min-h-[120px] text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Instruction Presets</Label>
              <div className="max-h-[280px] overflow-y-auto border rounded-lg p-4 space-y-3">
                {['Core', 'Advanced', 'Combo'].map((category) => (
                  <div key={category} className="space-y-3">
                    <Label className="text-sm font-semibold text-primary">{category}</Label>
                    <div className="grid gap-3">
                      {INSTRUCTION_PRESETS
                        .filter(preset => preset.category === category)
                        .map((preset) => (
                          <div key={preset.id} className="flex items-start space-x-3">
                            <Checkbox
                              id={preset.id}
                              checked={selectedPresets.includes(preset.id)}
                              onCheckedChange={() => togglePreset(preset.id)}
                              className="mt-1"
                            />
                            <div className="grid gap-1 leading-tight">
                              <Label
                                htmlFor={preset.id}
                                className="text-sm font-medium leading-tight cursor-pointer"
                              >
                                {preset.name}
                              </Label>
                              <p className="text-xs text-muted-foreground leading-tight">
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
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <Button
              onClick={handleRewrite}
              disabled={!inputText.trim() || isLoading}
              className="flex-1 h-12 text-base"
              size="lg"
            >
              {isLoading ? 'Processing...' : 'Rewrite Text'}
              <Zap className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={handleReRewrite}
              disabled={!outputText.trim() || isLoading}
              className="h-12 px-6"
              size="lg"
            >
              <RotateCcw className="w-5 h-5" />
              Re-rewrite
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Top Row: Input and Output Boxes - MUCH WIDER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BOX A: Input Text */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-blue-600 flex items-center justify-between">
              <span>BOX A: Input Text</span>
              {inputAiScore !== null && (
                <Badge variant={inputAiScore > 50 ? "destructive" : "secondary"} className="text-sm">
                  {inputAiScore}% AI
                </Badge>
              )}
              {isAnalyzingInput && (
                <Badge variant="outline" className="animate-pulse text-sm">
                  Analyzing...
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" /> Upload
              </Button>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(inputText)}>
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={() => setInputText('')}>
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <input ref={fileInputRef} type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
            <Textarea
              placeholder="Paste your AI-generated text here..."
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                // Auto-analyze when text changes
                if (e.target.value.trim().length > 50) {
                  setTimeout(() => analyzeText(e.target.value), 1000);
                }
              }}
              className="min-h-[400px] text-sm resize-y"
            />
          </CardContent>
        </Card>

        {/* BOX C: Humanized Output */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-purple-600 flex items-center justify-between">
              <span>BOX C: Humanized Output</span>
              {outputAiScore !== null && (
                <Badge variant={outputAiScore > 50 ? "destructive" : "secondary"} className="text-sm">
                  {outputAiScore}% AI
                </Badge>
              )}
              {isAnalyzingOutput && (
                <Badge variant="outline" className="animate-pulse text-sm">
                  Analyzing...
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(outputText)}>
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={() => setOutputText('')}>
                Delete
              </Button>
              <Button variant="outline" size="sm" className="bg-blue-500 text-white hover:bg-blue-600" onClick={() => sendToMainApp(outputText)} disabled={!outputText.trim()}>
                <Send className="w-4 h-4 mr-1" /> Send to Homework
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm">TXT</Button>
              <Button variant="outline" size="sm">Word</Button>
              <Button variant="outline" size="sm">PDF</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Humanized text will appear here..."
              value={outputText}
              onChange={(e) => {
                setOutputText(e.target.value);
                // Auto-analyze output when it changes
                if (e.target.value.trim().length > 50) {
                  setTimeout(() => analyzeOutputText(e.target.value), 1000);
                }
              }}
              className="min-h-[400px] text-sm resize-y bg-muted/20"
            />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Style Sample and Content Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BOX B: Style Sample */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-green-600">BOX B: Style Sample</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-1" /> Upload
              </Button>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(styleText)}>
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={() => setStyleText('')}>
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste a writing sample that demonstrates the style you want to mimic..."
              value={styleText}
              onChange={(e) => setStyleText(e.target.value)}
              className="min-h-[300px] text-sm resize-y"
            />
          </CardContent>
        </Card>

        {/* Content Reference Box (Box C from screenshot) */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-orange-600">Content Reference (Box C)</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-1" /> Upload File
              </Button>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(contentMixText)}>
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={() => setContentMixText('')}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">
              GPTZero AI Detection: Not analyzed
            </div>
            <Textarea
              placeholder="Paste or upload content you want to blend with your text..."
              value={contentMixText}
              onChange={(e) => setContentMixText(e.target.value)}
              className="min-h-[300px] text-sm resize-y"
            />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section with Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Custom Instructions and Writing Sample Dropdown */}
        <div className="space-y-6">
          {/* Custom Instructions */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Custom Instructions</Label>
            <Textarea
              placeholder="Enter specific instructions for how the rewrite should be done..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="min-h-[120px] resize-y"
            />
          </div>

          {/* Writing Sample Dropdown */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Writing Sample</Label>
            <Select value={selectedWritingSample} onValueChange={handleWritingSampleSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="FORMAL AND FUNCTIONAL RELATIONSHIPS (Content-Neutral)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal-functional">FORMAL AND FUNCTIONAL RELATIONSHIPS (Content-Neutral)</SelectItem>
                {Object.entries(WRITING_SAMPLES).map(([category, samples]) => 
                  samples.map((sample) => (
                    <SelectItem key={sample.id} value={sample.id}>
                      {sample.name.toUpperCase()} ({category})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* AI Provider */}
          <div>
            <Label className="text-base font-semibold mb-2 block">AI Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Anthropic Claude" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                <SelectItem value="perplexity">Perplexity</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Humanize Button */}
          <Button
            onClick={handleRewrite}
            disabled={!inputText.trim() || isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 text-lg font-semibold"
          >
            {isLoading ? (
              <>
                <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                HUMANIZING...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                HUMANIZE TEXT
              </>
            )}
          </Button>
        </div>

        {/* Right Side - Humanization Techniques */}
        <div>
          <Label className="text-base font-semibold mb-4 block">Humanization Techniques</Label>
          
          {/* Most Effective Section */}
          <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="font-semibold text-sm">MOST EFFECTIVE (1-6)</span>
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              Add a quick parenthetical or em-dash remark — factual, not jokey.
            </div>
            <div className="space-y-2">
              {INSTRUCTION_PRESETS.slice(0, 8).map((preset) => (
                <div key={preset.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={preset.id}
                    checked={selectedPresets.includes(preset.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPresets([...selectedPresets, preset.id]);
                      } else {
                        setSelectedPresets(selectedPresets.filter(id => id !== preset.id));
                      }
                    }}
                  />
                  <label
                    htmlFor={preset.id}
                    className="text-xs font-medium cursor-pointer hover:text-primary"
                    title={preset.description}
                  >
                    {preset.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Style Tweaks */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-semibold text-sm text-blue-600">Additional Style Tweaks</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {INSTRUCTION_PRESETS.slice(8).map((preset) => (
                <div key={preset.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={preset.id}
                    checked={selectedPresets.includes(preset.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPresets([...selectedPresets, preset.id]);
                      } else {
                        setSelectedPresets(selectedPresets.filter(id => id !== preset.id));
                      }
                    }}
                  />
                  <label
                    htmlFor={preset.id}
                    className="text-xs font-medium cursor-pointer hover:text-primary"
                    title={preset.description}
                  >
                    {preset.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}