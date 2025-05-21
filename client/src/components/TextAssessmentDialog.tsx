import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [customInstructions, setCustomInstructions] = useState('');

  const handleSubmit = () => {
    onSubmitContext(context, customInstructions);
    onClose();
  };

  // Generate human-readable assessment with suggestions
  const getTextAssessment = () => {
    if (!aiResult) return 'No assessment available yet.';

    const { probability, humanLikelihood } = aiResult;

    let assessment = `Preliminary assessment: ${humanLikelihood}. `;

    if (probability > 0.8) {
      assessment += 'This text appears to be AI-generated with high confidence. Consider adding more personal style and voice to make it sound more authentic.';
    } else if (probability > 0.6) {
      assessment += 'This text likely contains AI-generated elements. You might want to revise for a more natural flow and unique expressions.';
    } else if (probability > 0.4) {
      assessment += 'This text shows a mix of AI and human-like elements. Adding more specific details and personal perspectives could improve it.';
    } else if (probability > 0.2) {
      assessment += 'This text appears mostly human-written. Minor refinements in style and structure could enhance it further.';
    } else {
      assessment += 'This text appears authentically human-written. It has good variation and natural language patterns.';
    }

    return assessment;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Text Assessment & Improvement</DialogTitle>
          <DialogDescription>
            Review the preliminary assessment of your text and provide additional context for a more tailored rewrite.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="text-sm bg-secondary/30 p-3 rounded-md border">
            {getTextAssessment()}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="context">Content Context</Label>
            <Input 
              id="context"
              placeholder="e.g., This is a haiku about whales..."
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Apply & Rewrite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}