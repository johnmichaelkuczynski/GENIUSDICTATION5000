import React from 'react';
import { Button } from '@/components/ui/button';
import { AIDetectionResult } from '@/hooks/useAIDetection';
import { Progress } from '@/components/ui/progress';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AIDetectionIndicatorProps {
  result: AIDetectionResult | null;
  isDetecting: boolean;
  onRequestDetection: () => void;
}

export function AIDetectionIndicator({ 
  result, 
  isDetecting, 
  onRequestDetection
}: AIDetectionIndicatorProps) {
  // Return nothing if there is no result and not detecting
  if (!result && !isDetecting) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs px-2 h-7 gap-1"
          onClick={onRequestDetection}
        >
          <Info className="h-3.5 w-3.5" /> AI Detection
        </Button>
      </div>
    );
  }

  // Show loading state when detecting
  if (isDetecting) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></span>
        <span>Analyzing text...</span>
      </div>
    );
  }

  // Render result indicator based on AI detection result
  const getColorClass = () => {
    if (!result) return '';
    
    if (result.probability < 0.3) return 'bg-green-600';
    if (result.probability < 0.7) return 'bg-yellow-500';
    return 'bg-red-600';
  };

  const getIcon = () => {
    if (!result) return null;
    
    if (result.probability < 0.3) {
      return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
    }
    if (result.probability < 0.7) {
      return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
    }
    return <AlertCircle className="h-3.5 w-3.5 text-red-600" />;
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {getIcon()}
          <span>{result?.humanLikelihood}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                <p><strong>AI Probability:</strong> {(result?.probability * 100).toFixed(1)}%</p>
                <p><strong>Burstiness:</strong> {result?.burstiness.toFixed(2)} 
                  (Higher values typically indicate more human-like writing)</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Powered by GPTZero</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge 
          variant={result?.isAIGenerated ? "destructive" : "outline"} 
          className="text-[10px] px-1.5 py-0 h-4"
        >
          {result?.isAIGenerated ? "AI Generated" : "Likely Human"}
        </Badge>
      </div>
      <Progress value={result?.probability ? result.probability * 100 : 0} className="h-1.5" indicatorClassName={getColorClass()} />
    </div>
  );
}