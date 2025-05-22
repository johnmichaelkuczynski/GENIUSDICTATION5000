import React, { useState } from 'react';
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

export function TextAssessmentDialogNew({
  isOpen,
  onClose,
  originalText,
  aiResult,
  onSubmitContext
}: TextAssessmentDialogProps) {
  // State for form fields
  const [context, setContext] = useState('');
  const [customInstructions, setCustomInstructions] = useState('Rewrite this text with improved readability while preserving the original message and meaning.');
  const [selectedProvider, setSelectedProvider] = useState('openai');

  // Handler for the Apply & Rewrite button
  const handleApplyAndRewrite = () => {
    // Send the context and instructions to the parent component
    onSubmitContext(context, customInstructions);
    // Close the dialog
    onClose();
  };

  // Function to get human likelihood display
  const getHumanLikelihood = () => {
    if (!aiResult) return null;
    
    const isHuman = !aiResult.isAIGenerated;
    return (
      <span className={`font-semibold ${isHuman ? 'text-green-600' : 'text-destructive'}`}>
        {isHuman ? '✓ Likely Human-Written' : '✗ Likely AI-Generated'}
      </span>
    );
  };

  // Generate the formatted assessment report display
  const formatReport = () => {
    if (!aiResult || !aiResult.assessment) return 'No assessment available yet.';

    return (
      <div className="space-y-4">
        <h3 className="text-base font-bold uppercase">Intelligence Assessment Report</h3>
        
        {aiResult.assessment && (
          <div>
            <h4 className="text-sm font-semibold">Analysis</h4>
            <p className="text-sm">{aiResult.assessment}</p>
          </div>
        )}
        
        {aiResult.recommendations && (
          <div>
            <h4 className="text-sm font-semibold">Recommendations</h4>
            <p className="text-sm">{aiResult.recommendations}</p>
          </div>
        )}
        
        {aiResult.errata && aiResult.errata.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold">Errata</h4>
            <ul className="text-sm list-disc pl-5 space-y-1">
              {aiResult.errata.map((err, index) => (
                <li key={index}>
                  <strong>"{err.quote}"</strong> - {err.issue}. 
                  Suggested correction: "{err.correction}"
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-auto">
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

        <div className="space-y-4 py-4">
          {/* Human likelihood indicator */}
          <div className="flex items-center gap-2 text-sm">
            {getHumanLikelihood()}
          </div>
          
          {/* Assessment display - scrollable area for the report */}
          <div className="bg-secondary/20 p-4 rounded-md border overflow-auto max-h-[250px]">
            {formatReport()}
          </div>

          {/* Content Context */}
          <div className="space-y-2">
            <Label htmlFor="context">Content Context</Label>
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

          {/* Custom Rewrite Instructions */}
          <div className="space-y-2">
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

        {/* Action buttons */}
        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              <span className="mr-1">📄</span> Word
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <span className="mr-1">📑</span> PDF
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <span className="mr-1">📝</span> Text
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              className="bg-primary"
              onClick={handleApplyAndRewrite}
            >
              Apply & Rewrite
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}