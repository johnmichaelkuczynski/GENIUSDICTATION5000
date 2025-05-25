import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { 
  AlertCircle, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Download, 
  FileText, 
  Send
} from 'lucide-react';
import { AssessmentModelSelector, AssessmentModel } from './AssessmentModelSelector';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ManualAssessmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  onSubmitContext: (context: string, instructions: string) => void;
}

export function ManualAssessmentDialog({
  isOpen,
  onClose,
  originalText,
  onSubmitContext
}: ManualAssessmentDialogProps) {
  const [context, setContext] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessment, setAssessment] = useState('');
  const [assessmentScore, setAssessmentScore] = useState(0);
  const [fullReport, setFullReport] = useState<{
    isAIGenerated?: boolean;
    probability?: number;
    burstiness?: number;
    humanLikelihood?: string;
    assessment?: string;
    recommendations?: string;
    errata?: Array<{quote: string; issue: string; correction: string}>;
    intelligenceScore?: number;
    surfaceAnalysis?: Record<string, any>;
    deepAnalysis?: Record<string, any>;
    psychologicalProfile?: string;
    rawResponse?: any;
  } | null>(null);
  const [selectedModel, setSelectedModel] = useState<AssessmentModel>('openai');
  const [expandedReport, setExpandedReport] = useState(false);
  const [availableModels, setAvailableModels] = useState({
    openai: false,
    anthropic: false,
    perplexity: false
  });
  const { toast } = useToast();

  // Check API status and automatically run assessment when dialog opens
  useEffect(() => {
    if (isOpen) {
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
          
          // Automatically run assessment when dialog opens
          if (originalText && originalText.trim().length >= 50) {
            handleGetAssessment();
          }
        } catch (error) {
          console.error('Error checking API status:', error);
        }
      };
      
      checkApiStatus();
    }
  }, [isOpen, originalText]);

  const handleSubmit = () => {
    // Make sure we're passing non-empty values
    const finalContext = context.trim();
    const finalInstructions = customInstructions.trim();
    
    if (finalContext || finalInstructions) {
      // Call the parent function with context and instructions
      onSubmitContext(finalContext, finalInstructions);
      
      // Show confirmation toast
      toast({
        title: "Instructions Applied",
        description: "Your context and instructions will be used for text transformation.",
        duration: 3000,
      });
    }
    
    // Close the dialog
    onClose();
  };
  
  const getHumanLikelihood = () => {
    const score = assessmentScore;
    
    if (score < 20) return "Very High (Likely Human)";
    if (score < 40) return "High";
    if (score < 60) return "Moderate";
    if (score < 80) return "Low";
    return "Very Low (Likely AI)";
  };
  
  // Generate the report content
  const generateReportContent = () => {
    if (!fullReport && !assessment) return '';
    
    let reportContent = '';
    const currentDate = new Date().toLocaleString();
    
    // Create a detailed report 
    reportContent += "INTELLIGENCE ASSESSMENT REPORT\n";
    reportContent += `Date: ${currentDate}\n`;
    reportContent += "==================================\n\n";
    
    if (fullReport?.intelligenceScore) {
      reportContent += `INTELLIGENCE SCORE: ${fullReport.intelligenceScore}/100\n\n`;
    }
    
    reportContent += `PROBABILITY OF AI-GENERATED: ${Math.round(assessmentScore)}%\n`;
    reportContent += `HUMAN LIKELIHOOD: ${getHumanLikelihood()}\n\n`;
    
    reportContent += "SURFACE-LEVEL ANALYSIS\n";
    reportContent += "==================================\n";
    if (fullReport?.surfaceAnalysis) {
      Object.entries(fullReport.surfaceAnalysis).forEach(([key, value]) => {
        reportContent += `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}\n`;
      });
    }
    reportContent += "\n";
    
    reportContent += "DEEP-LEVEL ANALYSIS\n";
    reportContent += "==================================\n";
    if (fullReport?.deepAnalysis) {
      Object.entries(fullReport.deepAnalysis).forEach(([key, value]) => {
        reportContent += `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}\n`;
      });
    }
    reportContent += "\n";
    
    if (fullReport?.psychologicalProfile) {
      reportContent += "PSYCHOLOGICAL PROFILE\n";
      reportContent += "==================================\n";
      reportContent += fullReport.psychologicalProfile + "\n\n";
    }
    
    if (fullReport?.errata && fullReport.errata.length > 0) {
      reportContent += "ERRATA & CORRECTIONS\n";
      reportContent += "==================================\n";
      fullReport.errata.forEach((item: {quote: string; issue: string; correction: string}, index: number) => {
        reportContent += `${index + 1}. "${item.quote}"\n`;
        reportContent += `   Issue: ${item.issue}\n`;
        reportContent += `   Correction: ${item.correction}\n\n`;
      });
      reportContent += "\n";
    }
    
    reportContent += "DETAILED ASSESSMENT\n";
    reportContent += "==================================\n";
    reportContent += (fullReport?.assessment || assessment) + "\n\n";
    
    reportContent += "RECOMMENDATIONS\n";
    reportContent += "==================================\n";
    reportContent += (fullReport?.recommendations || 
      "Consider adding more specific examples to illustrate key points. Enhance clarity by simplifying complex sentences and using more direct language.") + "\n";
      
    return reportContent;
  };
  
  // Download report in specified format
  const handleDownloadReport = async (format: 'txt' | 'docx' | 'pdf' = 'docx') => {
    if (!fullReport && !assessment) return;
    
    const reportContent = generateReportContent();
    const fileName = `intelligence-assessment-${new Date().toISOString().slice(0, 10)}`;
    
    try {
      if (format === 'txt') {
        // Download as plain text
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Use server-side generation for DOCX and PDF
        const response = await fetch("/api/generate-assessment-report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ 
            text: reportContent,
            format,
            fileName
          })
        });
        
        if (!response.ok) {
          throw new Error(`Document generation failed: ${response.status}`);
        }
        
        // Get blob from response and download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      toast({
        title: "Report Downloaded",
        description: `The assessment report has been downloaded in ${format.toUpperCase()} format.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error generating document:", error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to generate document",
        variant: "destructive"
      });
    }
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
                    <h3 className="font-medium mb-2">Deep Analysis</h3>
                    <Accordion type="single" collapsible className="w-full text-xs">
                      {Object.entries(fullReport.deepAnalysis).map(([key, value]) => (
                        <AccordionItem value={key} key={key}>
                          <AccordionTrigger className="text-xs py-2 hover:no-underline">
                            {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="text-xs space-y-2">
                              <p>{value.assessment}</p>
                              {value.quotedExamples && value.quotedExamples.length > 0 && (
                                <div className="mt-2">
                                  <div className="font-medium">Supporting Examples:</div>
                                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                                    {value.quotedExamples.map((example: string, idx: number) => (
                                      <li key={idx}>{example}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ) : null}
                
                {fullReport?.errata && fullReport.errata.length > 0 ? (
                  <div className="p-3 border-b">
                    <h3 className="font-medium mb-2">Errata & Suggestions</h3>
                    <div className="space-y-2 text-xs">
                      {fullReport.errata.map((item, idx) => (
                        <div key={idx} className="border-l-2 border-yellow-500 pl-2 py-1">
                          <div className="font-medium">"{item.quote}"</div>
                          <div className="text-muted-foreground">{item.issue}</div>
                          <div className="text-green-600">Suggestion: {item.correction}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                
                <div className="p-3 border-b">
                  <h3 className="font-medium mb-2">Assessment</h3>
                  <p className="text-xs">{fullReport?.assessment || assessment}</p>
                </div>
                
                {fullReport?.recommendations && (
                  <div className="p-3">
                    <h3 className="font-medium mb-2">Recommendations</h3>
                    <p className="text-xs">{fullReport.recommendations}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-muted/50 rounded-md flex flex-col items-center justify-center text-center space-y-3">
              <Button 
                onClick={handleGetAssessment} 
                disabled={!originalText || originalText.length < 50}
                className="w-full max-w-xs"
              >
                Get Assessment
              </Button>
              <p className="text-xs text-muted-foreground">
                Click to analyze your text and get a detailed intelligence assessment.
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="context">Content Context</Label>
            <Textarea
              id="context"
              placeholder="Provide context about your text (e.g., 'This is a philosophy essay about Kant's categorical imperative')"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="custom-instructions">Custom Rewriting Instructions</Label>
            <Textarea
              id="custom-instructions"
              placeholder="Add specific instructions for how the text should be rewritten (e.g., 'Rewrite to be more accessible for a general audience, while preserving philosophical depth')"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="min-h-[80px]"
            />
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
          
          {assessment && fullReport && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleDownloadReport('docx')}
                className="flex items-center gap-1"
                size="sm"
              >
                <FileText className="h-3.5 w-3.5" />
                Word
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDownloadReport('pdf')}
                className="flex items-center gap-1"
                size="sm"
              >
                <FileText className="h-3.5 w-3.5" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDownloadReport('txt')}
                className="flex items-center gap-1"
                size="sm"
              >
                <Download className="h-3.5 w-3.5" />
                Text
              </Button>
            </div>
          )}
          
          <Button onClick={handleSubmit} disabled={!context && !customInstructions}>
            <Send className="h-4 w-4 mr-2" />
            Apply Context
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}