import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface AIDetectionResult {
  isAIGenerated: boolean;
  probability: number;
  burstiness: number;
  humanLikelihood: string;
  assessment?: string;
  rawResponse?: any;
}

export function useAIDetection() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<AIDetectionResult | null>(null);
  const { toast } = useToast();

  const detectAI = useCallback(async (text: string, provider = 'openai'): Promise<AIDetectionResult | null> => {
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
      const response = await fetch("/api/detect-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text, provider })
      });
      
      if (!response.ok) {
        throw new Error(`GPTZero API error: ${response.status} ${response.statusText}`);
      }
      
      const detectionResult = await response.json() as AIDetectionResult;
      setDetectionResult(detectionResult);
      return detectionResult;
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