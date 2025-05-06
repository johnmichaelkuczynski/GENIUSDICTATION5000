import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface AIDetectionResult {
  isAIGenerated: boolean;
  probability: number;
  burstiness: number;
  humanLikelihood: string;
  rawResponse?: any;
}

export function useAIDetection() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<AIDetectionResult | null>(null);
  const { toast } = useToast();

  const detectAI = useCallback(async (text: string): Promise<AIDetectionResult | null> => {
    if (!text || text.trim().length < 50) {
      toast({
        title: "Not enough text",
        description: "Please provide at least 50 characters of text for AI detection.",
        variant: "destructive"
      });
      return null;
    }

    setIsDetecting(true);
    setDetectionResult(null);

    try {
      const result = await apiRequest<AIDetectionResult>("/api/detect-ai", {
        method: "POST",
        body: { text }
      });

      setDetectionResult(result);
      return result;
    } catch (error) {
      console.error("Error detecting AI content:", error);
      
      toast({
        title: "AI Detection Failed",
        description: error instanceof Error ? error.message : "Failed to detect AI content",
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, [toast]);

  const clearDetectionResult = useCallback(() => {
    setDetectionResult(null);
  }, []);

  return {
    detectAI,
    clearDetectionResult,
    isDetecting,
    detectionResult
  };
}