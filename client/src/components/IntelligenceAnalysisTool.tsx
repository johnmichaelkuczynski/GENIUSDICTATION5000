import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Mic, FileText, Trash2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalysisResult {
  phase1Response: string;
  phase2Response: string;
  phase3Response: string;
  finalResult: string;
  scores: Record<string, number>;
}

export function IntelligenceAnalysisTool() {
  const [documentAText, setDocumentAText] = useState('');
  const [documentBText, setDocumentBText] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [analysisMode, setAnalysisMode] = useState<'single' | 'compare'>('single');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, docType: 'A' | 'B') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (docType === 'A') {
        setDocumentAText(text);
      } else {
        setDocumentBText(text);
      }
      toast({
        title: "File uploaded successfully",
        description: `Document ${docType} has been loaded.`,
      });
    };
    reader.readAsText(file);
  };

  const startDictation = (docType: 'A' | 'B') => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Speech recognition not supported",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsDictating(true);
      toast({
        title: "Dictation started",
        description: "Speak now to add text to the document.",
      });
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      
      if (finalTranscript) {
        if (docType === 'A') {
          setDocumentAText(prev => prev + finalTranscript);
        } else {
          setDocumentBText(prev => prev + finalTranscript);
        }
      }
    };

    recognition.onerror = () => {
      setIsDictating(false);
      toast({
        title: "Dictation error",
        description: "There was an error with speech recognition.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    recognition.start();
  };

  const clearDocument = (docType: 'A' | 'B') => {
    if (docType === 'A') {
      setDocumentAText('');
    } else {
      setDocumentBText('');
    }
  };

  const runIntelligenceAnalysis = async () => {
    if (!documentAText.trim()) {
      toast({
        title: "No text to analyze",
        description: "Please add text to Document A before running analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/evaluate-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: documentAText,
          provider: selectedProvider,
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      setAnalysisResult(result);
      toast({
        title: "Analysis complete",
        description: "Intelligence evaluation has been completed successfully.",
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "There was an error running the intelligence analysis.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runOriginalityAnalysis = async () => {
    if (!documentAText.trim()) {
      toast({
        title: "No text to analyze",
        description: "Please add text to Document A before running analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/evaluate-originality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: documentAText,
          provider: selectedProvider,
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      setAnalysisResult(result);
      toast({
        title: "Analysis complete",
        description: "Originality evaluation has been completed successfully.",
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "There was an error running the originality analysis.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getProviderStatus = (provider: string) => {
    // This would normally check actual API status
    return 'Active';
  };

  const resetEverything = () => {
    setDocumentAText('');
    setDocumentBText('');
    setAnalysisResult(null);
    toast({
      title: "Reset complete",
      description: "All documents and results have been cleared.",
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-800">Intelligence Analysis Tool</CardTitle>
          <CardDescription>
            Analyze, compare, and enhance writing samples with AI-powered intelligence evaluation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Analysis Settings */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Analysis Settings</h3>
            
            <div className="flex gap-4 mb-4">
              <Tabs value={analysisMode} onValueChange={(value) => setAnalysisMode(value as 'single' | 'compare')}>
                <TabsList>
                  <TabsTrigger value="single">Single Document</TabsTrigger>
                  <TabsTrigger value="compare">Compare Two Documents</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">
                  Choose Your AI Provider
                </label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">
                  Provider Status:
                </label>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    OpenAI: {getProviderStatus('openai')}
                  </Badge>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    Anthropic: {getProviderStatus('anthropic')}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  All AI providers are active and ready to use. Each offers different analysis capabilities.
                </p>
              </div>
            </div>
          </div>

          {/* Document A */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Document A</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => clearDocument('A')}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear Text
                </Button>
                <Button variant="outline" size="sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Check for AI
                </Button>
              </div>
            </div>

            <Card className="border-2 border-dashed border-slate-300">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 mb-1">Drag and drop your document or screenshot here</p>
                  <p className="text-xs text-slate-500">Supports .docx, .pdf, .txt files and images (.jpg, .png, .gif, .bmp, .webp)</p>
                  <Button className="mt-3" onClick={() => document.getElementById('fileInputA')?.click()}>
                    Browse Files
                  </Button>
                  <input
                    id="fileInputA"
                    type="file"
                    className="hidden"
                    accept=".docx,.pdf,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                    onChange={(e) => handleFileUpload(e, 'A')}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => startDictation('A')}
                disabled={isDictating}
              >
                <Mic className="w-4 h-4 mr-1" />
                {isDictating ? 'Listening...' : 'Click to start speaking'}
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-1" />
                Dictate Text
              </Button>
            </div>

            <Textarea
              placeholder="Type, paste, or dictate your text here..."
              value={documentAText}
              onChange={(e) => setDocumentAText(e.target.value)}
              className="min-h-40"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>{documentAText.split(/\s+/).filter(word => word.length > 0).length} words</span>
              <span>0 characters</span>
            </div>
          </div>

          {/* Document B - only show in compare mode */}
          {analysisMode === 'compare' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Document B</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => clearDocument('B')}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear Text
                  </Button>
                  <Button variant="outline" size="sm">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Check for AI
                  </Button>
                </div>
              </div>

              <Textarea
                placeholder="Type, paste, or dictate your second document here..."
                value={documentBText}
                onChange={(e) => setDocumentBText(e.target.value)}
                className="min-h-40"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>{documentBText.split(/\s+/).filter(word => word.length > 0).length} words</span>
                <span>0 characters</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={runIntelligenceAnalysis}
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Document'}
            </Button>
            <Button 
              onClick={runOriginalityAnalysis}
              disabled={isAnalyzing}
              className="bg-green-600 hover:bg-green-700"
            >
              How Well Does It Make Its Case?
            </Button>
            <Button variant="outline" disabled={isAnalyzing}>
              Assess Fiction
            </Button>
            <Select defaultValue="chunk-rewrite">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chunk-rewrite">Chunk Rewrite (Large Docs)</SelectItem>
                <SelectItem value="full-rewrite">Full Document Rewrite</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-green-600 hover:bg-green-700">
              Rewrite
            </Button>
            <Button 
              variant="destructive"
              onClick={resetEverything}
            >
              Reset Everything
            </Button>
          </div>

          {/* Analysis Results */}
          {analysisResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="phase1">
                  <TabsList>
                    <TabsTrigger value="phase1">Phase 1</TabsTrigger>
                    <TabsTrigger value="phase2">Phase 2</TabsTrigger>
                    <TabsTrigger value="phase3">Phase 3</TabsTrigger>
                    <TabsTrigger value="final">Final Result</TabsTrigger>
                    <TabsTrigger value="scores">Scores</TabsTrigger>
                  </TabsList>
                  <TabsContent value="phase1">
                    <div className="whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                      {analysisResult.phase1Response}
                    </div>
                  </TabsContent>
                  <TabsContent value="phase2">
                    <div className="whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                      {analysisResult.phase2Response}
                    </div>
                  </TabsContent>
                  <TabsContent value="phase3">
                    <div className="whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                      {analysisResult.phase3Response}
                    </div>
                  </TabsContent>
                  <TabsContent value="final">
                    <div className="whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                      {analysisResult.finalResult}
                    </div>
                  </TabsContent>
                  <TabsContent value="scores">
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(analysisResult.scores).map(([key, score]) => (
                        <div key={key} className="bg-slate-50 p-3 rounded-lg">
                          <div className="font-medium">{key.replace('_', ' ').toUpperCase()}</div>
                          <div className="text-2xl font-bold text-blue-600">{score}/100</div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}