import { useCallback, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { AIModel } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { transformText as transformTextApi } from "@/lib/textTransformation";
import { useToast } from "@/hooks/use-toast";

export function useTransformation() {
  const {
    originalText,
    setProcessedText,
    customInstructions,
    useStyleReference,
    selectedAIModel,
    styleReferences,
    setIsProcessing,
    selectedPreset
  } = useAppContext();
  
  const { toast } = useToast();
  const [processingProgress, setProcessingProgress] = useState(0);

  // Get active style references
  const getActiveStyleReferences = useCallback(() => {
    return styleReferences.filter(style => style.active);
  }, [styleReferences]);

  // Transform text using AI, with support for chunking large documents
  const transformText = useCallback(async () => {
    if (!originalText) return;
    
    // Reset progress
    setProcessingProgress(0);
    setProcessedText("");

    try {
      setIsProcessing(true);
      
      // Check if we've selected a model that requires specific API keys
      const isClaudeModel = selectedAIModel.includes('Claude');
      const isPerplexityModel = selectedAIModel.includes('Perplexity');
      
      // Prepare transformation payload
      const options = {
        text: originalText,
        instructions: customInstructions,
        model: selectedAIModel,
        preset: selectedPreset,
        useStyleReference,
        styleReferences: useStyleReference ? getActiveStyleReferences() : []
      };

      // For large documents, show a toast notification
      const isLargeDocument = originalText.length > 8000;
      if (isLargeDocument) {
        toast({
          title: "Processing Large Document",
          description: "Your document is being split into chunks for processing. This might take some time.",
          duration: 5000,
        });
        
        // Set initial content to show progress
        setProcessedText("Processing document in chunks... (0% complete)");
      }
      
      // Use the chunking implementation in textTransformation.ts
      let result;
      
      try {
        // Handle progress updates from the chunking process
        const progressCallback = (current: number, total: number) => {
          const percentage = Math.round((current / total) * 100);
          setProcessingProgress(percentage);
          setProcessedText(`Processing document in chunks... (${percentage}% complete)`);
        };
        
        // Call the API with progress tracking for large documents
        result = await transformTextApi({
          ...options,
          onProgress: progressCallback,
        });
        
        // Update the result
        setProcessedText(result);
      } catch (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error transforming text:", error);
      
      // Provide more helpful error messages
      let errorMessage = "Error transforming text: ";
      
      if (error instanceof Error) {
        const message = error.message;
        
        if (message.includes("413") || message.includes("request entity too large")) {
          errorMessage = "The document is too large to process in one request. It has been automatically divided into smaller chunks for processing.";
        } else if (message.includes("Anthropic API key is not configured") || 
            (selectedAIModel.includes('Claude') && message.includes("Failed to transform text"))) {
          errorMessage += "Anthropic API key is required for Claude models. Please add it in Settings.";
        } else if (message.includes("Perplexity API key is not configured") || 
                  (selectedAIModel.includes('Perplexity') && message.includes("Failed to transform text"))) {
          errorMessage += "Perplexity API key is required for Llama models. Please add it in Settings.";
        } else if (message.includes("OpenAI API key is not configured") || 
                  (selectedAIModel.includes('GPT') && message.includes("Failed to transform text"))) {
          errorMessage += "OpenAI API key is required for GPT models. Please add it in Settings.";
        } else {
          errorMessage += message;
        }
      } else {
        errorMessage += String(error);
      }
      
      setProcessedText(errorMessage);
    } finally {
      setProcessingProgress(0);
      setIsProcessing(false);
    }
  }, [
    originalText,
    customInstructions,
    selectedAIModel,
    useStyleReference,
    styleReferences,
    selectedPreset,
    toast
  ]);

  return {
    transformText
  };
}
