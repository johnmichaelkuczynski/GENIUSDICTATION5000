import { useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { AIModel } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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

  // Get active style references
  const getActiveStyleReferences = useCallback(() => {
    return styleReferences.filter(style => style.active);
  }, [styleReferences]);

  // Transform text using AI
  const transformText = useCallback(async () => {
    if (!originalText) return;

    try {
      setIsProcessing(true);

      // Check if we've selected a model that requires specific API keys
      const isClaudeModel = selectedAIModel.includes('Claude');
      const isPerplexityModel = selectedAIModel.includes('Perplexity');
      
      // Prepare transformation payload
      const payload = {
        text: originalText,
        instructions: customInstructions,
        model: selectedAIModel,
        preset: selectedPreset,
        useStyleReference,
        styleReferences: useStyleReference ? getActiveStyleReferences() : []
      };

      // Send to API for transformation
      const response = await apiRequest("POST", "/api/transform", payload);
      const data = await response.json();

      // Update processed text
      setProcessedText(data.text);
    } catch (error) {
      console.error("Error transforming text:", error);
      
      // Provide more helpful error messages
      let errorMessage = "Error transforming text: ";
      
      if (error instanceof Error) {
        const message = error.message;
        
        if (message.includes("Anthropic API key is not configured") || 
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
      setIsProcessing(false);
    }
  }, [
    originalText,
    customInstructions,
    selectedAIModel,
    useStyleReference,
    styleReferences,
    selectedPreset
  ]);

  return {
    transformText
  };
}
