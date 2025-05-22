import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIDetectionResult } from '@/hooks/useAIDetection';
import { AlertTriangle } from 'lucide-react';

interface TextAssessmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  aiResult: AIDetectionResult | null;
  onSubmitContext: (context: string, instructions: string) => void;
}

export function TextAssessmentDialog({
  isOpen,
  onClose,
  originalText,
  aiResult,
  onSubmitContext
}: TextAssessmentDialogProps) {
  const [context, setContext] = useState('');
  const [customInstructions, setCustomInstructions] = useState('Rewrite this text with improved readability while preserving the original message and meaning.');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  
  // ⚠️ Ensure we're directly logging what's being submitted
  const [debugLog, setDebugLog] = useState('');

  // Reset the form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setContext('');
      setCustomInstructions('Rewrite this text with improved readability while preserving the original message and meaning.');
      // Clear debug log when reopening
      setDebugLog('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    // Get the value directly from the DOM element to ensure we have the current value
    const customInstructions = document.getElementById('fullPrompt')?.value || "";
    
    // Log for debugging
    const submitLog = `EXECUTING SUBMIT with:
Direct instructions: "${customInstructions}"`;
    
    setDebugLog(submitLog);
    console.log(submitLog);
    
    // Use fetch directly to send the raw prompt to the API
    fetch("/api/transform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: originalText,
        instructions: customInstructions
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Transform request failed: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      // Update the app with the transformed text
      console.log("Assessment popup transformation success:", data);
      // Also call the parent's submission handler to maintain backward compatibility
      onSubmitContext("", customInstructions);
    })
    .catch(error => {
      console.error("Assessment popup transformation error:", error);
    });
    
    // Close the dialog after submission
    onClose();
  };
  
  // Generate assessment data for display
  const renderAssessment = () => {
    if (!aiResult) return 'No assessment available';
    
    let sections = [];
    
    // Add the main assessment
    if (aiResult.assessment) {
      sections.push(
        <div key="assessment" className="mb-4">
          <h3 className="text-base font-bold uppercase mb-2">Intelligence Assessment Report</h3>
          <h4 className="text-sm font-semibold mb-1">Analysis</h4>
          <p className="text-sm">{aiResult.assessment}</p>
        </div>
      );
    }
    
    // Add recommendations if available
    if (aiResult.recommendations) {
      sections.push(
        <div key="recommendations" className="mb-4">
          <h4 className="text-sm font-semibold mb-1">Recommendations</h4>
          <p className="text-sm">{aiResult.recommendations}</p>
        </div>
      );
    }
    
    // Add errata if available
    if (aiResult.errata && aiResult.errata.length > 0) {
      sections.push(
        <div key="errata" className="mb-4">
          <h4 className="text-sm font-semibold mb-1">Errata</h4>
          <ul className="text-sm list-disc pl-5 space-y-1">
            {aiResult.errata.map((err, index) => (
              <li key={index}>
                <strong>"{err.quote}"</strong> - {err.issue}. 
                Suggested correction: "{err.correction}"
              </li>
            ))}
          </ul>
        </div>
      );
    }
    
    return sections.length > 0 ? sections : 'No detailed assessment available';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Text Assessment & Improvement</DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Assessment Provider:</span>
              <Select 
                value={selectedProvider} 
                onValueChange={setSelectedProvider}
              >
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogDescription>
            Review your text assessment and provide additional context for a more tailored rewrite.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {aiResult && aiResult.humanLikelihood && (
            <div className="flex items-center gap-2 text-sm">
              <span className={`font-semibold ${aiResult.isAIGenerated ? 'text-destructive' : 'text-green-600'}`}>
                {!aiResult.isAIGenerated ? '✓ Likely Human-Written' : '✗ Likely AI-Generated'}
              </span>
            </div>
          )}
          
          <div className="text-sm bg-secondary/20 p-4 rounded-md border overflow-auto max-h-[250px]">
            {renderAssessment()}
          </div>

          {/* Debug log display - will show exactly what's being submitted */}
          {debugLog && (
            <div className="text-xs p-2 border border-yellow-500 bg-yellow-50 rounded">
              <div className="flex items-center gap-1 text-yellow-700 mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-semibold">Debug information:</span>
              </div>
              <pre className="whitespace-pre-wrap text-xs">{debugLog}</pre>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="fullPrompt" className="flex items-center">
              <span className="font-semibold">Full Rewrite Prompt</span>
              <span className="ml-2 text-xs text-muted-foreground">(direct input to the model)</span>
            </Label>
            <Textarea
              id="fullPrompt"
              className="min-h-[200px] font-mono text-sm"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder={`Please rewrite the following text in a more academic style:
"{{TEXT}}"

Make it clearer and more elegant while preserving the original meaning.`}
            />
            <p className="text-xs text-muted-foreground">
              <code className="bg-yellow-100 text-yellow-800 px-1 rounded text-[10px] font-bold inline-block mr-1">&#123;&#123;TEXT&#125;&#125;</code>
              will be replaced with your original text. Everything else will be sent as-is to the AI model.
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {}} className="text-xs">
              <span className="mr-1">📄</span> Word
            </Button>
            <Button variant="outline" size="sm" onClick={() => {}} className="text-xs">
              <span className="mr-1">📑</span> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => {}} className="text-xs">
              <span className="mr-1">📝</span> Text
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              className="bg-primary"
              onClick={handleSubmit}
            >
              Apply & Rewrite
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}