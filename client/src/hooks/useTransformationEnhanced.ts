import { useCallback, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { AIModel } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { transformText as transformTextApi } from "@/lib/textTransformationEnhanced";
import { useToast } from "@/hooks/use-toast";
import { removeMarkdownFormatting } from "@/lib/textCleaner";

export function useTransformation() {
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
    setSelectedPreset("Academic"); // Reset to default preset
    
    toast({
      title: "All Cleared",
      description: "All inputs and outputs have been cleared."
    });
  }, [setProcessedText, setCustomInstructions, setOriginalText, setSelectedPreset, toast]);

  // Transform text using AI, with support for chunking large documents
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
          description: "Your document is being split into chunks for processing. You'll see each chunk as it's completed.",
          duration: 5000,
        });
        
        // Set initial content to show progress
        setProcessedText("Processing document in chunks... (0% complete)");
      } else {
        setIsChunkedProcessing(false);
      }
      
      // Use the enhanced chunking implementation with real-time display
      try {
        // Handle progress updates from the chunking process with real-time display
        const progressCallback = (current: number, total: number, partialText?: string) => {
          const percentage = Math.round((current / total) * 100);
          setProcessingProgress(percentage);
          
          // If we have partial text, show it immediately
          if (partialText) {
            // Clean any markdown formatting from the text
            let cleanedText = partialText;
            cleanedText = cleanedText.replace(/\*\*/g, ''); // Remove bold
            cleanedText = cleanedText.replace(/\*/g, '');    // Remove italic
            cleanedText = cleanedText.replace(/#{1,6}\s/g, ''); // Remove headings
            cleanedText = cleanedText.replace(/`{1,3}/g, '');   // Remove code blocks
            
            // Update the processed text with what we have so far
            setProcessedText(cleanedText);
          } else {
            setProcessedText(`Processing document in chunks... (${percentage}% complete)`);
          }
        };
        
        // Call the API with progress tracking for large documents
        const result = await transformTextApi({
          ...options,
          onProgress: progressCallback,
        });
        
        // Final clean-up of any markdown formatting from the complete result
        let cleanedResult = result;
        cleanedResult = cleanedResult.replace(/\*\*/g, ''); // Remove bold
        cleanedResult = cleanedResult.replace(/\*/g, '');    // Remove italic
        cleanedResult = cleanedResult.replace(/#{1,6}\s/g, ''); // Remove headings
        cleanedResult = cleanedResult.replace(/`{1,3}/g, '');   // Remove code blocks
        
        // Update with the final result only if we weren't aborted
        if (abortController !== null) {
          setProcessedText(cleanedResult);
        }
      } catch (error: any) {
        // Check if this was an abort error
        if (error && error.name === 'AbortError') {
          console.log('Transformation was aborted');
          return;
        }
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
      setIsChunkedProcessing(false);
      setIsProcessing(false);
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
    toast
  ]);

  // Function to transform already processed text (enabling recursive transformations)
  const transformProcessedText = useCallback(async (text: string) => {
    if (!text) return;
    
    // Reset progress
    setProcessingProgress(0);
    
    // Create a new AbortController
    const controller = new AbortController();
    setAbortController(controller);

    try {
      setIsProcessing(true);
      
      // Check if we've selected a model that requires specific API keys
      const isClaudeModel = selectedAIModel.includes('Claude');
      const isPerplexityModel = selectedAIModel.includes('Perplexity');
      
      // Prepare transformation payload using the processed text as input
      const options = {
        text: text, // Use the processed text as the input
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
          description: "Your document is being split into chunks for processing. You'll see each chunk as it's completed.",
          duration: 5000,
        });
        
        // Set initial content to show progress
        setProcessedText("Processing document in chunks... (0% complete)");
      } else {
        setIsChunkedProcessing(false);
      }
      
      // Use the enhanced chunking implementation with real-time display
      try {
        // Handle progress updates from the chunking process with real-time display
        const progressCallback = (current: number, total: number, partialText?: string) => {
          const percentage = Math.round((current / total) * 100);
          setProcessingProgress(percentage);
          
          // If we have partial text, show it immediately
          if (partialText) {
            // Clean any markdown formatting from the text
            let cleanedText = partialText;
            cleanedText = cleanedText.replace(/\*\*/g, ''); // Remove bold
            cleanedText = cleanedText.replace(/\*/g, '');    // Remove italic
            cleanedText = cleanedText.replace(/#{1,6}\s/g, ''); // Remove headings
            cleanedText = cleanedText.replace(/`{1,3}/g, '');   // Remove code blocks
            
            // Update the processed text with what we have so far
            setProcessedText(cleanedText);
          } else {
            setProcessedText(`Processing document in chunks... (${percentage}% complete)`);
          }
        };
        
        // Call the API with progress tracking for large documents
        const result = await transformTextApi({
          ...options,
          onProgress: progressCallback,
        });
        
        // Final clean-up of any markdown formatting from the complete result
        let cleanedResult = result;
        cleanedResult = cleanedResult.replace(/\*\*/g, ''); // Remove bold
        cleanedResult = cleanedResult.replace(/\*/g, '');    // Remove italic
        cleanedResult = cleanedResult.replace(/#{1,6}\s/g, ''); // Remove headings
        cleanedResult = cleanedResult.replace(/`{1,3}/g, '');   // Remove code blocks
        
        // Update with the final result only if we weren't aborted
        if (abortController !== null) {
          setProcessedText(cleanedResult);
        }
      } catch (error: any) {
        // Check if this was an abort error
        if (error && error.name === 'AbortError') {
          console.log('Transformation was aborted');
          return;
        }
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
      setIsChunkedProcessing(false);
      setIsProcessing(false);
    }
  }, [
    customInstructions,
    selectedAIModel,
    useStyleReference,
    styleReferences,
    useContentReference,
    contentReferences,
    selectedPreset,
    toast
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