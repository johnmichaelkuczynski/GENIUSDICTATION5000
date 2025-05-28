import { useCallback, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { AIModel } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { transformText as transformTextApi } from "@/lib/textTransformation";
import { useToast } from "@/hooks/use-toast";

export function useTransformationEnhanced() {
  const {
    originalText,
    setOriginalText,
    processedText,
    setProcessedText,
    customInstructions,
    setCustomInstructions,
    useStyleReference,
    useContentReference,
    selectedAIModel,
    styleReferences,
    contentReferences,
    setIsProcessing,
    selectedPreset,
    setSelectedPreset
  } = useAppContext();
  
  const { toast } = useToast();
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isChunkedProcessing, setIsChunkedProcessing] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Get active style references
  const getActiveStyleReferences = useCallback(() => {
    return styleReferences.filter(style => style.active);
  }, [styleReferences]);
  
  // Get active content references
  const getActiveContentReferences = useCallback(() => {
    return contentReferences.filter(content => content.active);
  }, [contentReferences]);

  // Cancel the ongoing transformation
  const cancelTransformation = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      
      toast({
        title: "Transformation Cancelled",
        description: "The text transformation process has been cancelled."
      });
      
      setIsProcessing(false);
      setIsChunkedProcessing(false);
      setProcessingProgress(0);
      setProcessedText("Transformation cancelled by user.");
    }
  }, [abortController, toast, setProcessedText, setIsProcessing]);

  // Clear all inputs and outputs
  const clearAll = useCallback(() => {
    setProcessedText("");
    setCustomInstructions("");
    setOriginalText("");
    setSelectedPreset("Academic");
    
    toast({
      title: "All Cleared",
      description: "All inputs and outputs have been cleared."
    });
  }, [setProcessedText, setCustomInstructions, setOriginalText, setSelectedPreset, toast]);

  // Transform text using AI, with real-time chunk streaming
  const transformText = useCallback(async () => {
    if (!originalText) return;
    
    // Reset progress
    setProcessingProgress(0);
    setProcessedText("");

    // Create a new AbortController
    const controller = new AbortController();
    setAbortController(controller);

    try {
      setIsProcessing(true);
      
      // Prepare transformation payload
      const options = {
        text: originalText,
        instructions: customInstructions,
        model: selectedAIModel,
        preset: selectedPreset,
        useStyleReference,
        styleReferences: useStyleReference ? getActiveStyleReferences() : [],
        useContentReference,
        contentReferences: useContentReference ? getActiveContentReferences() : [],
        signal: controller.signal,
      };

      // For large documents, show a toast notification
      const isLargeDocument = originalText.length > 8000;
      if (isLargeDocument) {
        setIsChunkedProcessing(true);
        toast({
          title: "Processing Large Document",
          description: "Your document is being split into chunks for processing. Processed chunks will appear immediately.",
          duration: 5000,
        });
        
        // Set initial content to show progress
        setProcessedText("Processing document in chunks... (0% complete)");
      } else {
        setIsChunkedProcessing(false);
      }
      
      // Enhanced progress callback that streams processed chunks in real-time
      const progressCallback = (current: number, total: number, processedSoFar?: string) => {
        const percentage = Math.round((current / total) * 100);
        setProcessingProgress(percentage);
        
        // CRITICAL: Show processed chunks immediately as they complete
        if (processedSoFar && processedSoFar.trim()) {
          setProcessedText(processedSoFar);
        } else {
          setProcessedText(`Processing chunk ${current} of ${total}... (${percentage}% complete)`);
        }
      };
      
      // Call the API with enhanced progress tracking
      const result = await transformTextApi({
        ...options,
        onProgress: progressCallback,
      });
      
      // Ensure final result is displayed
      if (result && result.trim()) {
        setProcessedText(result);
      }
      
    } catch (error) {
      console.error("Error transforming text:", error);
      
      // Provide helpful error messages
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
      setIsChunkedProcessing(false);
      setIsProcessing(false);
      setAbortController(null);
    }
  }, [
    originalText,
    customInstructions,
    selectedAIModel,
    useStyleReference,
    styleReferences,
    useContentReference,
    contentReferences,
    selectedPreset,
    toast,
    setIsProcessing,
    setProcessedText
  ]);

  // Transform already processed text with real-time streaming
  const transformProcessedText = useCallback(async (text: string) => {
    if (!text) return;
    
    // Reset progress
    setProcessingProgress(0);
    
    // Create a new AbortController
    const controller = new AbortController();
    setAbortController(controller);

    try {
      setIsProcessing(true);
      
      // Prepare transformation payload using the processed text as input
      const options = {
        text: text,
        instructions: customInstructions,
        model: selectedAIModel,
        preset: selectedPreset,
        useStyleReference,
        styleReferences: useStyleReference ? getActiveStyleReferences() : [],
        useContentReference,
        contentReferences: useContentReference ? getActiveContentReferences() : [],
        signal: controller.signal,
      };

      // For large documents, show a toast notification
      const isLargeDocument = text.length > 8000;
      if (isLargeDocument) {
        setIsChunkedProcessing(true);
        toast({
          title: "Processing Large Document",
          description: "Your document is being split into chunks for processing. Processed chunks will appear immediately.",
          duration: 5000,
        });
        
        // Set initial content to show progress
        setProcessedText("Processing document in chunks... (0% complete)");
      } else {
        setIsChunkedProcessing(false);
      }
      
      // Enhanced progress callback that streams processed chunks in real-time
      const progressCallback = (current: number, total: number, processedSoFar?: string) => {
        const percentage = Math.round((current / total) * 100);
        setProcessingProgress(percentage);
        
        // CRITICAL: Show processed chunks immediately as they complete
        if (processedSoFar && processedSoFar.trim()) {
          setProcessedText(processedSoFar);
        } else {
          setProcessedText(`Processing chunk ${current} of ${total}... (${percentage}% complete)`);
        }
      };
      
      // Call the API with enhanced progress tracking
      const result = await transformTextApi({
        ...options,
        onProgress: progressCallback,
      });
      
      // Ensure final result is displayed
      if (result && result.trim()) {
        setProcessedText(result);
      }
      
    } catch (error) {
      console.error("Error transforming text:", error);
      
      // Provide helpful error messages
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
      setIsChunkedProcessing(false);
      setIsProcessing(false);
      setAbortController(null);
    }
  }, [
    customInstructions,
    selectedAIModel,
    useStyleReference,
    styleReferences,
    useContentReference,
    contentReferences,
    selectedPreset,
    toast,
    setIsProcessing,
    setProcessedText
  ]);

  // Use processed text as new input text
  const useProcessedAsInput = useCallback(() => {
    if (!processedText) return;
    
    setOriginalText(processedText);
    setProcessedText('');
    
    toast({
      title: "Text Moved",
      description: "The processed text has been moved to the input area for further editing.",
      duration: 3000,
    });
  }, [processedText, setOriginalText, setProcessedText, toast]);

  return {
    transformText,
    transformProcessedText,
    useProcessedAsInput,
    cancelTransformation,
    clearAll,
    processingProgress,
    isChunkedProcessing,
    isProcessing: abortController !== null
  };
}