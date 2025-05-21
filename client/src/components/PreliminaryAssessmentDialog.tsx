import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { AssessmentModelSelector, AssessmentModel } from './AssessmentModelSelector';

interface PreliminaryAssessmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  onSubmitContext: (context: string, instructions: string) => void;
}

export function PreliminaryAssessmentDialog({
  isOpen,
  onClose,
  originalText,
  onSubmitContext
}: PreliminaryAssessmentDialogProps) {
  const [context, setContext] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessment, setAssessment] = useState('');
  const [assessmentScore, setAssessmentScore] = useState(0);
  const [fullReport, setFullReport] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<AssessmentModel>('openai');
  const [availableModels, setAvailableModels] = useState({
    openai: false,
    anthropic: false,
    perplexity: false
  });
  const { toast } = useToast();

  // Check available models and run assessment when dialog opens
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        setAvailableModels({
          openai: data.services.openai,
          anthropic: data.services.anthropic,
          perplexity: data.services.perplexity
        });
        
        // Set default model based on availability
        if (data.services.openai) {
          setSelectedModel('openai');
        } else if (data.services.anthropic) {
          setSelectedModel('anthropic');
        } else if (data.services.perplexity) {
          setSelectedModel('perplexity');
        }
      } catch (error) {
        console.error('Error checking API status:', error);
      }
    };
    
    checkApiStatus();
    
    if (isOpen && originalText.trim().length >= 50) {
      handleGetAssessment();
    }
  }, [isOpen, originalText]);

  const handleSubmit = () => {
    onSubmitContext(context, customInstructions);
    onClose();
  };

  const handleGetAssessment = async () => {
    if (!originalText || originalText.trim().length < 50) {
      toast({
        title: "Not enough text",
        description: "Please provide at least 50 characters of text for assessment.",
        variant: "destructive"
      });
      return;
    }

    setIsAssessing(true);
    setAssessment('');

    try {
      const response = await fetch("/api/detect-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          text: originalText,
          provider: selectedModel 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Assessment error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Set the assessment text and score
      setAssessment(result.assessment || getDefaultAssessment(result.probability));
      setAssessmentScore(result.probability * 100);
      setFullReport(result);
    } catch (error) {
      console.error("Error getting assessment:", error);
      
      toast({
        title: "Assessment Failed",
        description: error instanceof Error ? error.message : "Failed to assess text",
        variant: "destructive"
      });
      
      // Set default assessment
      setAssessment("Unable to assess your text at this time. You can still provide context and custom instructions for rewriting.");
    } finally {
      setIsAssessing(false);
    }
  };

  // Generate a default assessment if the API doesn't provide one
  const getDefaultAssessment = (probability: number): string => {
    if (probability > 0.8) {
      return "This text appears to be AI-generated with high confidence. It may lack the natural variance and personal style of human writing. Consider adding more personal voice, unique expressions, and varying your sentence structure to make it more authentic.";
    } else if (probability > 0.6) {
      return "This text likely contains AI-generated elements. While it's well-structured, it may benefit from more distinctive phrasing and personal perspectives. Try incorporating more of your unique voice and experiences.";
    } else if (probability > 0.4) {
      return "This text shows a balance of AI and human-like qualities. It has decent structure but could benefit from more specific details and personal insights to increase its authenticity and impact.";
    } else if (probability > 0.2) {
      return "This text appears mostly human-written. It has good natural variation, though some sections might be refined for stronger personal voice. Consider enhancing specific points with concrete examples or unique perspectives.";
    } else {
      return "This text demonstrates characteristics of authentic human writing, with natural variation in structure and expression. It has a good balance of complexity and clarity, with a distinctive personal voice.";
    }
  };

  // Get color class based on probability
  const getColorClass = () => {
    if (assessmentScore < 30) return 'text-green-600';
    if (assessmentScore < 70) return 'text-yellow-500';
    return 'text-red-600';
  };

  // Get icon based on probability
  const getIcon = () => {
    if (assessmentScore < 30) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (assessmentScore < 70) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Text Assessment & Improvement</DialogTitle>
          <DialogDescription>
            Review your text assessment and provide additional context for a more tailored rewrite.
          </DialogDescription>
          <div className="mt-4 flex items-center justify-end">
            <AssessmentModelSelector
              selectedModel={selectedModel}
              onChange={setSelectedModel}
              availableModels={availableModels}
            />
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {isAssessing ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your text...</p>
            </div>
          ) : assessment ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getIcon()}
                  <span className={`font-medium ${getColorClass()}`}>
                    {assessmentScore < 30 ? 'Likely Human-Written' : 
                    assessmentScore < 70 ? 'Mixed Elements' : 'Likely AI-Generated'}
                  </span>
                </div>
                
                {fullReport?.intelligenceScore && (
                  <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md">
                    <span className="text-xs font-semibold">Intelligence Score:</span>
                    <span className="text-sm font-bold">{fullReport.intelligenceScore}/100</span>
                  </div>
                )}
              </div>
              
              <Progress value={assessmentScore} 
                className={`h-2 ${
                  assessmentScore < 30 ? 'bg-green-600' : 
                  assessmentScore < 70 ? 'bg-yellow-500' : 
                  'bg-red-600'
                }`} 
              />
              
              {/* Formal Assessment Report */}
              <div className="overflow-y-auto max-h-96 text-sm border rounded-md">
                <div className="p-3 bg-secondary text-secondary-foreground font-semibold border-b">
                  INTELLIGENCE ASSESSMENT REPORT
                </div>
                
                {fullReport?.surfaceAnalysis ? (
                  <div className="p-3 border-b">
                    <h3 className="font-medium mb-2">Surface-Level Analysis</h3>
                    <div className="space-y-1 text-xs">
                      {fullReport.surfaceAnalysis.grammar && (
                        <div className="flex justify-between">
                          <span>Grammar and Syntax:</span>
                          <span className="font-medium">{fullReport.surfaceAnalysis.grammar}</span>
                        </div>
                      )}
                      {fullReport.surfaceAnalysis.lexicalPrecision && (
                        <div className="flex justify-between">
                          <span>Lexical Precision:</span>
                          <span className="font-medium">{fullReport.surfaceAnalysis.lexicalPrecision}</span>
                        </div>
                      )}
                      {fullReport.surfaceAnalysis.stylistic && (
                        <div className="flex justify-between">
                          <span>Stylistic Control:</span>
                          <span className="font-medium">{fullReport.surfaceAnalysis.stylistic}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
                
                {fullReport?.deepAnalysis ? (
                  <div className="p-3 border-b">
                    <h3 className="font-medium mb-2">Deep-Level Analysis</h3>
                    <div className="space-y-1 text-xs">
                      {fullReport.deepAnalysis.conceptualDepth && (
                        <div className="flex justify-between">
                          <span>Conceptual Depth:</span>
                          <span className="font-medium">{fullReport.deepAnalysis.conceptualDepth}</span>
                        </div>
                      )}
                      {fullReport.deepAnalysis.logicalStructure && (
                        <div className="flex justify-between">
                          <span>Logical Structure:</span>
                          <span className="font-medium">{fullReport.deepAnalysis.logicalStructure}</span>
                        </div>
                      )}
                      {fullReport.deepAnalysis.originality && (
                        <div className="flex justify-between">
                          <span>Originality:</span>
                          <span className="font-medium">{fullReport.deepAnalysis.originality}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
                
                {fullReport?.psychologicalProfile ? (
                  <div className="p-3 border-b">
                    <h3 className="font-medium mb-2">Psychological Profile</h3>
                    <p className="text-xs">{fullReport.psychologicalProfile}</p>
                  </div>
                ) : null}
                
                <div className="p-3 border-b">
                  <h3 className="font-medium mb-2">Analysis</h3>
                  <p className="text-xs whitespace-pre-line">{fullReport?.assessment || assessment}</p>
                </div>
                <div className="p-3">
                  <h3 className="font-medium mb-2">Recommendations</h3>
                  <p className="text-xs whitespace-pre-line">{fullReport?.recommendations || "No specific recommendations available."}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-4 text-center">
              No assessment available yet. Click "Get New Assessment" to analyze your text.
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="context">Content Context</Label>
            <Textarea
              id="context"
              placeholder="e.g., This is a haiku about whales..."
              className="min-h-[100px]"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Provide context about what this text is meant to be
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instructions">Custom Rewrite Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="e.g., Rewrite as a Shakespearean sonnet about whales incorporating modern scientific information..."
              className="min-h-[100px]"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Add specific instructions for how you want the text to be rewritten
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleGetAssessment}
            disabled={isAssessing || !originalText || originalText.length < 50}
            className="mr-auto"
          >
            Get New Assessment
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Apply & Rewrite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}