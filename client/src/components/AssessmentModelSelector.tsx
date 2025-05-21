import React from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type AssessmentModel = 'openai' | 'anthropic' | 'perplexity';

interface AssessmentModelSelectorProps {
  selectedModel: AssessmentModel;
  onChange: (model: AssessmentModel) => void;
  availableModels: {
    openai: boolean;
    anthropic: boolean;
    perplexity: boolean;
  };
}

export function AssessmentModelSelector({
  selectedModel,
  onChange,
  availableModels
}: AssessmentModelSelectorProps) {
  const handleModelChange = (value: string) => {
    onChange(value as AssessmentModel);
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="assessment-model" className="text-xs whitespace-nowrap">Assessment Provider:</Label>
      <Select
        value={selectedModel}
        onValueChange={handleModelChange}
      >
        <SelectTrigger id="assessment-model" className="h-8 w-[160px]">
          <SelectValue placeholder="Select provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="openai" disabled={!availableModels.openai}>
              OpenAI (GPT-4o)
            </SelectItem>
            <SelectItem value="anthropic" disabled={!availableModels.anthropic}>
              Anthropic (Claude 3)
            </SelectItem>
            <SelectItem value="perplexity" disabled={!availableModels.perplexity}>
              Perplexity (Llama)
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}