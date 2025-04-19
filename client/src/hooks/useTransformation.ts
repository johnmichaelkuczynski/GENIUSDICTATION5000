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
      setProcessedText(`Error transforming text: ${error instanceof Error ? error.message : String(error)}`);
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
