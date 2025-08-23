import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Mic, FileText, Trash2, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalysisResult {
  phase1Response: string;
  phase2Response: string;
  phase3Response: string;
  finalResult: string;
  scores: Record<string, number>;
}

interface IntelligenceAnalysisToolProps {
  onSendToMain?: (text: string) => void;
  onSendToGPTBypass?: (text: string) => void;
  receivedText?: string;
}

interface IntelligenceAnalysisToolRef {
  receiveText: (text: string) => void;
}

export const IntelligenceAnalysisTool = forwardRef<IntelligenceAnalysisToolRef, IntelligenceAnalysisToolProps>(({ onSendToMain, onSendToGPTBypass, receivedText }, ref) => {
  const [documentAText, setDocumentAText] = useState('');
  const [documentBText, setDocumentBText] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('deepseek');
  const [analysisMode, setAnalysisMode] = useState<'single' | 'compare'>('single');
  const [analysisType, setAnalysisType] = useState<'normal' | 'comprehensive'>('normal');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteInstructions, setRewriteInstructions] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [rewrittenText, setRewrittenText] = useState('');
  const { toast } = useToast();

  // Handle received text from other components
  useEffect(() => {
    if (receivedText) {
      setDocumentAText(receivedText);
      toast({
        title: "Text received",
        description: "Text has been added to Document A.",
      });
    }
  }, [receivedText, toast]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    receiveText: (text: string) => {
      setDocumentAText(text);
      toast({
        title: "Text received",
        description: "Text has been added to Document A.",
      });
    }
  }), [toast]);

  // Transfer functions
  const sendToMainApp = useCallback((text: string) => {
    if (onSendToMain) {
      onSendToMain(text);
      toast({
        title: "Text sent to Main App",
        description: "Text has been transferred to the main input.",
      });
    }
  }, [onSendToMain, toast]);

  const sendToGPTBypass = useCallback((text: string) => {
    if (onSendToGPTBypass) {
      onSendToGPTBypass(text);
      toast({
        title: "Text sent to GPT Bypass",
        description: "Text has been transferred for humanization.",
      });
    }
  }, [onSendToGPTBypass, toast]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: 'A' | 'B') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show loading state
    toast({
      title: "Processing document...",
      description: "Extracting text from your document.",
    });

    try {
      // Use proper document extraction for Word docs, PDFs, etc.
      const formData = new FormData();
      formData.append("document", file);
      
      const response = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to process document: ${response.statusText}`);
      }
      
      const data = await response.json();
      const extractedText = data.text;
      
      if (docType === 'A') {
        setDocumentAText(extractedText);
      } else {
        setDocumentBText(extractedText);
      }
      
      toast({
        title: "File uploaded successfully",
        description: `Document ${docType} has been loaded and text extracted.`,
      });
    } catch (error) {
      console.error("Error processing document:", error);
      toast({
        title: "Upload failed",
        description: "Failed to extract text from the document. Please try again.",
        variant: "destructive",
      });
    }
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
          abbreviated: analysisType === 'normal',
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      console.log('Analysis result received:', result);
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
    setRewriteInstructions('');
    setShowComparison(false);
    setOriginalText('');
    setRewrittenText('');
    toast({
      title: "Reset complete",
      description: "All documents and results have been cleared.",
    });
  };

  const acceptRewrite = () => {
    setDocumentAText(rewrittenText);
    setShowComparison(false);
    setOriginalText('');
    setRewrittenText('');
    toast({
      title: "Rewrite accepted",
      description: "Document A has been updated with the rewritten text.",
    });
  };

  const rejectRewrite = () => {
    setShowComparison(false);
    setOriginalText('');
    setRewrittenText('');
    toast({
      title: "Rewrite rejected",
      description: "Original text has been kept.",
    });
  };

  const runIntelligentRewrite = async () => {
    if (!documentAText.trim()) {
      toast({
        title: "No text to rewrite",
        description: "Please add text to Document A before running rewrite.",
        variant: "destructive",
      });
      return;
    }

    setIsRewriting(true);

    try {
      const response = await fetch('/api/intelligent-rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: documentAText,
          customInstructions: rewriteInstructions.trim() || undefined,
          provider: selectedProvider,
        }),
      });

      if (!response.ok) {
        throw new Error('Rewrite failed');
      }

      const result = await response.json();
      
      // Store both texts for comparison
      setOriginalText(documentAText);
      setRewrittenText(result.rewrittenText);
      setShowComparison(true);
      
      toast({
        title: "Rewrite complete",
        description: "View the side-by-side comparison and choose which version to keep.",
      });
    } catch (error) {
      toast({
        title: "Rewrite failed",
        description: "There was an error rewriting the text.",
        variant: "destructive",
      });
    } finally {
      setIsRewriting(false);
    }
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
                    <SelectItem value="deepseek">ZHI 3</SelectItem>
                    <SelectItem value="openai">ZHI 2</SelectItem>
                    <SelectItem value="anthropic">ZHI 1</SelectItem>
                    <SelectItem value="perplexity">ZHI 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">
                  Provider Status:
                </label>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    ZHI 3: {getProviderStatus('deepseek')}
                  </Badge>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    ZHI 2: {getProviderStatus('openai')}
                  </Badge>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    ZHI 1: {getProviderStatus('anthropic')}
                  </Badge>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    ZHI 4: {getProviderStatus('perplexity')}
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
            <div className="flex gap-2 mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => sendToMainApp(documentAText)}
                disabled={!documentAText.trim()}
              >
                Send to Main App
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => sendToGPTBypass(documentAText)}
                disabled={!documentAText.trim()}
              >
                Send to GPT Bypass
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

          {/* Rewrite Instructions */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">
                Custom Rewrite Instructions (Optional)
              </label>
              <Textarea
                placeholder="Leave empty for default intelligence optimization, or enter custom instructions..."
                value={rewriteInstructions}
                onChange={(e) => setRewriteInstructions(e.target.value)}
                className="min-h-20"
              />
              <p className="text-xs text-slate-500 mt-1">
                Default: Optimize text for higher intelligence evaluation scores while preserving content.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {/* Analysis Type Toggle */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => setAnalysisType('normal')}
              variant={analysisType === 'normal' ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
            >
              Normal (Phase 1)
            </Button>
            <Button
              onClick={() => setAnalysisType('comprehensive')}
              variant={analysisType === 'comprehensive' ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
            >
              Comprehensive (All Phases)
            </Button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={runIntelligenceAnalysis}
              disabled={isAnalyzing || isRewriting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAnalyzing ? 'Analyzing...' : `Analyze Document (${analysisType === 'normal' ? 'Quick' : 'Full'})`}
            </Button>
            <Button 
              onClick={runOriginalityAnalysis}
              disabled={isAnalyzing || isRewriting}
              className="bg-green-600 hover:bg-green-700"
            >
              How Well Does It Make Its Case?
            </Button>
            <Button variant="outline" disabled={isAnalyzing || isRewriting}>
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
            <Button 
              onClick={runIntelligentRewrite}
              disabled={isAnalyzing || isRewriting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isRewriting ? 'Rewriting...' : 'Rewrite'}
            </Button>
            <Button 
              variant="destructive"
              onClick={resetEverything}
              disabled={isAnalyzing || isRewriting}
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
                    <div className="whitespace-pre-wrap bg-black text-green-400 p-6 rounded-lg border-4 border-green-500 font-mono text-lg">
                      {analysisResult.phase1Response || 'No Phase 1 response available'}
                    </div>
                  </TabsContent>
                  <TabsContent value="phase2">
                    <div className="whitespace-pre-wrap bg-black text-cyan-400 p-6 rounded-lg border-4 border-cyan-500 font-mono text-lg">
                      {analysisResult.phase2Response || 'No Phase 2 response available'}
                    </div>
                  </TabsContent>
                  <TabsContent value="phase3">
                    <div className="whitespace-pre-wrap bg-black text-yellow-400 p-6 rounded-lg border-4 border-yellow-500 font-mono text-lg">
                      {analysisResult.phase3Response || 'No Phase 3 response available'}
                    </div>
                  </TabsContent>
                  <TabsContent value="final">
                    <div className="whitespace-pre-wrap bg-black text-red-400 p-6 rounded-lg border-4 border-red-500 font-mono text-lg">
                      {analysisResult.finalResult || 'No final result available'}
                    </div>
                  </TabsContent>
                  <TabsContent value="scores">
                    <div className="grid grid-cols-2 gap-4">
                      {analysisResult.scores && Object.keys(analysisResult.scores).length > 0 ? (
                        Object.entries(analysisResult.scores).map(([key, score]) => (
                          <div key={key} className="bg-purple-900 text-white p-4 rounded-lg border-4 border-purple-500">
                            <div className="font-bold text-purple-200 text-xl">{key.replace(/_/g, ' ').toUpperCase()}</div>
                            <div className="text-4xl font-black text-yellow-300">{score}/100</div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-slate-500">No scores available</div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Comparison Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] w-full h-full flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-2xl font-bold">Rewrite Comparison</DialogTitle>
            <DialogDescription>
              Review the original text and the optimized rewrite side by side. Choose which version to keep.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
            {/* Original Text */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-lg font-semibold text-slate-700">Original Text</h3>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  {originalText.split(/\s+/).filter(word => word.length > 0).length} words
                </Badge>
              </div>
              <div className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-lg p-4 overflow-y-auto min-h-0">
                <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                  {originalText}
                </div>
              </div>
            </div>

            {/* Rewritten Text */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-lg font-semibold text-slate-700">Optimized Rewrite</h3>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  {rewrittenText.split(/\s+/).filter(word => word.length > 0).length} words
                </Badge>
              </div>
              <div className="flex-1 bg-green-50 border-2 border-green-200 rounded-lg p-4 overflow-y-auto min-h-0">
                <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">
                  {rewrittenText}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t flex-shrink-0">
            <Button 
              onClick={acceptRewrite}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Accept Rewrite
            </Button>
            <Button 
              onClick={rejectRewrite}
              variant="outline"
              className="flex-1 border-slate-300 hover:bg-slate-50"
            >
              Keep Original
            </Button>
            <Button 
              onClick={() => sendToMainApp(rewrittenText)}
              variant="outline"
              className="bg-blue-50 border-blue-300 hover:bg-blue-100"
            >
              Send to Main App
            </Button>
            <Button 
              onClick={() => sendToGPTBypass(rewrittenText)}
              variant="outline"
              className="bg-purple-50 border-purple-300 hover:bg-purple-100"
            >
              Send to GPT Bypass
            </Button>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setShowComparison(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});