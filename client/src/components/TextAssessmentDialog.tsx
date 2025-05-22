import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIDetectionResult } from '@/hooks/useAIDetection';

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

  // Reset the form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setContext('');
      setCustomInstructions('Rewrite this text with improved readability while preserving the original message and meaning.');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    // Direct execution of rewrite with custom instructions
    console.log("SUBMITTING INSTRUCTIONS:", customInstructions);
    onSubmitContext(context, customInstructions);
    onClose();
  };

  // Display full assessment report with recommendations
  const displayAssessmentReport = () => {
    if (!aiResult || !aiResult.assessment) return 'No assessment available yet.';

    // Structure the report with headers
    let report = '';
    
    // Add analysis section
    if (aiResult.assessment) {
      report += '<h3>INTELLIGENCE ASSESSMENT REPORT</h3>';
      report += '<h4>Analysis</h4>';
      report += `<p>${aiResult.assessment}</p>`;
    }
    
    // Add recommendations section
    if (aiResult.recommendations) {
      report += '<h4>Recommendations</h4>';
      report += `<p>${aiResult.recommendations}</p>`;
    }
    
    // If we have errata, add them
    if (aiResult.errata && aiResult.errata.length > 0) {
      report += '<h4>Errata</h4>';
      report += '<ul>';
      aiResult.errata.forEach(err => {
        report += `<li><strong>"${err.quote}"</strong> - ${err.issue}. Suggested correction: "${err.correction}"</li>`;
      });
      report += '</ul>';
    }
    
    return report;
  };

  // Convert HTML to React-friendly content
  const createMarkup = () => {
    return { __html: displayAssessmentReport() };
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
          
          <div className={`text-sm bg-secondary/20 p-4 rounded-md border overflow-auto max-h-[250px] prose prose-sm`}>
            <div dangerouslySetInnerHTML={createMarkup()} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="context">Context Context</Label>
            <Textarea
              id="context"
              placeholder="e.g., This is a haiku about whales..."
              className="min-h-[80px]"
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