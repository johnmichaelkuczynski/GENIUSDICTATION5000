import React from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type AssessmentModel = 'deepseek' | 'openai' | 'anthropic' | 'perplexity';

interface AssessmentModelSelectorProps {
  selectedModel: AssessmentModel;
  onChange: (model: AssessmentModel) => void;
  availableModels: {
    deepseek: boolean;
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
    <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-800">
      <Label htmlFor="assessment-model" className="text-sm font-semibold text-blue-800 dark:text-blue-200 whitespace-nowrap">Assessment Provider:</Label>
      <Select
        value={selectedModel}
        onValueChange={handleModelChange}
      >
        <SelectTrigger id="assessment-model" className="h-8 w-[160px] bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-700 font-medium">
          <SelectValue placeholder="Select provider" className="text-blue-700 dark:text-blue-300" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="anthropic" disabled={!availableModels.anthropic} className="font-medium">
              ZHI 1
            </SelectItem>
            <SelectItem value="openai" disabled={!availableModels.openai} className="font-medium">
              ZHI 2
            </SelectItem>
            <SelectItem value="deepseek" disabled={!availableModels.deepseek} className="font-medium">
              ZHI 3
            </SelectItem>
            <SelectItem value="perplexity" disabled={!availableModels.perplexity} className="font-medium">
              ZHI 4
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}